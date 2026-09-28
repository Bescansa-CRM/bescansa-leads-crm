import { test, before } from "node:test";
import assert from "node:assert/strict";
import type { PGlite } from "@electric-sql/pglite";
import { ALERTAS_POR_DEFECTO, HORARIO_POR_DEFECTO, isBusinessHours, runDailyDigest, runSlaCheck, type SlaDeps, type SlaRow } from "../src/lib/sla.ts";
import { ADMIN, asCommit, newDb, seedUsers } from "./helpers/db.ts";

// 2026-09-28 es lunes. En septiembre Madrid está en horario de verano (UTC+2).
const lunes10 = new Date("2026-09-28T08:00:00Z");   // 10:00 en Madrid
const lunes20 = new Date("2026-09-28T18:30:00Z");   // 20:30 en Madrid
const sabado11 = new Date("2026-10-03T09:00:00Z");  // sábado 11:00
const lunes9en = new Date("2026-09-28T07:00:00Z");  // 09:00 en punto
const lunes19 = new Date("2026-09-28T17:00:00Z");   // 19:00 en punto

test("horario laboral: días y horas en la zona de Madrid (límites: desde incluido, hasta excluido)", () => {
  assert.equal(isBusinessHours(lunes10), true);
  assert.equal(isBusinessHours(lunes20), false);
  assert.equal(isBusinessHours(sabado11), false);
  assert.equal(isBusinessHours(lunes9en), true);
  assert.equal(isBusinessHours(lunes19), false);
  assert.equal(isBusinessHours(sabado11, { ...HORARIO_POR_DEFECTO, dias: [1, 2, 3, 4, 5, 6] }), true);
});

function deps(rows: SlaRow[], over: Partial<SlaDeps> = {}) {
  const sent: { to: string; subject: string }[] = [];
  const logs: { tipo: string; to_email: string; ok: boolean }[] = [];
  const d: SlaDeps = {
    now: lunes10, appUrl: "https://crm.test", horario: HORARIO_POR_DEFECTO,
    alertas: { ...ALERTAS_POR_DEFECTO, emails_admin: ["admin@x.es"] },
    pending: async () => rows,
    lead: async (id) => ({ id, nombre: "Ana", telefono: "+34600000001" }),
    send: async (m) => { sent.push({ to: m.to, subject: m.subject }); return { ok: true }; },
    log: async (e) => { logs.push({ tipo: e.tipo, to_email: e.to_email, ok: e.ok }); },
    ...over,
  };
  return { d, sent, logs };
}

test("SLA: recordatorio al responsable y escalado a administración, cada uno registrado", async () => {
  const { d, sent, logs } = deps([{ lead_id: "l1", age_minutes: 150, owner_id: "u1", owner_email: "lucia@x.es", send_reminder: true, send_escalation: true }]);
  const r = await runSlaCheck(d);
  assert.deepEqual(r, { recordatorios: 1, escalados: 1, errores: 0 });
  assert.deepEqual(sent.map((s) => s.to), ["lucia@x.es", "admin@x.es"]);
  assert.deepEqual(logs.map((l) => l.tipo), ["sla_recordatorio", "sla_escalado"]);
});

test("SLA: solo recordatorio si aún no toca escalar; nada si ya se avisó", async () => {
  const a = deps([{ lead_id: "l1", age_minutes: 45, owner_id: "u1", owner_email: "lucia@x.es", send_reminder: true, send_escalation: false }]);
  assert.deepEqual(await runSlaCheck(a.d), { recordatorios: 1, escalados: 0, errores: 0 });
  const b = deps([]);
  assert.deepEqual(await runSlaCheck(b.d), { recordatorios: 0, escalados: 0, errores: 0 });
  assert.equal(b.sent.length, 0);
});

test("SLA: sin responsable, el aviso va a administración", async () => {
  const { d, sent } = deps([{ lead_id: "l1", age_minutes: 45, owner_id: null, owner_email: null, send_reminder: true, send_escalation: false }]);
  const r = await runSlaCheck(d);
  assert.equal(r.recordatorios, 1);
  assert.deepEqual(sent.map((s) => s.to), ["admin@x.es"]);
});

test("SLA: fuera del horario laboral no envía nada", async () => {
  const { d, sent } = deps([{ lead_id: "l1", age_minutes: 999, owner_id: "u1", owner_email: "lucia@x.es", send_reminder: true, send_escalation: true }], { now: lunes20 });
  const r = await runSlaCheck(d);
  assert.equal(r.skipped, "fuera de horario laboral");
  assert.equal(sent.length, 0);
});

