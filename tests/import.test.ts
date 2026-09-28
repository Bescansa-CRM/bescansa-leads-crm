import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, normalizePhone } from "../src/lib/phone.ts";
import { inferInteres, inferMotivoPerdida, mapEtapaProyecto, mapFase, mapFaseDeColumna, mapTerreno, normalizeAdName } from "../src/lib/import/mapping.ts";
import { excelWallToIso, madridLocalToIso, metaCsvDateToIso } from "../src/lib/import/time.ts";
import { mergeRecords } from "../src/lib/import/merge.ts";
import type { SourceRecord } from "../src/lib/import/types.ts";

test("teléfonos: se normalizan a E.164 y no se inventan países", () => {
  assert.equal(normalizePhone("+34626307929"), "+34626307929");
  assert.equal(normalizePhone("638481628"), "+34638481628");
  assert.equal(normalizePhone("0034 638 48 16 28"), "+34638481628");
  assert.equal(normalizePhone("34638481628"), "+34638481628");
  assert.equal(normalizePhone("+351 912 345 678"), "+351912345678");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("+3463848"), null);
  assert.equal(normalizePhone(null), null);
  assert.equal(normalizePhone("  "), null);
});

test("emails: minúsculas y validación básica", () => {
  assert.equal(normalizeEmail(" Ana@Test.ES "), "ana@test.es");
  assert.equal(normalizeEmail("no-es-email"), null);
  assert.equal(normalizeEmail(undefined), null);
});

test("fases de Pipefy → 8 fases nuevas", () => {
  assert.equal(mapFase("🔵 Lead Nuevo"), "nuevo");
  assert.equal(mapFase("🟡 Lead Contactado"), "contactado");
  assert.equal(mapFase("🟠 Lead Calificado"), "calificado");
  assert.equal(mapFase("⚫️ Reagendar Visita"), "visita");
  assert.equal(mapFase("🟣 Diagnóstico / Visita Agendada"), "visita");
  assert.equal(mapFase("🔷 Llamada o Visita Realizada / Briefing Completo"), "visita");
  assert.equal(mapFase("🚀 Preparando Propuesta/Presupuesto"), "propuesta");
  assert.equal(mapFase("🟢 Propuesta Enviada"), "propuesta");
  assert.equal(mapFase("Seguimiento Bescansa - Caliente"), "negociacion");
  assert.equal(mapFase("✅ Cierre"), "ganado");
  assert.equal(mapFase("🔴 Descartado/Perdido"), "perdido");
  assert.equal(mapFase("otra cosa"), null);
  assert.equal(mapFaseDeColumna("Primera vez que entró en la fase 🟢 Propuesta Enviada"), "propuesta");
});

test("pregunta de calificación: todas las variantes de redacción caen en la lista cerrada", () => {
  assert.equal(mapEtapaProyecto("sí,_me_gustaría_recibirlo"), "solicita_informacion");
  assert.equal(mapEtapaProyecto("solo_quiero_recibir_información_por_ahora"), "solo_informacion");
  assert.equal(mapEtapaProyecto("Tengo el terreno, busco proyecto"), "tiene_terreno");
  assert.equal(mapEtapaProyecto("Explorando ideas, quiero orientación"), "explorando");
  assert.equal(mapEtapaProyecto("Explorar ideas, buscar orientación"), "explorando");
  assert.equal(mapEtapaProyecto("Tengo el proyecto, quiero presupuesto"), "tiene_proyecto");
  assert.equal(mapEtapaProyecto("Listo para empezar cuanto antes"), "listo_para_empezar");
  assert.equal(mapEtapaProyecto("Listo para empezar lo antes posible."), "listo_para_empezar");
  assert.equal(mapEtapaProyecto("He pulsado por error"), null);
});

test("terreno, interés y motivo de pérdida se deducen con prudencia", () => {
  assert.equal(mapTerreno("Casa Modular EB · Tengo parcela propia", null), "propio");
  assert.equal(mapTerreno("Casa Modular EB · Busco terreno", null), "buscando");
  assert.equal(mapTerreno(null, "Tengo el terreno, busco proyecto"), "propio");
  assert.equal(mapTerreno("Otro", null), null);
  assert.equal(inferInteres(["Casa Modular"], null, null), "casa_modular");
  assert.equal(inferInteres([], "AD07 - REFORMA INTEGRAL", null), "reforma");
  assert.equal(inferInteres([], "AD01 - CASAS MODULARES CORUÑA", null), "casa_modular");
  assert.equal(inferInteres([], null, null), null);
  assert.equal(inferMotivoPerdida(["No coge llamadas"], null), "sin_respuesta");
  assert.equal(inferMotivoPerdida(["No le interesa"], "casa_modular"), "ya_no_le_interesa");
  assert.equal(inferMotivoPerdida([], "reforma"), "reforma");
  assert.equal(inferMotivoPerdida([], null), "otro");
});

test("nombres de anuncio: guiones y espacios se unifican", () => {
  assert.equal(normalizeAdName("AD02  – REFORMA INTEGRAL COCINA"), "AD02 - REFORMA INTEGRAL COCINA");
  assert.equal(normalizeAdName("AD02 - REFORMA INTEGRAL COCINA"), "AD02 - REFORMA INTEGRAL COCINA");
  assert.equal(normalizeAdName("  "), null);
});

