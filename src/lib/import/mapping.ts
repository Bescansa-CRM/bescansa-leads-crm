import type { Etapa, EtapaProyecto, Interes, MotivoPerdida, SourceRecord } from "./types.ts";

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const clean = (s: unknown) => (s === null || s === undefined ? "" : String(s).replace(/\s+/g, " ").trim());

/** Fase de Pipefy (con emoji) → fase nueva del CRM. */
export function mapFase(raw: unknown): Etapa | null {
  const s = strip(clean(raw));
  if (!s) return null;
  if (s.includes("lead nuevo")) return "nuevo";
  if (s.includes("lead contactado")) return "contactado";
  if (s.includes("lead calificado")) return "calificado";
  if (s.includes("reagendar visita") || s.includes("diagnostico") || s.includes("llamada o visita")) return "visita";
  if (s.includes("preparando propuesta") || s.includes("propuesta enviada")) return "propuesta";
  if (s.includes("seguimiento bescansa")) return "negociacion";
  if (s.includes("cierre")) return "ganado";
  if (s.includes("descartado") || s.includes("perdido")) return "perdido";
  return null;
}

/** Columnas "Primera vez que entró en la fase X" → fase nueva (o null si no se reconoce). */
export function mapFaseDeColumna(header: string): Etapa | null {
  const m = header.match(/entr[oó] en la fase\s*(.+)$/i);
  return m ? mapFase(m[1]) : null;
}

/** "Pregunta de calificación" de Meta / "¿En qué fase está tu proyecto?" de la landing → lista cerrada. */
export function mapEtapaProyecto(raw: unknown): EtapaProyecto | null {
  const s = strip(clean(raw).replace(/_/g, " "));
  if (!s) return null;
  if (s.includes("me gustaria recibirlo")) return "solicita_informacion";
  if (s.includes("solo quiero recibir")) return "solo_informacion";
  if (s.includes("tengo el terreno")) return "tiene_terreno";
  if (s.includes("explor")) return "explorando";
  if (s.includes("tengo el proyecto")) return "tiene_proyecto";
  if (s.includes("listo para empezar")) return "listo_para_empezar";
  return null;
}

export function mapTerreno(tipoProyecto: unknown, calificacion: unknown): SourceRecord["terreno"] {
  const t = strip(clean(tipoProyecto));
  const c = strip(clean(calificacion));
  if (t.includes("parcela propia") || c.includes("tengo el terreno")) return "propio";
  if (t.includes("busco terreno") || t.includes("buscando terreno")) return "buscando";
  return null;
}

export function inferInteres(tags: string[], ad: string | null, tipoProyecto: unknown): Interes | null {
  const t = tags.map(strip);
  if (t.some((x) => x.includes("reforma"))) return "reforma";
  if (t.some((x) => x === "terreno")) return "terreno";
  if (t.some((x) => x.includes("casa modular") || x.includes("vivienda unifamiliar"))) return "casa_modular";
  const tp = strip(clean(tipoProyecto));
  if (tp.includes("casa modular") || tp.includes("presupuesto orientativo")) return "casa_modular";
  const a = strip(ad ?? "");
  if (a.includes("reforma")) return "reforma";
  if (/(casa|vivienda|modular|construye)/.test(a)) return "casa_modular";
  return null;
}

/** Pipefy no guarda motivo de pérdida útil: se deduce de las etiquetas; si no hay pistas, "otro". */
export function inferMotivoPerdida(tags: string[], interes: Interes | null): MotivoPerdida {
  const t = tags.map(strip);
  const has = (frag: string) => t.some((x) => x.includes(frag));
  if (has("no le interesa") || has("solo estaba mirando")) return "ya_no_le_interesa";
  if (has("no cualifica")) return "no_es_su_perfil";
  if (has("no coge llamadas") || has("no responde") || has("fuera de radar") || has("esperando respuesta")) return "sin_respuesta";
  if (has("rechazado")) return "precio";
  if (has("el lead va a la agencia")) return "otro";
  if (interes === "reforma") return "reforma";
  return "otro";
}

/** Nombres de anuncio con espacios o guiones distintos → forma única. */
export function normalizeAdName(raw: unknown): string | null {
  const s = clean(raw).replace(/\s*[–—-]\s*/g, " - ");
  return s || null;
}

export function splitTags(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];
  return String(raw).split(",").map((x) => clean(x)).filter(Boolean);
}

export { clean, strip };
