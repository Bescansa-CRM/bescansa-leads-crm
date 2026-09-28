/**
 * Vista previa de la importación (no toca ninguna base de datos).
 * Lee la exportación de Pipefy y el CSV de Meta, los fusiona y escribe el plan en data-private/import-plan.json.
 * Solo imprime estadísticas: nunca datos personales.
 *
 *   npm run import:preview -- [pipefy.xlsx] [meta.csv]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mergeRecords } from "../src/lib/import/merge.ts";
import { parseMetaCsv } from "../src/lib/import/meta.ts";
import { parsePipefyXlsx } from "../src/lib/import/pipefy.ts";

const dir = join(process.cwd(), "data-private");
const pipefyPath = process.argv[2] ?? join(dir, "pipefy_leads_full_2026-09-25.xlsx");
const metaPath = process.argv[3] ?? join(dir, "meta_leads_export_2026-09-25.csv");

const pipefy = await parsePipefyXlsx(pipefyPath);
const meta = parseMetaCsv(metaPath);
const { leads, stats } = mergeRecords([...pipefy.records, ...meta.records]);

const count = <T>(xs: T[], f: (x: T) => string | null) => {
  const m: Record<string, number> = {};
  for (const x of xs) { const k = f(x) ?? "(sin dato)"; m[k] = (m[k] ?? 0) + 1; }
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
};

console.log("── Entrada ──");
console.log("Pipefy: leídos", pipefy.records.length, "| omitidos", pipefy.skipped.length, count(pipefy.skipped, (s) => s.reason));
console.log("Meta:   leídos", meta.records.length, "| omitidos", meta.skipped.length, count(meta.skipped, (s) => s.reason));
console.log("── Resultado de la fusión ──");
console.log(stats);
console.log("── Leads solo en Meta (nunca llegaron a Pipefy) ──", stats.metaOnly);
console.log("── Por interés ──", count(leads, (l) => l.interes));
console.log("── Por etapa de proyecto ──", count(leads, (l) => l.etapaProyecto));
console.log("── Motivos de pérdida (deducidos) ──", count(leads.filter((l) => l.etapa === "perdido"), (l) => l.motivoPerdida));
console.log("── Anuncios ──", count(leads, (l) => l.ad));
console.log("── Campañas ──", count(leads, (l) => l.campaign));
console.log("── Prioridad ──", count(leads, (l) => l.prioridad));
console.log("── Sin teléfono válido ──", leads.filter((l) => !l.telefono).length, "| sin email válido:", leads.filter((l) => !l.email).length);

mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "import-plan.json"), JSON.stringify({ generatedAt: new Date().toISOString(), stats, leads }, null, 1));
writeFileSync(join(dir, "import-omitidos.json"), JSON.stringify({ pipefy: pipefy.skipped, meta: meta.skipped }, null, 1));
console.log("\nPlan guardado en data-private/import-plan.json (contiene datos personales; no compartir).");
