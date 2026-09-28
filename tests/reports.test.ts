import { test } from "node:test";
import assert from "node:assert/strict";
import { byAd, funnel, lostReasons, perDay, responseTimes, totals } from "../src/lib/reports.ts";
import type { Etapa, LeadRow, SpendRow } from "../src/lib/data/types.ts";

const H = 3_600_000;
const T0 = Date.parse("2026-09-20T10:00:00Z");

function lead(p: Partial<LeadRow> & { id: string }): LeadRow {
  return {
    createdAt: new Date(T0).toISOString(), nombre: "X", apellidos: null, email: null, telefono: null, municipio: null, etapa: "nuevo",
    etapaDesde: new Date(T0).toISOString(), etapasAlcanzadas: ["nuevo"], prioridad: "normal", ownerId: null, ownerName: null, interes: null,
    etapaProyecto: null, terreno: null, superficieRango: null, presupuestoRango: null, plazo: null, perfil: {}, campaign: null, adset: null,
    ad: "AD01", utmSource: null, firstContactAt: null, contactAttempts: 0, nextActionAt: null, motivoPerdida: null, tags: [], source: "meta_form", consentAt: null, ...p,
  };
}
const at = (h: number) => new Date(T0 + h * H).toISOString();
const path = (...e: Etapa[]) => e;

const leads: LeadRow[] = [
  lead({ id: "1", ad: "AD01", etapa: "ganado", etapasAlcanzadas: path("nuevo", "contactado", "calificado", "visita", "propuesta", "ganado"), firstContactAt: at(0.5) }),
  lead({ id: "2", ad: "AD01", etapa: "propuesta", etapasAlcanzadas: path("nuevo", "contactado", "calificado", "visita", "propuesta"), firstContactAt: at(3) }),
  lead({ id: "3", ad: "AD01", etapa: "perdido", motivoPerdida: "precio", etapasAlcanzadas: path("nuevo", "contactado", "perdido"), firstContactAt: at(30) }),
  lead({ id: "4", ad: "AD01" }),
  lead({ id: "5", ad: "AD02", etapa: "perdido", motivoPerdida: "precio", etapasAlcanzadas: path("nuevo", "perdido") }),
  lead({ id: "6", ad: "AD02", etapa: "perdido", motivoPerdida: "sin_respuesta", etapasAlcanzadas: path("nuevo", "perdido") }),
];
const spend: SpendRow[] = [
  { day: "2026-09-20", ad: "AD01", campaign: null, spend: 100 },
  { day: "2026-09-21", ad: "AD01", campaign: null, spend: 60 },
  { day: "2026-09-20", ad: "AD02", campaign: null, spend: 40 },
  { day: "2026-08-01", ad: "AD02", campaign: null, spend: 999 },
];

test("embudo: cuenta las fases por las que pasó cada lead, no solo donde está ahora", () => {
  const f = funnel(leads);
  const n = (e: Etapa) => f.find((x) => x.etapa === e)!.leads;
  assert.equal(n("nuevo"), 6);
  assert.equal(n("contactado"), 3);
  assert.equal(n("propuesta"), 2);
  assert.equal(n("ganado"), 1);
  assert.equal(f[0].pctDelPaso, null);
  assert.equal(Math.round(f.find((x) => x.etapa === "contactado")!.pctDelPaso!), 50);
});

test("por anuncio: costes por lead, propuesta y cierre con el gasto del periodo", () => {
  const rows = byAd(leads, spend, { desde: "2026-09-01T00:00:00Z" });
  const a1 = rows.find((r) => r.ad === "AD01")!, a2 = rows.find((r) => r.ad === "AD02")!;
  assert.equal(a1.leads, 4);
  assert.equal(a1.gasto, 160);
  assert.equal(a1.cpl, 40);
  assert.equal(a1.propuestas, 2);
  assert.equal(a1.costePropuesta, 80);
  assert.equal(a1.ganados, 1);
  assert.equal(a1.costeCierre, 160);
  assert.equal(a1.sinContactarPct, 25);
  assert.equal(a2.gasto, 40, "el gasto de agosto queda fuera del periodo");
  assert.equal(a2.costeCierre, null, "sin cierres no hay coste por cierre");
  assert.equal(rows[0].ad, "AD01", "ordenado por número de leads");
});

test("por anuncio: un anuncio con gasto pero sin leads aparece (para detectar dinero perdido)", () => {
  const rows = byAd([], [{ day: "2026-09-20", ad: "AD09", campaign: null, spend: 25 }], {});
  assert.equal(rows.length, 1);
  assert.equal(rows[0].cpl, null);
  assert.equal(rows[0].gasto, 25);
});

test("tiempos de respuesta: mediana y porcentajes sobre el total de leads", () => {
  const r = responseTimes(leads);
  assert.equal(r.conContacto, 3);
  assert.equal(r.medianaHoras, 3);
  assert.equal(Math.round(r.pctEn1h!), 17);   // 1 de 6
  assert.equal(Math.round(r.pctEn24h!), 33);  // 2 de 6
  assert.equal(r.sinContactar, 1);
});

test("motivos de pérdida ordenados y con porcentaje", () => {
  const m = lostReasons(leads);
  assert.deepEqual(m.map((x) => x.motivo), ["precio", "sin_respuesta"]);
  assert.equal(m[0].n, 2);
  assert.equal(Math.round(m[0].pct), 67);
});

test("leads por día: incluye los días sin leads, en orden", () => {
  const d = perDay(leads, 3, T0 + 24 * H);
  assert.equal(d.length, 3);
  assert.deepEqual(d.map((x) => x.day), ["2026-09-19", "2026-09-20", "2026-09-21"]);
  assert.deepEqual(d.map((x) => x.n), [0, 6, 0]);
});

test("totales: coste por lead y por cierre; sin datos no se divide por cero", () => {
  const t = totals(leads, spend, { desde: "2026-09-01T00:00:00Z" });
  assert.equal(t.leads, 6);
  assert.equal(t.gasto, 200);
  assert.equal(Math.round(t.cpl! * 100) / 100, 33.33);
  assert.equal(t.costeCierre, 200);
  const vacio = totals([], [], {});
  assert.equal(vacio.cpl, null);
  assert.equal(vacio.tasaCierre, null);
});