test("SLA: si el correo falla se cuenta el error; si Resend no está configurado no cuenta como error", async () => {
  const fila: SlaRow = { lead_id: "l1", age_minutes: 45, owner_id: "u1", owner_email: "lucia@x.es", send_reminder: true, send_escalation: false };
  assert.deepEqual(await runSlaCheck(deps([fila], { send: async () => ({ ok: false, error: "boom" }) }).d), { recordatorios: 0, escalados: 0, errores: 1 });
  assert.deepEqual(await runSlaCheck(deps([fila], { send: async () => ({ ok: false, skipped: true }) }).d), { recordatorios: 0, escalados: 0, errores: 0 });
});

test("resumen diario: solo días laborables, con administradores y con leads pendientes", async () => {
  const sent: string[] = [];
  const base = {
    now: lunes10, appUrl: "https://crm.test", horario: HORARIO_POR_DEFECTO, alertas: { ...ALERTAS_POR_DEFECTO, emails_admin: ["admin@x.es"] },
    unattended: async () => [{ lead_id: "l1", nombre: "Ana", apellidos: null, telefono: "+34600000001", email: null, hours_waiting: 60 }],
    send: async (m: { to: string }) => { sent.push(m.to); return { ok: true }; }, log: async () => {},
  };
  assert.deepEqual(await runDailyDigest(base), { enviados: 1 });
  assert.equal((await runDailyDigest({ ...base, now: sabado11 })).skipped, "día no laborable");
  assert.equal((await runDailyDigest({ ...base, alertas: { ...ALERTAS_POR_DEFECTO, emails_admin: [] } })).skipped, "sin correos de administración configurados");
  assert.equal((await runDailyDigest({ ...base, unattended: async () => [] })).skipped, "no hay leads sin contactar");
});

// ── Función SQL sobre Postgres embebido ──────────────────────────────────────
let db: PGlite;
before(async () => { db = await newDb(); await seedUsers(db); });
const svc = { role: "service_role" } as const;

test("pending_sla_alerts: respeta plazos, no repite avisos y ignora contactados, cerrados y antiguos", async () => {
  await db.exec(`
    insert into leads (id, source, nombre, telefono, created_at, owner_id) values
      ('a0000000-0000-4000-8000-000000000001', 'meta_form', 'Reciente', '+34600000011', now() - interval '10 minutes', '${ADMIN}'),
      ('a0000000-0000-4000-8000-000000000002', 'meta_form', 'Toca recordar', '+34600000012', now() - interval '45 minutes', '${ADMIN}'),
      ('a0000000-0000-4000-8000-000000000003', 'meta_form', 'Toca escalar', '+34600000013', now() - interval '3 hours', '${ADMIN}'),
      ('a0000000-0000-4000-8000-000000000004', 'meta_form', 'Ya contactado', '+34600000014', now() - interval '5 hours', '${ADMIN}'),
      ('a0000000-0000-4000-8000-000000000005', 'meta_form', 'Antiguo', '+34600000015', now() - interval '30 days', null),
      ('a0000000-0000-4000-8000-000000000006', 'meta_form', 'Sin dueño', '+34600000016', now() - interval '50 minutes', null);
    update leads set first_contact_at = now() where nombre = 'Ya contactado';
  `);
  const q = async () => (await asCommit(db, svc, () => db.query<{ lead_id: string; send_reminder: boolean; send_escalation: boolean; owner_email: string | null }>(
    "select lead_id, send_reminder, send_escalation, owner_email from pending_sla_alerts(30, 120) order by lead_id"))).rows;

  let r = await q();
  assert.deepEqual(r.map((x) => [x.lead_id.slice(-1), x.send_reminder, x.send_escalation]), [["2", true, false], ["3", true, true], ["6", true, false]]);
  assert.equal(r.find((x) => x.lead_id.endsWith("2"))!.owner_email, "admin@test.local");
  assert.equal(r.find((x) => x.lead_id.endsWith("6"))!.owner_email, null);

  // Tras registrar los avisos ya no se repiten
  await db.exec(`
    insert into notifications_log (lead_id, tipo, to_email, status) values
      ('a0000000-0000-4000-8000-000000000002', 'sla_recordatorio', 'a@x.es', 'enviado'),
      ('a0000000-0000-4000-8000-000000000003', 'sla_recordatorio', 'a@x.es', 'enviado'),
      ('a0000000-0000-4000-8000-000000000003', 'sla_escalado', 'b@x.es', 'enviado'),
      ('a0000000-0000-4000-8000-000000000006', 'sla_recordatorio', 'b@x.es', 'enviado');
  `);
  r = await q();
  assert.deepEqual(r, []);
});

test("unattended_leads: incluye los antiguos (para el resumen diario) y excluye los contactados", async () => {
  const r = (await asCommit(db, svc, () => db.query<{ nombre: string }>("select nombre from unattended_leads(50)"))).rows.map((x) => x.nombre);
  assert.ok(r.includes("Antiguo") && r.includes("Reciente"));
  assert.ok(!r.includes("Ya contactado"));
  assert.equal(r[0], "Antiguo", "el que más lleva esperando, primero");
});
