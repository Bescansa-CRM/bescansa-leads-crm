import type { Etapa, LeadRow, SpendRow } from "./data/types.ts";

export const FUNNEL: Etapa[] = ["nuevo", "contactado", "calificado", "visita", "propuesta", "negociacion", "ganado"];

const H = 3_600_000;
const reached = (l: LeadRow, e: Etapa) => l.etapasAlcanzadas.includes(e) || l.etapa === e;

export interface Range { desde?: string; hasta?: string } // ISO (incluye ambos extremos)

export function inRange(l: LeadRow, r: Range): boolean {
  if (r.desde && l.createdAt < r.desde) return false;
  if (r.hasta && l.createdAt > r.hasta) return false;
  return true;
}

export interface FunnelStep { etapa: Etapa; leads: number; pctDelTotal: number; pctDelPaso: number | null }

/** Cuántos leads llegaron alguna vez a cada fase (no solo los que están ahora). */
export function funnel(leads: LeadRow[]): FunnelStep[] {
  const total = leads.length;
  let prev: number | null = null;
  return FUNNEL.map((etapa) => {
    const n = leads.filter((l) => reached(l, etapa)).length;
    const step = { etapa, leads: n, pctDelTotal: total ? (n / total) * 100 : 0, pctDelPaso: prev === null ? null : prev ? (n / prev) * 100 : 0 };
    prev = n;
    return step;
  });
}

export interface AdRow {
  ad: string;
  leads: number;
  contactados: number;
  calificados: number;
  visitas: number;
  propuestas: number;
  ganados: number;
  gasto: number;
  cpl: number | null;
  costeVisita: number | null;
  costePropuesta: number | null;
  costeCierre: number | null;
  sinContactarPct: number;
}

const div = (a: number, b: number) => (b > 0 ? a / b : null);

/** Rendimiento por anuncio. El gasto se cruza por nombre de anuncio y solo cuenta el del periodo. */
export function byAd(leads: LeadRow[], spend: SpendRow[], range: Range = {}): AdRow[] {
  const desde = range.desde?.slice(0, 10), hasta = range.hasta?.slice(0, 10);
  const gastoPorAd = new Map<string, number>();
  for (const s of spend) {
    if ((desde && s.day < desde) || (hasta && s.day > hasta)) continue;
    const k = s.ad ?? "(sin anuncio)";
    gastoPorAd.set(k, (gastoPorAd.get(k) ?? 0) + s.spend);
  }
  const groups = new Map<string, LeadRow[]>();
  for (const l of leads.filter((x) => inRange(x, range))) {
    const k = l.ad ?? "(sin anuncio)";
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(l);
  }
  const keys = new Set([...groups.keys(), ...gastoPorAd.keys()]);
  return [...keys].map((ad) => {
    const ls = groups.get(ad) ?? [];
    const c = (e: Etapa) => ls.filter((l) => reached(l, e)).length;
    const gasto = Math.round((gastoPorAd.get(ad) ?? 0) * 100) / 100;
    const visitas = c("visita"), propuestas = c("propuesta"), ganados = c("ganado");
    return {
      ad, leads: ls.length, contactados: c("contactado"), calificados: c("calificado"), visitas, propuestas, ganados, gasto,
      cpl: div(gasto, ls.length), costeVisita: div(gasto, visitas), costePropuesta: div(gasto, propuestas), costeCierre: div(gasto, ganados),
      sinContactarPct: ls.length ? (ls.filter((l) => !l.firstContactAt && l.etapa === "nuevo").length / ls.length) * 100 : 0,
    };
  }).sort((a, b) => b.leads - a.leads);
}

export interface ResponseTimes {
  conContacto: number;
  medianaHoras: number | null;
  pctEn1h: number | null;
  pctEn24h: number | null;
  sinContactar: number;
}

export function responseTimes(leads: LeadRow[]): ResponseTimes {
  const horas = leads
    .filter((l) => l.firstContactAt)
    .map((l) => (Date.parse(l.firstContactAt!) - Date.parse(l.createdAt)) / H)
    .filter((h) => h >= 0)
    .sort((a, b) => a - b);
  const n = horas.length;
  const mediana = n === 0 ? null : n % 2 ? horas[(n - 1) / 2] : (horas[n / 2 - 1] + horas[n / 2]) / 2;
  const within = (h: number) => (leads.length ? (horas.filter((x) => x <= h).length / leads.length) * 100 : null);
  return { conContacto: n, medianaHoras: mediana, pctEn1h: within(1), pctEn24h: within(24), sinContactar: leads.filter((l) => !l.firstContactAt && l.etapa === "nuevo").length };
}

export function lostReasons(leads: LeadRow[]): { motivo: string; n: number; pct: number }[] {
  const perdidos = leads.filter((l) => l.etapa === "perdido");
  const m = new Map<string, number>();
  for (const l of perdidos) m.set(l.motivoPerdida ?? "otro", (m.get(l.motivoPerdida ?? "otro") ?? 0) + 1);
  return [...m].map(([motivo, n]) => ({ motivo, n, pct: perdidos.length ? (n / perdidos.length) * 100 : 0 })).sort((a, b) => b.n - a.n);
}

/** Leads por día (zona Europa/Madrid) para los últimos `days` días, incluidos los días sin leads. */
export function perDay(leads: LeadRow[], days: number, now = Date.now()): { day: string; n: number }[] {
  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }); // AAAA-MM-DD
  const out = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) out.set(fmt.format(new Date(now - i * 24 * H)), 0);
  for (const l of leads) { const k = fmt.format(new Date(l.createdAt)); if (out.has(k)) out.set(k, out.get(k)! + 1); }
  return [...out].map(([day, n]) => ({ day, n }));
}

export interface Totals { leads: number; gasto: number; cpl: number | null; ganados: number; costeCierre: number | null; tasaCierre: number | null }

export function totals(leads: LeadRow[], spend: SpendRow[], range: Range = {}): Totals {
  const ls = leads.filter((l) => inRange(l, range));
  const rows = byAd(leads, spend, range);
  const gasto = Math.round(rows.reduce((a, r) => a + r.gasto, 0) * 100) / 100;
  const ganados = ls.filter((l) => reached(l, "ganado")).length;
  return { leads: ls.length, gasto, cpl: div(gasto, ls.length), ganados, costeCierre: div(gasto, ganados), tasaCierre: ls.length ? (ganados / ls.length) * 100 : null };
}
