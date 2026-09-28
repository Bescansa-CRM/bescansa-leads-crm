import { test, before } from "node:test";
import assert from "node:assert/strict";
import type { PGlite } from "@electric-sql/pglite";
import { ADMIN, VENTAS, as, asCommit, newDb, seedUsers } from "./helpers/db.ts";

let db: PGlite;
const svc = { role: "service_role" } as const;
const BATCH = "11111111-1111-4111-8111-111111111111";

const items = [
  { source: "import_pipefy", externalId: "p-1", createdAt: "2026-06-01T10:00:00Z", nombre: "Ana", apellidos: "Pérez",
    email: "ana@x.es", telefono: "+34600000001", etapa: "ganado", prioridad: "normal", interes: "casa_modular",
    etapaProyecto: "solicita_informacion", terreno: "propio", motivoPerdida: null,
    campaign: "CASAS | LEAD NATIVO", adset: "ARQ | FEED", ad: "AD01 - CASAS", tags: ["Casa Modular"],
    stageHistory: [{ etapa: "nuevo", enteredAt: "2026-06-01T10:00:00Z" }, { etapa: "contactado", enteredAt: "2026-06-02T09:00:00Z" },
      { etapa: "ganado", enteredAt: "2026-06-20T12:00:00Z" }],
    notes: [{ at: "2026-06-02T09:30:00Z", text: "Llamada: interesado" }], mergedFrom: ["p-1", "m-1"], raw: { pipefy_id: "p-1" } },
  { source: "import_pipefy", externalId: "p-2", createdAt: "2026-07-01T10:00:00Z", nombre: "Beto", apellidos: null,
    email: null, telefono: "+34600000002", etapa: "perdido", prioridad: "baja", interes: null, etapaProyecto: null, terreno: null,
    motivoPerdida: "sin_respuesta", campaign: "CASAS | LEAD NATIVO", adset: "ARQ | FEED", ad: "AD01 - CASAS", tags: [],
    stageHistory: [{ etapa: "nuevo", enteredAt: "2026-07-01T10:00:00Z" }], notes: [], mergedFrom: ["p-2"], raw: {} },
  { source: "import_meta", externalId: "meta:1", createdAt: "2026-09-20T08:00:00Z", nombre: "Cira", apellidos: null,
    email: "cira@x.es", telefono: "+34600000003", etapa: "nuevo", prioridad: "alta", interes: null, etapaProyecto: null, terreno: null,
    motivoPerdida: null, campaign: null, adset: null, ad: null, tags: ["sin-contactar-agencia"],
    stageHistory: [{ etapa: "nuevo", enteredAt: "2026-09-20T08:00:00Z" }], notes: [], mergedFrom: ["meta:1"], raw: {} },
  { source: "import_meta", externalId: "meta:2", createdAt: "2026-09-21T08:00:00Z", nombre: "Dani", apellidos: null,
    email: "dani@x.es", telefono: null, etapa: "nuevo", prioridad: "alta", interes: null, etapaProyecto: null, terreno: null,
    motivoPerdida: null, campaign: null, adset: null, ad: null, tags: ["sin-contactar-agencia"],
    stageHistory: [{ etapa: "nuevo", enteredAt: "2026-09-21T08:00:00Z" }], notes: [], mergedFrom: ["meta:2"], raw: {} },
];

before(async () => {
  db = await newDb();
  await seedUsers(db);
});

async function run() {
  const r = await db.query<{ r: { created: number; skipped: number } }>("select public.import_leads($1, $2::jsonb) as r", [BATCH, JSON.stringify(items)]);
  return r.rows[0].r;
}

test("import_leads: crea leads con su historial real, fechas de cierre, notas y catálogo publicitario", async () => {
  const r = await asCommit(db, svc, run);
  assert.deepEqual(r, { created: 4, skipped: 0 });

  const ana = (await db.query<{ id: string; created_at: string; closed_at: string; first_contact_at: string; nombre: string }>(
    "select id, created_at, closed_at, first_contact_at, nombre from leads where external_id = 'p-1'")).rows[0];
  assert.equal(new Date(ana.created_at).toISOString(), "2026-06-01T10:00:00.000Z");
  assert.equal(new Date(ana.closed_at).toISOString(), "2026-06-20T12:00:00.000Z");
  assert.equal(new Date(ana.first_contact_at).toISOString(), "2026-06-02T09:00:00.000Z");

  const hist = (await db.query<{ etapa: string; entered_at: string }>("select etapa, entered_at from lead_stage_history where lead_id = $1 order by entered_at", [ana.id])).rows;
  assert.deepEqual(hist.map((h) => h.etapa), ["nuevo", "contactado", "ganado"]);
  assert.equal(new Date(hist[2].entered_at).toISOString(), "2026-06-20T12:00:00.000Z");

  const notas = (await db.query("select 1 from lead_events where lead_id = $1 and tipo = 'nota'", [ana.id])).rows;
  assert.equal(notas.length, 1);
  const camp = (await db.query<{ n: number }>("select count(*)::int as n from campaigns")).rows[0].n;
  const ads = (await db.query<{ n: number }>("select count(*)::int as n from ads")).rows[0].n;
  assert.equal(camp, 1, "los dos leads con la misma campaña comparten registro");
  assert.equal(ads, 1);
  const perdido = (await db.query<{ motivo_perdida: string; closed_at: string }>("select motivo_perdida, closed_at from leads where external_id = 'p-2'")).rows[0];
  assert.equal(perdido.motivo_perdida, "sin_respuesta");
  assert.ok(perdido.closed_at);
});

test("import_leads: los leads sin atender reciben una tarea de contacto y los demás no", async () => {
  const t = (await db.query<{ external_id: string }>(
    "select l.external_id from tasks t join leads l on l.id = t.lead_id order by l.external_id")).rows.map((r) => r.external_id);
  assert.deepEqual(t, ["meta:1", "meta:2"]);
});

test("import_leads: es idempotente (repetir el lote no duplica nada)", async () => {
  const r = await asCommit(db, svc, run);
  assert.deepEqual(r, { created: 0, skipped: 4 });
  const n = (await db.query<{ n: number }>("select count(*)::int as n from leads")).rows[0].n;
  assert.equal(n, 4);
});

test("import_leads: solo el servidor puede importar", async () => {
  await assert.rejects(() => as(db, { role: "authenticated", uid: ADMIN }, run), /permission denied/);
});

test("distribute_unassigned: reparte por turnos, con sus tareas, y solo lo pide un administrador", async () => {
  await assert.rejects(() => as(db, { role: "authenticated", uid: VENTAS }, () =>
    db.query("select public.distribute_unassigned('sin-contactar-agencia')")), /solo un administrador/);

  const n = await asCommit(db, { role: "authenticated", uid: ADMIN }, async () =>
    (await db.query<{ distribute_unassigned: number }>("select public.distribute_unassigned('sin-contactar-agencia')")).rows[0].distribute_unassigned);
  assert.equal(n, 2);

  const owners = (await db.query<{ external_id: string; owner_id: string }>(
    "select external_id, owner_id from leads where 'sin-contactar-agencia' = any (tags) order by created_at desc")).rows;
  assert.equal(owners.length, 2);
  assert.notEqual(owners[0].owner_id, owners[1].owner_id, "cada lead va a una persona distinta");
  assert.ok(owners.every((o) => o.owner_id === ADMIN || o.owner_id === VENTAS), "el usuario inactivo no recibe leads");
  const tareasSinDueño = (await db.query("select 1 from tasks where done_at is null and owner_id is null")).rows.length;
  assert.equal(tareasSinDueño, 0);
});
