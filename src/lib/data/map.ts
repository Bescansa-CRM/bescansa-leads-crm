import { ETAPAS, type Etapa, type EventRow, type EventTipo, type LeadRow, type SpendRow, type TaskRow, type UserRow } from "./types.ts";

type One<T> = T | T[] | null | undefined;
const first = <T>(x: One<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));

/** Columnas y relaciones que se piden a PostgREST para construir un LeadRow. */
export const LEAD_SELECT =
  "id, created_at, nombre, apellidos, email, telefono, municipio, etapa, prioridad, owner_id, interes, etapa_proyecto, terreno, " +
  "superficie_rango, presupuesto_rango, plazo, perfil, first_contact_at, contact_attempts, next_action_at, motivo_perdida, tags, source, consent_at, utm_source, " +
  "owner:profiles!leads_owner_id_fkey(full_name), ad:ads!leads_ad_id_fkey(name), adset:adsets!leads_adset_id_fkey(name), " +
  "campaign:campaigns!leads_campaign_id_fkey(name), history:lead_stage_history(etapa, entered_at)";

export const EVENT_SELECT = "id, lead_id, created_at, tipo, detalle, contacto_efectivo, author:profiles!lead_events_author_id_fkey(full_name)";
export const TASK_SELECT = "id, lead_id, titulo, due_at, done_at, owner_id, lead:leads!tasks_lead_id_fkey(nombre, apellidos), owner:profiles!tasks_owner_id_fkey(full_name)";
export const SPEND_SELECT = "day, spend, ad:ads!ad_spend_ad_id_fkey(name), campaign:campaigns!ad_spend_campaign_id_fkey(name)";

export interface LeadDbRow {
  id: string; created_at: string; nombre: string; apellidos: string | null; email: string | null; telefono: string | null; municipio: string | null;
  etapa: string; prioridad: string; owner_id: string | null; interes: string | null; etapa_proyecto: string | null; terreno: string | null;
  superficie_rango: string | null; presupuesto_rango: string | null; plazo: string | null; perfil: Record<string, unknown> | null;
  first_contact_at: string | null; contact_attempts: number; next_action_at: string | null; motivo_perdida: string | null; tags: string[] | null;
  source: string; consent_at: string | null; utm_source: string | null;
  owner: One<{ full_name: string }>; ad: One<{ name: string }>; adset: One<{ name: string }>; campaign: One<{ name: string }>;
  history: { etapa: string; entered_at: string }[] | null;
}

const isEtapa = (e: string): e is Etapa => (ETAPAS as readonly string[]).includes(e);

export function mapLeadRow(r: LeadDbRow): LeadRow {
  const etapa: Etapa = isEtapa(r.etapa) ? r.etapa : "nuevo";
  const history = (r.history ?? []).filter((h) => isEtapa(h.etapa));
  const desde = history.filter((h) => h.etapa === etapa).map((h) => h.entered_at).sort().pop();
  const perfil: Record<string, string> = {};
  for (const [k, v] of Object.entries(r.perfil ?? {})) if (typeof v === "string" && v) perfil[k] = v;
  return {
    id: r.id, createdAt: r.created_at, nombre: r.nombre, apellidos: r.apellidos, email: r.email, telefono: r.telefono, municipio: r.municipio,
    etapa, etapaDesde: desde ?? r.created_at, etapasAlcanzadas: [...new Set([...history.map((h) => h.etapa as Etapa), etapa])],
    prioridad: r.prioridad === "alta" || r.prioridad === "baja" ? r.prioridad : "normal",
    ownerId: r.owner_id, ownerName: first(r.owner)?.full_name ?? null,
    interes: r.interes, etapaProyecto: r.etapa_proyecto, terreno: r.terreno, superficieRango: r.superficie_rango,
    presupuestoRango: r.presupuesto_rango, plazo: r.plazo, perfil,
    campaign: first(r.campaign)?.name ?? null, adset: first(r.adset)?.name ?? null, ad: first(r.ad)?.name ?? null,
    utmSource: r.utm_source, firstContactAt: r.first_contact_at, contactAttempts: r.contact_attempts ?? 0, nextActionAt: r.next_action_at,
    motivoPerdida: r.motivo_perdida, tags: r.tags ?? [], source: r.source, consentAt: r.consent_at,
  };
}

export function mapEventRow(r: { id: number | string; lead_id: string; created_at: string; tipo: string; detalle: string | null; contacto_efectivo: boolean | null; author: One<{ full_name: string }> }): EventRow {
  return { id: String(r.id), leadId: r.lead_id, createdAt: r.created_at, tipo: r.tipo as EventTipo, detalle: r.detalle, authorName: first(r.author)?.full_name ?? null, efectivo: r.contacto_efectivo };
}

export function mapTaskRow(r: { id: string; lead_id: string; titulo: string; due_at: string | null; done_at: string | null; owner_id: string | null; lead: One<{ nombre: string; apellidos: string | null }>; owner: One<{ full_name: string }> }): TaskRow {
  const l = first(r.lead);
  return {
    id: r.id, leadId: r.lead_id, leadName: l ? `${l.nombre} ${l.apellidos ?? ""}`.trim() : "Lead", titulo: r.titulo,
    dueAt: r.due_at, doneAt: r.done_at, ownerId: r.owner_id, ownerName: first(r.owner)?.full_name ?? null,
  };
}

export function mapSpendRow(r: { day: string; spend: number | string; ad: One<{ name: string }>; campaign: One<{ name: string }> }): SpendRow {
  return { day: r.day, ad: first(r.ad)?.name ?? null, campaign: first(r.campaign)?.name ?? null, spend: Number(r.spend) };
}

export function mapUserRow(r: { id: string; full_name: string; email: string; role: string }): UserRow {
  return { id: r.id, nombre: r.full_name || r.email, email: r.email, role: r.role === "admin" ? "admin" : "ventas" };
}

/** Prepara el texto de búsqueda para un filtro `or(...)` de PostgREST: quita los caracteres con significado especial. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[%*,()\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}
