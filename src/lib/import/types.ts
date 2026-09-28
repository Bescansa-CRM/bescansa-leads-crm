export const ETAPAS = ["nuevo", "contactado", "calificado", "visita", "propuesta", "negociacion", "ganado", "perdido"] as const;
export type Etapa = (typeof ETAPAS)[number];

export type MotivoPerdida =
  | "sin_respuesta" | "precio" | "sin_terreno" | "no_es_su_perfil" | "compro_a_otro"
  | "reforma" | "ya_no_le_interesa" | "duplicado" | "otro";

export type Interes = "casa_modular" | "reforma" | "terreno" | "otro";
export type EtapaProyecto = "solicita_informacion" | "solo_informacion" | "tiene_terreno" | "explorando" | "tiene_proyecto" | "listo_para_empezar";

/** Registro de origen ya normalizado, antes de fusionar fuentes. */
export interface SourceRecord {
  source: "import_pipefy" | "import_meta";
  externalId: string;
  createdAt: string; // ISO UTC
  updatedAt?: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  etapa: Etapa;
  stageHistory: { etapa: Etapa; enteredAt: string }[];
  interes: Interes | null;
  etapaProyecto: EtapaProyecto | null;
  terreno: "propio" | "reservado" | "buscando" | "sin_terreno" | null;
  motivoPerdida: MotivoPerdida | null;
  campaign: string | null;
  adset: string | null;
  ad: string | null;
  tags: string[];
  notes: { at: string; text: string }[];
  raw: Record<string, unknown>;
}

export interface PlannedLead {
  source: SourceRecord["source"];
  externalId: string;
  createdAt: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  etapa: Etapa;
  prioridad: "alta" | "normal" | "baja";
  interes: Interes | null;
  etapaProyecto: EtapaProyecto | null;
  terreno: SourceRecord["terreno"];
  motivoPerdida: MotivoPerdida | null;
  campaign: string | null;
  adset: string | null;
  ad: string | null;
  tags: string[];
  stageHistory: { etapa: Etapa; enteredAt: string }[];
  notes: { at: string; text: string }[];
  mergedFrom: string[]; // ids de origen fusionados en este lead
  raw: Record<string, unknown>;
}
