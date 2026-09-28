import { test } from "node:test";
import assert from "node:assert/strict";
import { mapEventRow, mapLeadRow, mapSpendRow, mapTaskRow, mapUserRow, sanitizeSearch, type LeadDbRow } from "../src/lib/data/map.ts";

const base: LeadDbRow = {
  id: "l1", created_at: "2026-09-01T08:00:00Z", nombre: "Ana", apellidos: "Pérez", email: "a@x.es", telefono: "+34600000001", municipio: "Oleiros",
  etapa: "propuesta", prioridad: "alta", owner_id: "u1", interes: "casa_modular", etapa_proyecto: "tiene_terreno", terreno: "propio",
  superficie_rango: "90–120 m²", presupuesto_rango: "200.000–300.000 €", plazo: "6–12 meses", perfil: { edad_rango: "35–44", numero: 5 as unknown as string },
  first_contact_at: "2026-09-01T10:00:00Z", contact_attempts: 2, next_action_at: null, motivo_perdida: null, tags: ["a"], source: "meta_form", consent_at: null, utm_source: "facebook",
  owner: { full_name: "Lucía" }, ad: [{ name: "AD01" }], adset: null, campaign: { name: "CAMP" },
  history: [
    { etapa: "nuevo", entered_at: "2026-09-01T08:00:00Z" }, { etapa: "contactado", entered_at: "2026-09-01T10:00:00Z" },
    { etapa: "propuesta", entered_at: "2026-09-05T09:00:00Z" }, { etapa: "propuesta", entered_at: "2026-09-07T09:00:00Z" }, { etapa: "rara", entered_at: "2026-09-02T00:00:00Z" },
  ],
};

test("lead: une relaciones (objeto o lista), historial y perfil solo con textos", () => {
  const l = mapLeadRow(base);
  assert.equal(l.ownerName, "Lucía");
  assert.equal(l.ad, "AD01", "acepta la relación como lista");
  assert.equal(l.campaign, "CAMP");
  assert.equal(l.adset, null);
  assert.equal(l.etapaDesde, "2026-09-07T09:00:00Z", "la última entrada en la fase actual");
  assert.deepEqual(l.etapasAlcanzadas, ["nuevo", "contactado", "propuesta"], "sin duplicados ni fases desconocidas");
  assert.deepEqual(l.perfil, { edad_rango: "35–44" });
  assert.equal(l.prioridad, "alta");
});

test("lead: valores inesperados no rompen (fase desconocida, prioridad rara, nulos)", () => {
  const l = mapLeadRow({ ...base, etapa: "otra", prioridad: "urgente", history: null, tags: null, perfil: null, owner: null, contact_attempts: undefined as unknown as number });
  assert.equal(l.etapa, "nuevo");
  assert.equal(l.prioridad, "normal");
  assert.equal(l.etapaDesde, base.created_at);
  assert.deepEqual(l.etapasAlcanzadas, ["nuevo"]);
  assert.deepEqual(l.tags, []);
  assert.deepEqual(l.perfil, {});
  assert.equal(l.ownerName, null);
  assert.equal(l.contactAttempts, 0);
});

test("evento, tarea, gasto y usuario", () => {
  const e = mapEventRow({ id: 7, lead_id: "l1", created_at: "2026-09-01T10:00:00Z", tipo: "llamada", detalle: "ok", contacto_efectivo: true, author: { full_name: "Lucía" } });
  assert.deepEqual([e.id, e.authorName, e.efectivo], ["7", "Lucía", true]);
  const t = mapTaskRow({ id: "t1", lead_id: "l1", titulo: "Llamar", due_at: null, done_at: null, owner_id: null, lead: [{ nombre: "Ana", apellidos: null }], owner: null });
  assert.equal(t.leadName, "Ana");
  assert.equal(mapTaskRow({ ...{ id: "t2", lead_id: "l1", titulo: "x", due_at: null, done_at: null, owner_id: null, owner: null }, lead: null }).leadName, "Lead");
  const s = mapSpendRow({ day: "2026-09-01", spend: "12.50", ad: { name: "AD01" }, campaign: null });
  assert.deepEqual([s.spend, s.ad, s.campaign], [12.5, "AD01", null]);
  assert.equal(mapUserRow({ id: "u", full_name: "", email: "a@x.es", role: "raro" }).nombre, "a@x.es");
  assert.equal(mapUserRow({ id: "u", full_name: "A", email: "a@x.es", role: "admin" }).role, "admin");
});

test("búsqueda: se eliminan los caracteres que rompen el filtro de PostgREST", () => {
  assert.equal(sanitizeSearch("ana,perez)"), "ana perez");
  assert.equal(sanitizeSearch(`%*"'(x)`), "x");
  assert.equal(sanitizeSearch("  a   b  "), "a b");
  assert.equal(sanitizeSearch("x".repeat(200)).length, 80);
});