test("fechas: hora de Madrid a UTC, con horario de verano e invierno", () => {
  assert.equal(madridLocalToIso(2026, 8, 29, 18, 3, 4), "2026-08-29T16:03:04.000Z"); // CEST (+2)
  assert.equal(madridLocalToIso(2026, 1, 15, 10, 0), "2026-01-15T09:00:00.000Z");   // CET (+1)
  assert.equal(metaCsvDateToIso("09/25/2026 8:15am"), "2026-09-25T06:15:00.000Z");
  assert.equal(metaCsvDateToIso("06/28/2026 12:05am"), "2026-06-27T22:05:00.000Z");
  assert.equal(metaCsvDateToIso("06/28/2026 12:05pm"), "2026-06-28T10:05:00.000Z");
  assert.equal(metaCsvDateToIso("fecha rara"), null);
  assert.equal(excelWallToIso(new Date(Date.UTC(2026, 7, 29, 18, 3, 4))), "2026-08-29T16:03:04.000Z");
});

function rec(p: Partial<SourceRecord> & Pick<SourceRecord, "externalId" | "source">): SourceRecord {
  return {
    createdAt: "2026-08-01T10:00:00.000Z", nombre: "Persona", apellidos: null, email: null, telefono: null, etapa: "nuevo",
    stageHistory: [{ etapa: "nuevo", enteredAt: "2026-08-01T10:00:00.000Z" }], interes: null, etapaProyecto: null, terreno: null,
    motivoPerdida: null, campaign: null, adset: null, ad: null, tags: [], notes: [], raw: {}, ...p,
  };
}

test("fusión: Pipefy y Meta de la misma persona son un solo lead; los que solo están en Meta pasan a prioridad alta", () => {
  const { leads, stats } = mergeRecords([
    rec({ source: "import_pipefy", externalId: "p1", telefono: "+34600000001", email: "a@x.es", etapa: "propuesta", ad: "AD01 - X",
      stageHistory: [{ etapa: "nuevo", enteredAt: "2026-08-01T10:00:00.000Z" }, { etapa: "propuesta", enteredAt: "2026-08-10T10:00:00.000Z" }] }),
    rec({ source: "import_meta", externalId: "m1", telefono: "+34600000001", createdAt: "2026-07-30T08:00:00.000Z",
      stageHistory: [{ etapa: "nuevo", enteredAt: "2026-07-30T08:00:00.000Z" }] }),
    rec({ source: "import_meta", externalId: "m2", email: "solo-meta@x.es", nombre: "Solo Meta" }),
  ]);
  assert.equal(leads.length, 2);
  assert.equal(stats.merged, 1);
  assert.equal(stats.metaOnly, 1);
  const a = leads.find((l) => l.externalId === "p1")!;
  assert.equal(a.etapa, "propuesta");
  assert.equal(a.prioridad, "alta");
  assert.equal(a.createdAt, "2026-07-30T08:00:00.000Z", "conserva la fecha más antigua");
  assert.equal(a.stageHistory.find((h) => h.etapa === "nuevo")!.enteredAt, "2026-07-30T08:00:00.000Z");
  const b = leads.find((l) => l.externalId === "m2")!;
  assert.equal(b.prioridad, "alta");
  assert.ok(b.tags.includes("sin-contactar-agencia"));
});

test("fusión: dos tarjetas de Pipefy con el mismo email se unen y queda constancia; el principal es el más reciente", () => {
  const { leads } = mergeRecords([
    rec({ source: "import_pipefy", externalId: "old", email: "d@x.es", updatedAt: "2026-05-01T00:00:00.000Z", etapa: "perdido", motivoPerdida: "otro" }),
    rec({ source: "import_pipefy", externalId: "new", email: "D@x.es".toLowerCase(), telefono: "+34611111111", updatedAt: "2026-09-01T00:00:00.000Z", etapa: "contactado" }),
  ]);
  assert.equal(leads.length, 1);
  assert.equal(leads[0].externalId, "new");
  assert.equal(leads[0].etapa, "contactado");
  assert.equal(leads[0].telefono, "+34611111111");
  assert.ok(leads[0].notes.some((n) => n.text.includes("duplicada") && n.text.includes("old")));
  assert.equal(leads[0].motivoPerdida, null);
});

test("fusión: un cierre nunca queda absorbido por una tarjeta duplicada más reciente", () => {
  const { leads } = mergeRecords([
    rec({ source: "import_pipefy", externalId: "cierre", email: "c@x.es", etapa: "ganado", updatedAt: "2026-05-01T00:00:00.000Z" }),
    rec({ source: "import_pipefy", externalId: "reciente", email: "c@x.es", etapa: "nuevo", updatedAt: "2026-09-01T00:00:00.000Z" }),
  ]);
  assert.equal(leads.length, 1);
  assert.equal(leads[0].etapa, "ganado");
  assert.equal(leads[0].externalId, "cierre");
});

test("fusión: un lead perdido siempre lleva motivo", () => {
  const { leads } = mergeRecords([rec({ source: "import_pipefy", externalId: "x", email: "x@x.es", etapa: "perdido", motivoPerdida: null })]);
  assert.equal(leads[0].motivoPerdida, "otro");
});
