import { createHash, timingSafeEqual } from "node:crypto";
import { mapEtapaProyecto } from "./import/mapping.ts";
import { normalizeEmail, normalizePhone } from "./phone.ts";

export const INGEST_SOURCES = ["meta_form", "landing", "google_form", "manual"] as const;
export type IngestSource = (typeof INGEST_SOURCES)[number];

const INTERES = ["casa_modular", "reforma", "terreno", "otro"] as const;
const TERRENO = ["propio", "reservado", "buscando", "sin_terreno"] as const;

export interface IngestLead {
  source: IngestSource;
  external_id?: string;
  nombre: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  municipio?: string;
  provincia?: string;
  interes?: string;
  etapa_proyecto?: string;
  terreno?: string;
  superficie_rango?: string;
  presupuesto_rango?: string;
  plazo?: string;
  financiacion?: string;
  perfil?: Record<string, string>;
  platform?: "meta" | "google" | "landing" | "otro";
  campaign?: string; campaign_id?: string;
  adset?: string; adset_id?: string;
  ad?: string; ad_id?: string;
  utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string;
  fbclid?: string; gclid?: string; meta_lead_id?: string;
  landing_url?: string; referrer?: string;
  consent_text?: string; consent_at?: string; consent_version?: string; consent_whatsapp?: boolean;
  tags?: string[];
}

export type ParseResult = { ok: true; value: IngestLead } | { ok: false; errors: string[] };

const str = (v: unknown, max: number): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : undefined;
};
// El texto del consentimiento conserva sus saltos de línea
const text = (v: unknown, max: number): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s ? s.slice(0, max) : undefined;
};

/** Valida y normaliza el cuerpo recibido (de la landing, de Make/Zapier, de Meta o de Google). */
export function parseIngestPayload(body: unknown): ParseResult {
  const errors: string[] = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, errors: ["El cuerpo debe ser un objeto JSON"] };
  const b = body as Record<string, unknown>;

  const source = str(b.source, 20) as IngestSource | undefined;
  if (!source || !INGEST_SOURCES.includes(source)) errors.push(`source debe ser uno de: ${INGEST_SOURCES.join(", ")}`);

  const nombre = str(b.nombre ?? b.name ?? b.full_name, 120);
  if (!nombre) errors.push("nombre es obligatorio");

  const emailRaw = b.email ?? b.correo;
  const phoneRaw = b.telefono ?? b.phone ?? b.phone_number;
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  const telefono = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (emailRaw && !email) errors.push("email no válido");
  if (phoneRaw && !telefono) errors.push("teléfono no válido (usa formato +34600000000 o 9 dígitos)");
  if (!email && !telefono && !errors.some((e) => e.includes("no válido"))) errors.push("hace falta un email o un teléfono");

  let consent_at: string | undefined;
  if (b.consent_at) {
    const d = new Date(String(b.consent_at));
    if (Number.isNaN(d.getTime())) errors.push("consent_at no es una fecha válida");
    else consent_at = d.toISOString();
  }

  if (b.tags !== undefined && (!Array.isArray(b.tags) || b.tags.length > 20)) errors.push("tags debe ser una lista de hasta 20 textos");
  if (b.perfil !== undefined && (typeof b.perfil !== "object" || b.perfil === null || Array.isArray(b.perfil))) errors.push("perfil debe ser un objeto");

  if (errors.length || !source || !nombre) return { ok: false, errors };

  const perfil: Record<string, string> = {};
  if (b.perfil && typeof b.perfil === "object") {
    for (const [k, v] of Object.entries(b.perfil as Record<string, unknown>).slice(0, 30)) {
      const val = str(v, 300);
      if (val) perfil[str(k, 60) ?? k] = val;
    }
  }

  const interes = str(b.interes, 30);
  const terreno = str(b.terreno, 30);
  const platform = str(b.platform, 10);
  const value: IngestLead = {
    source,
    external_id: str(b.external_id, 200),
    nombre,
    apellidos: str(b.apellidos, 120),
    email: email ?? undefined,
    telefono: telefono ?? undefined,
    municipio: str(b.municipio, 120),
    provincia: str(b.provincia, 120),
    interes: interes && (INTERES as readonly string[]).includes(interes) ? interes : undefined,
    etapa_proyecto: mapEtapaProyecto(b.etapa_proyecto) ?? undefined,
    terreno: terreno && (TERRENO as readonly string[]).includes(terreno) ? terreno : undefined,
    superficie_rango: str(b.superficie_rango, 60),
    presupuesto_rango: str(b.presupuesto_rango, 60),
    plazo: str(b.plazo, 60),
    financiacion: str(b.financiacion, 60),
    perfil: Object.keys(perfil).length ? perfil : undefined,
    platform: platform && ["meta", "google", "landing", "otro"].includes(platform) ? (platform as IngestLead["platform"]) : undefined,
    campaign: str(b.campaign, 200), campaign_id: str(b.campaign_id, 60),
    adset: str(b.adset, 200), adset_id: str(b.adset_id, 60),
    ad: str(b.ad, 200), ad_id: str(b.ad_id, 60),
    utm_source: str(b.utm_source, 120), utm_medium: str(b.utm_medium, 120), utm_campaign: str(b.utm_campaign, 200),
    utm_content: str(b.utm_content, 200), utm_term: str(b.utm_term, 200),
    fbclid: str(b.fbclid, 300), gclid: str(b.gclid, 300), meta_lead_id: str(b.meta_lead_id, 60),
    landing_url: str(b.landing_url, 500), referrer: str(b.referrer, 500),
    consent_text: text(b.consent_text, 2000), consent_at, consent_version: str(b.consent_version, 30),
    consent_whatsapp: b.consent_whatsapp === true,
    tags: Array.isArray(b.tags) ? (b.tags.map((t) => str(t, 40)).filter(Boolean) as string[]) : undefined,
  };
  return { ok: true, value: Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as unknown as IngestLead };
}

/** Compara la clave recibida con la esperada sin filtrar información por tiempos de respuesta. */
export function secretMatches(header: string | null, expected: string | undefined): boolean {
  if (!expected || expected.length < 24) return false; // sin clave (o demasiado corta) el endpoint queda cerrado
  const m = header?.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const a = createHash("sha256").update(m[1]).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
