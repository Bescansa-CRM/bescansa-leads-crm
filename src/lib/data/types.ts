export const ETAPAS = ["nuevo", "contactado", "calificado", "visita", "propuesta", "negociacion", "ganado", "perdido"] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ETAPA_LABEL: Record<Etapa, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  calificado: "Calificado",
  visita: "Visita / reunión",
  propuesta: "Propuesta",
  negociacion: "Negociación",
  ganado: "Ganado",
  perdido: "Perdido",
};

// Un solo mapa etapa→tono semántico (colores existentes del design kit, ninguno nuevo).
// Badges e identidad de columna del Kanban salen de acá, para que nunca diverjan.
export const ETAPA_TONE: Record<Etapa, "brand" | "neutral" | "info" | "warning" | "good" | "critical"> = {
  nuevo: "brand",
  contactado: "neutral",
  calificado: "neutral",
  visita: "info",
  propuesta: "warning",
  negociacion: "warning",
  ganado: "good",
  perdido: "critical",
};

export const ETAPA_BADGE: Record<Etapa, string> = {
  nuevo: `badge-${ETAPA_TONE.nuevo}`,
  contactado: `badge-${ETAPA_TONE.contactado}`,
  calificado: `badge-${ETAPA_TONE.calificado}`,
  visita: `badge-${ETAPA_TONE.visita}`,
  propuesta: `badge-${ETAPA_TONE.propuesta}`,
  negociacion: `badge-${ETAPA_TONE.negociacion}`,
  ganado: `badge-${ETAPA_TONE.ganado}`,
  perdido: `badge-${ETAPA_TONE.perdido}`,
};

export const MOTIVOS_PERDIDA = [
  ["sin_respuesta", "Sin respuesta"],
  ["precio", "Precio"],
  ["sin_terreno", "Sin terreno"],
  ["no_es_su_perfil", "No es su perfil"],
  ["compro_a_otro", "Compró a otro"],
  ["reforma", "Buscaba una reforma"],
  ["ya_no_le_interesa", "Ya no le interesa"],
  ["duplicado", "Duplicado"],
  ["otro", "Otro"],
] as const;
export type MotivoPerdida = (typeof MOTIVOS_PERDIDA)[number][0];
export const MOTIVO_LABEL: Record<string, string> = Object.fromEntries(MOTIVOS_PERDIDA);

export const INTERES_LABEL: Record<string, string> = { casa_modular: "Casa modular", reforma: "Reforma", terreno: "Terreno", otro: "Otro" };
export const ETAPA_PROYECTO_LABEL: Record<string, string> = {
  solicita_informacion: "Solicita información",
  solo_informacion: "Solo información por ahora",
  tiene_terreno: "Tiene terreno, busca proyecto",
  explorando: "Explorando ideas",
  tiene_proyecto: "Tiene proyecto, quiere presupuesto",
  listo_para_empezar: "Listo para empezar",
};
export const TERRENO_LABEL: Record<string, string> = { propio: "Terreno propio", reservado: "Terreno reservado", buscando: "Busca terreno", sin_terreno: "Sin terreno" };

export type EventTipo = "nota" | "llamada" | "email" | "whatsapp" | "visita" | "cambio_etapa" | "asignacion" | "reingreso" | "importacion" | "sistema";

export interface UserRow { id: string; nombre: string; email: string; role: "admin" | "ventas"; }

export interface LeadRow {
  id: string;
  createdAt: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  municipio: string | null;
  etapa: Etapa;
  etapaDesde: string; // cuándo entró en la fase actual
  etapasAlcanzadas: Etapa[]; // fases por las que pasó alguna vez (historial)
  prioridad: "alta" | "normal" | "baja";
  ownerId: string | null;
  ownerName: string | null;
  interes: string | null;
  etapaProyecto: string | null;
  terreno: string | null;
  superficieRango: string | null;
  presupuestoRango: string | null;
  plazo: string | null;
  perfil: Record<string, string>;
  campaign: string | null;
  adset: string | null;
  ad: string | null;
  utmSource: string | null;
  firstContactAt: string | null;
  contactAttempts: number;
  nextActionAt: string | null;
  motivoPerdida: string | null;
  tags: string[];
  source: string;
  consentAt: string | null;
}

export interface EventRow { id: string; leadId: string; createdAt: string; tipo: EventTipo; detalle: string | null; authorName: string | null; efectivo: boolean | null; }
export interface TaskRow { id: string; leadId: string; leadName: string; titulo: string; dueAt: string | null; doneAt: string | null; ownerId: string | null; ownerName: string | null; }

export interface LeadFilters {
  q?: string;
  etapa?: Etapa;
  owner?: string; // id de usuario, o "sin" para sin responsable
  ad?: string;
  interes?: string;
  sinContactar?: boolean;
  incluirCerrados?: boolean;
}

export interface SpendRow { day: string; ad: string | null; campaign: string | null; spend: number; }

export interface LeadDetail { lead: LeadRow; events: EventRow[]; tasks: TaskRow[]; }

export interface HoyStats {
  sinContactar: number;        // en "nuevo" sin primer contacto
  sinContactarMas24h: number;
  tareasVencidas: number;
  tareasHoy: number;
  leadsUltimos7: number;
  contactadosEn24hPct: number | null;
}

/** Contrato que cumplen tanto el modo demostración como Supabase. */
export interface LeadsRepo {
  mode: "demo" | "supabase";
  listUsers(): Promise<UserRow[]>;
  listLeads(f?: LeadFilters): Promise<LeadRow[]>;
  getLead(id: string): Promise<LeadDetail | null>;
  moveStage(id: string, etapa: Etapa, motivo?: string): Promise<void>;
  addEvent(id: string, e: { tipo: EventTipo; detalle?: string; efectivo?: boolean }): Promise<void>;
  setOwner(id: string, ownerId: string | null): Promise<void>;
  listTasks(f?: { soloAbiertas?: boolean; owner?: string }): Promise<TaskRow[]>;
  completeTask(id: string): Promise<void>;
  hoyStats(): Promise<HoyStats>;
  listAds(): Promise<string[]>;
  listSpend(): Promise<SpendRow[]>;
  /** Sustituye el gasto de esos días y anuncios (o lo crea). Devuelve cuántas filas se guardaron. */
  addSpend(rows: { day: string; ad: string; spend: number; impressions?: number; clicks?: number }[]): Promise<number>;
}
