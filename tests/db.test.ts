import { test, before } from "node:test";
import assert from "node:assert/strict";
import type { PGlite } from "@electric-sql/pglite";
import { ADMIN, INACTIVO, VENTAS, as, asCommit, newDb, seedUsers } from "./helpers/db.ts";

let db: PGlite;
const svc = { role: "service_role" } as const;

async function ingest(p: Record<string, unknown>) {
  const r = await db.query<{ r: Record<string, unknown> }>("select public.ingest_lead($1::jsonb) as r", [JSON.stringify(p)]);
  return r.rows[0].r;
}

async function rejects(fn: () => Promise<unknown>, pattern: RegExp) {
  await assert.rejects(fn, (e: Error) => pattern.test(e.message), `se esperaba error ${pattern}`);
}

before(async () => {
  db = await newDb();
  await seedUsers(db);
});

test("ingest_lead: crea el lead, la tarea, el evento y asigna por turnos", async () => {
  const a = await asCommit(db, svc, () =>
    ingest({ source: "meta_form", external_id: "m-1", nombre: "Ana", email: "Ana@Test.es", telefono: "+34600000001",
      campaign: "Camp 1", adset: "Set 1", ad: "AD01", utm_source: "facebook" }));
  const b = await asCommit(db, svc, () => ingest({ source: "meta_form", external_id: "m-2", nombre: "Beto", telefono: "+34600000002" }));
  const c = await asCommit(db, svc, () => ingest({ source: "meta_form", external_id: "m-3", nombre: "Cira", email: "cira@test.es" }));
  assert.equal(a.created, true);
  // Sin asignaciones previas, el más antiguo (admin) va primero; el usuario inactivo nunca recibe leads.
  assert.equal(a.owner_id, ADMIN);
  assert.equal(b.owner_id, VENTAS);
  assert.equal(c.owner_id, ADMIN);

  const lead = (await db.query<{ email: string; etapa: string; ad: string; campaign: string }>(
    `select l.email, l.etapa, ads.name as ad, c.name as campaign from leads l
       join ads on ads.id = l.ad_id join campaigns c on c.id = l.campaign_id where l.id = $1`, [a.lead_id])).rows[0];
  assert.equal(lead.email, "ana@test.es");
  assert.equal(lead.etapa, "nuevo");
  assert.equal(lead.ad, "AD01");
  const tareas = await db.query("select 1 from tasks where lead_id = $1 and done_at is null", [a.lead_id]);
  assert.equal(tareas.rows.length, 1);
  const hist = await db.query("select 1 from lead_stage_history where lead_id = $1 and etapa = 'nuevo'", [a.lead_id]);
  assert.equal(hist.rows.length, 1);
});

test("ingest_lead: es idempotente por id externo y detecta duplicados por teléfono o email", async () => {
  const again = await asCommit(db, svc, () => ingest({ source: "meta_form", external_id: "m-1", nombre: "Ana", email: "ana@test.es" }));
  assert.equal(again.created, false);
  assert.equal(again.reason, "external_id");

  const dupTel = await asCommit(db, svc, () => ingest({ source: "landing", nombre: "Otro", telefono: "+34600000002" }));
  assert.equal(dupTel.duplicate, true);
  const dupMail = await asCommit(db, svc, () => ingest({ source: "landing", nombre: "Otro", email: "CIRA@test.es" }));
  assert.equal(dupMail.duplicate, true);
  const ev = await db.query("select 1 from lead_events where lead_id = $1 and tipo = 'reingreso'", [dupTel.lead_id]);
  assert.equal(ev.rows.length, 1);
  const total = await db.query<{ n: number }>("select count(*)::int as n from leads");
  assert.equal(total.rows[0].n, 3);
});

test("ingest_lead: rechaza leads sin email ni teléfono", async () => {
  await rejects(() => asCommit(db, svc, () => ingest({ source: "landing", nombre: "Nadie" })), /sin email ni teléfono/);
});

test("un lead perdido exige motivo; el cambio de fase queda en historial y fija la fecha de cierre", async () => {
  const id = (await db.query<{ id: string }>("select id from leads where external_id = 'm-1'")).rows[0].id;
  await rejects(() => asCommit(db, { role: "authenticated", uid: VENTAS }, () =>
    db.query("update leads set etapa = 'perdido' where id = $1", [id])), /leads_perdido_requiere_motivo/);

  await asCommit(db, { role: "authenticated", uid: VENTAS }, () =>
    db.query("update leads set etapa = 'perdido', motivo_perdida = 'precio' where id = $1", [id]));
  const l = (await db.query<{ closed_at: string | null }>("select closed_at from leads where id = $1", [id])).rows[0];
  assert.ok(l.closed_at, "closed_at debería fijarse");
  const ev = await db.query("select detalle from lead_events where lead_id = $1 and tipo = 'cambio_etapa'", [id]);
  assert.equal(ev.rows.length, 1);
  const h = await db.query("select 1 from lead_stage_history where lead_id = $1 and etapa = 'perdido'", [id]);
  assert.equal(h.rows.length, 1);
});

