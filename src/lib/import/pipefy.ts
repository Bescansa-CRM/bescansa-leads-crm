import ExcelJS from "exceljs";
import { normalizeEmail, normalizePhone } from "../phone.ts";
import { clean, inferInteres, inferMotivoPerdida, mapEtapaProyecto, mapFase, mapFaseDeColumna, mapTerreno, normalizeAdName, splitTags } from "./mapping.ts";
import { excelWallToIso } from "./time.ts";
import type { Etapa, SourceRecord } from "./types.ts";

function cellValue(v: ExcelJS.CellValue): unknown {
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const o = v as { richText?: { text: string }[]; text?: string; result?: unknown; hyperlink?: string };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.text !== undefined) return o.text;
    if (o.result !== undefined) return o.result;
    if (o.hyperlink) return o.hyperlink;
  }
  return v;
}

export interface PipefyParse {
  records: SourceRecord[];
  skipped: { row: number; reason: string; pipefyId: string }[];
}

/** Lee la exportación "Leads Bescansa" de Pipefy (con las columnas de primera entrada por fase). */
export async function parsePipefyXlsx(path: string): Promise<PipefyParse> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.worksheets[0];
  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (c, n) => { headers[n] = clean(cellValue(c.value)); });
  const col = (name: string) => headers.findIndex((h) => h === name);
  const faseCols = headers.map((h, i) => ({ i, etapa: h ? mapFaseDeColumna(h) : null })).filter((x) => x.etapa);

  const records: SourceRecord[] = [];
  const skipped: PipefyParse["skipped"] = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (name: string) => { const i = col(name); return i > 0 ? cellValue(row.getCell(i).value) : undefined; };
    const pipefyId = clean(get("ID"));
    const etapa = mapFase(get("Fase actual"));
    if (!etapa) { skipped.push({ row: rowNumber, reason: "fase desconocida", pipefyId }); return; }

    const createdAt = excelWallToIso(get("Creado el"));
    if (!createdAt) { skipped.push({ row: rowNumber, reason: "sin fecha de creación", pipefyId }); return; }
    const updatedAt = excelWallToIso(get("Actualizado el")) ?? createdAt;

    const email = normalizeEmail(get("Email profissional"));
    const telefono = normalizePhone(get("Telefone"));

    const tags = splitTags(get("Etiquetas"));
    if (!email && !telefono) tags.push("sin-datos-de-contacto"); // se conserva: puede ser negocio real (p. ej. un cierre)
    const ad = normalizeAdName(get("Nombre del Ad"));
    const tipoProyecto = get("Tipo de proyecto");
    const calificacion = get("Pregunta de Calificación");
    const interes = inferInteres(tags, ad, tipoProyecto);

    // primera entrada en cada fase nueva (la más antigua de las fases de Pipefy que le corresponden)
    const hist = new Map<Etapa, string>();
    for (const { i, etapa: e } of faseCols) {
      const iso = excelWallToIso(row.getCell(i).value ? cellValue(row.getCell(i).value) : null);
      if (iso && e) { const prev = hist.get(e); if (!prev || iso < prev) hist.set(e, iso); }
    }
    if (!hist.has("nuevo")) hist.set("nuevo", createdAt);
    if (!hist.has(etapa)) hist.set(etapa, updatedAt);

    const notes: SourceRecord["notes"] = [];
    const ultimo = clean(get("Último comentario"));
    if (ultimo) notes.push({ at: updatedAt, text: `Último comentario en Pipefy: ${ultimo}` });
    const notas = clean(get("Notas sobre o negócio"));
    if (notas) notes.push({ at: createdAt, text: `Notas en Pipefy: ${notas}` });
    if (!telefono && clean(get("Telefone"))) notes.push({ at: createdAt, text: `Teléfono original no válido: ${clean(get("Telefone"))}` });

    records.push({
      source: "import_pipefy",
      externalId: pipefyId || `pipefy-row-${rowNumber}`,
      createdAt,
      updatedAt,
      nombre: clean(get("Nome do contato")) || "Sin nombre",
      apellidos: clean(get("Apellidos")) || null,
      email,
      telefono,
      etapa,
      stageHistory: [...hist].map(([e, enteredAt]) => ({ etapa: e, enteredAt })).sort((a, b) => a.enteredAt.localeCompare(b.enteredAt)),
      interes,
      etapaProyecto: mapEtapaProyecto(calificacion),
      terreno: mapTerreno(tipoProyecto, calificacion),
      motivoPerdida: etapa === "perdido" ? inferMotivoPerdida(tags, interes) : null,
      campaign: clean(get("Nombre de la campaña")) || null,
      adset: clean(get("Nombre del Conjunto")) || null,
      ad,
      tags,
      notes,
      raw: {
        pipefy_id: pipefyId,
        tipo_proyecto: clean(tipoProyecto) || null,
        pregunta_calificacion: clean(calificacion) || null,
        fase_original: clean(get("Fase actual")),
      },
    });
  });
  return { records, skipped };
}
