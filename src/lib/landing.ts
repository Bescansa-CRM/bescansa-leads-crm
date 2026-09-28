import { parseIngestPayload, type IngestLead, type ParseResult } from "./ingest.ts";

export const CONSENT_VERSION = "2026-09-v1";
const MIN_FILL_MS = 3_000;      // un humano tarda más de 3 s en rellenar el formulario
const MAX_AGE_MS = 6 * 3_600_000; // y el formulario no puede haberse abierto hace más de 6 h

export type LandingResult =
  | { ok: true; value: IngestLead; suspicious: false }
  | { ok: true; value: null; suspicious: true; reason: string }   // se responde "ok" a los bots pero no se guarda nada
  | { ok: false; errors: string[] };

const s = (v: unknown, n: number) => (v === undefined || v === null ? undefined : String(v).trim().slice(0, n) || undefined);

/**
 * Valida el envío del formulario público de la landing. A diferencia del endpoint de integraciones,
 * exige consentimiento y aplica medidas antispam (campo trampa y tiempo mínimo de relleno).
 */
export function parseLandingPayload(body: unknown, now = Date.now()): LandingResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, errors: ["El cuerpo debe ser un objeto JSON"] };
  const b = body as Record<string, unknown>;

  if (s(b.website, 200)) return { ok: true, value: null, suspicious: true, reason: "campo trampa relleno" };
  const started = Number(b.started_at);
  if (Number.isFinite(started) && started > 0) {
    const elapsed = now - started;
    if (elapsed < MIN_FILL_MS) return { ok: true, value: null, suspicious: true, reason: "enviado demasiado rápido" };
    if (elapsed > MAX_AGE_MS) return { ok: false, errors: ["El formulario ha caducado; recarga la página e inténtalo de nuevo"] };
  }

  const errors: string[] = [];
  if (b.consent !== true) errors.push("Debes aceptar la política de privacidad para enviar el formulario");
  const consentText = s(b.consent_text, 2000);
  if (b.consent === true && !consentText) errors.push("Falta el texto de consentimiento mostrado");

  const parsed: ParseResult = parseIngestPayload({
    source: "landing",
    external_id: s(b.event_id, 100) ? `landing:${s(b.event_id, 100)}` : undefined,
    nombre: b.nombre,
    apellidos: b.apellidos,
    email: b.email,
    telefono: b.telefono,
    municipio: b.municipio,
    provincia: b.provincia,
    interes: b.interes,
    etapa_proyecto: b.etapa_proyecto,
    terreno: b.terreno,
    superficie_rango: b.superficie_rango,
    presupuesto_rango: b.presupuesto_rango,
    plazo: b.plazo,
    financiacion: b.financiacion,
    perfil: { ...(typeof b.perfil === "object" && b.perfil && !Array.isArray(b.perfil) ? (b.perfil as object) : {}), ...(s(b.dormitorios, 5) ? { dormitorios: s(b.dormitorios, 5) } : {}), ...(s(b.mensaje, 1000) ? { mensaje: s(b.mensaje, 1000) } : {}) },
    platform: "landing",
    campaign: b.utm_campaign,
    utm_source: b.utm_source, utm_medium: b.utm_medium, utm_campaign: b.utm_campaign, utm_content: b.utm_content, utm_term: b.utm_term,
    fbclid: b.fbclid, gclid: b.gclid,
    landing_url: b.landing_url, referrer: b.referrer,
    consent_text: consentText, consent_at: new Date(now).toISOString(), consent_version: CONSENT_VERSION,
    consent_whatsapp: b.consent_whatsapp === true,
    tags: ["landing"],
  });
  if (!parsed.ok) errors.push(...parsed.errors);
  if (errors.length || !parsed.ok) return { ok: false, errors };
  return { ok: true, value: parsed.value, suspicious: false };
}

/** Límite de envíos por clave (IP). En memoria: suficiente contra ráfagas, no sustituye a un WAF. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private readonly max: number, private readonly windowMs: number) {}

  allow(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) { this.hits.set(key, recent); return false; }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5_000) for (const [k, v] of this.hits) if (v.every((t) => now - t >= this.windowMs)) this.hits.delete(k);
    return true;
  }
}

/** Cabeceras CORS solo para los orígenes permitidos (lista separada por comas en LANDING_ORIGINS). */
export function corsHeaders(origin: string | null, allowed: string | undefined): Record<string, string> {
  const list = (allowed ?? "").split(",").map((x) => x.trim().replace(/\/$/, "")).filter(Boolean);
  const h: Record<string, string> = { Vary: "Origin" };
  if (origin && list.includes(origin.replace(/\/$/, ""))) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "600";
  }
  return h;
}