test("una llamada registra el primer contacto y cuenta intentos; una llamada sin respuesta no lo fija", async () => {
  const id = (await db.query<{ id: string }>("select id from leads where external_id = 'm-2'")).rows[0].id;
  await asCommit(db, { role: "authenticated", uid: VENTAS }, () =>
    db.query("insert into lead_events (lead_id, author_id, tipo, contacto_efectivo) values ($1, $2, 'llamada', false)", [id, VENTAS]));
  let l = (await db.query<{ first_contact_at: string | null; contact_attempts: number }>(
    "select first_contact_at, contact_attempts from leads where id = $1", [id])).rows[0];
  assert.equal(l.contact_attempts, 1);
  assert.equal(l.first_contact_at, null);
  await asCommit(db, { role: "authenticated", uid: VENTAS }, () =>
    db.query("insert into lead_events (lead_id, author_id, tipo, contacto_efectivo) values ($1, $2, 'llamada', true)", [id, VENTAS]));
  l = (await db.query<{ first_contact_at: string | null; contact_attempts: number }>(
    "select first_contact_at, contact_attempts from leads where id = $1", [id])).rows[0];
  assert.equal(l.contact_attempts, 2);
  assert.ok(l.first_contact_at);
});

// ── Seguridad ─────────────────────────────────────────────────────────────────
test("RLS: anon no ve nada y no puede llamar a ingest_lead", async () => {
  await rejects(() => as(db, { role: "anon" }, () => db.query("select * from leads")), /permission denied/);
  await rejects(() => as(db, { role: "anon" }, () => ingest({ nombre: "x", email: "x@x.es" })), /permission denied/);
});

test("RLS: un usuario autenticado no puede ejecutar ingest_lead (solo el servidor)", async () => {
  await rejects(() => as(db, { role: "authenticated", uid: ADMIN }, () => ingest({ nombre: "x", email: "x@x.es" })), /permission denied/);
});

test("RLS: un usuario inactivo no ve leads", async () => {
  const r = await as(db, { role: "authenticated", uid: INACTIVO }, () => db.query("select id from leads"));
  assert.equal(r.rows.length, 0);
});

test("RLS: el equipo activo ve todos los leads", async () => {
  const r = await as(db, { role: "authenticated", uid: VENTAS }, () => db.query("select id from leads"));
  assert.equal(r.rows.length, 3);
});

test("RLS: no se puede falsificar el autor de un evento", async () => {
  const id = (await db.query<{ id: string }>("select id from leads limit 1")).rows[0].id;
  await rejects(() => as(db, { role: "authenticated", uid: VENTAS }, () =>
    db.query("insert into lead_events (lead_id, author_id, tipo) values ($1, $2, 'nota')", [id, ADMIN])), /row-level security/);
});

test("RLS: los eventos son de solo lectura e inserción (sin update ni delete)", async () => {
  await rejects(() => as(db, { role: "authenticated", uid: ADMIN }, () =>
    db.query("update lead_events set detalle = 'x'")), /permission denied/);
  await rejects(() => as(db, { role: "authenticated", uid: ADMIN }, () =>
    db.query("delete from lead_events")), /permission denied/);
});

test("RLS: solo un administrador borra leads", async () => {
  const id = (await db.query<{ id: string }>("select id from leads limit 1")).rows[0].id;
  const v = await as(db, { role: "authenticated", uid: VENTAS }, () => db.query("delete from leads where id = $1 returning id", [id]));
  assert.equal(v.rows.length, 0);
  const a = await as(db, { role: "authenticated", uid: ADMIN }, () => db.query("delete from leads where id = $1 returning id", [id]));
  assert.equal(a.rows.length, 1);
});

test("RLS: un vendedor no puede subirse el rol ni tocar los ajustes o el gasto", async () => {
  await rejects(() => as(db, { role: "authenticated", uid: VENTAS }, () =>
    db.query("update profiles set role = 'admin' where id = $1", [VENTAS])), /row-level security/);
  await rejects(() => as(db, { role: "authenticated", uid: VENTAS }, () =>
    db.query("update profiles set active = false where id = $1", [ADMIN])).then((r) => {
      if (r.rows.length === 0) throw new Error("row-level security: sin filas afectadas");
      return r;
    }), /row-level security/);
  const set = await as(db, { role: "authenticated", uid: VENTAS }, () =>
    db.query("update app_settings set value = '{}'::jsonb returning key"));
  assert.equal(set.rows.length, 0);
  await rejects(() => as(db, { role: "authenticated", uid: VENTAS }, () =>
    db.query("insert into ad_spend (day, platform, spend) values (current_date, 'meta', 10)")), /row-level security/);
  const ok = await as(db, { role: "authenticated", uid: ADMIN }, () =>
    db.query("insert into ad_spend (day, platform, spend) values (current_date, 'meta', 10) returning id"));
  assert.equal(ok.rows.length, 1);
});

test("RLS: un vendedor puede cambiar su propio nombre pero no el de otro", async () => {
  const mine = await as(db, { role: "authenticated", uid: VENTAS }, () =>
    db.query("update profiles set full_name = 'Nuevo nombre' where id = $1 returning id", [VENTAS]));
  assert.equal(mine.rows.length, 1);
  const other = await as(db, { role: "authenticated", uid: VENTAS }, () =>
    db.query("update profiles set full_name = 'Hack' where id = $1 returning id", [ADMIN]));
  assert.equal(other.rows.length, 0);
});

test("alta de usuario: el primero es admin, los siguientes ventas, con nombre por defecto y sin duplicar perfiles", async () => {
  const fresh = await newDb();
  await fresh.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('10000000-0000-4000-8000-000000000001', 'primero@x.es', '{"full_name":"Primera Persona"}'),
      ('10000000-0000-4000-8000-000000000002', 'segundo@x.es', null);
  `);
  const r = (await fresh.query<{ email: string; role: string; full_name: string }>("select email, role, full_name from profiles order by created_at, email")).rows;
  assert.deepEqual(r.map((x) => [x.email, x.role, x.full_name]), [
    ["primero@x.es", "admin", "Primera Persona"],
    ["segundo@x.es", "ventas", "segundo"],
  ]);
});
