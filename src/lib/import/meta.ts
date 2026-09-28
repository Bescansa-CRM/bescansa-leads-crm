import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { normalizeEmail, normalizePhone } from "../phone.ts";
import { clean } from "./mapping.ts";
import { metaCsvDateToIso } from "./time.ts";
import type { SourceRecord } from "./types.ts";

export interface MetaParse {
  records: SourceRecord[];
  skipped: { row: number; reason: string }[];
}

/** Lee el CSV del Centro de clientes potenciales de Meta ("Descargar clientes potenciales"). */
export function parseMetaCsv(path: string): MetaParse {
  const rows: Record<string, string>[] = parse(readFileSync(path), { columns: true, bom: true, skip_empty_lines: true, relax_column_count: true });
  const records: SourceRecord[] = [];
  const skipped: MetaParse["skipped"] = [];
  rows.forEach((r, idx) => {
    const createdAt = metaCsvDateToIso(r["Fecha de creación"]);
    if (!createdAt) { skipped.push({ row: idx + 2, reason: "fecha no reconocida" }); return; }
    const email = normalizeEmail(r["Correo electrónico"]);
    const telefono = normalizePhone(r["Teléfono"] || r["Número de WhatsApp"] || r["Número de teléfono secundario"]);
    if (!email && !telefono) { skipped.push({ row: idx + 2, reason: "sin teléfono ni email válidos" }); return; }
    records.push({
      source: "import_meta",
      externalId: `meta:${createdAt}:${telefono ?? email}`,
      createdAt,
      nombre: clean(r["Nombre"]) || "Sin nombre",
      apellidos: null,
      email,
      telefono,
      etapa: "nuevo",
      stageHistory: [{ etapa: "nuevo", enteredAt: createdAt }],
      interes: null,
      etapaProyecto: null,
      terreno: null,
      motivoPerdida: null,
      campaign: null,
      adset: null,
      ad: null,
      tags: [],
      notes: [],
      raw: { meta_form: clean(r["Formulario"]) || null, meta_origen: clean(r["Origen"]) || null },
    });
  });
  return { records, skipped };
}
