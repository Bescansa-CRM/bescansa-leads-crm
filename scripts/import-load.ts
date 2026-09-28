/**
 * Carga el plan de importación (data-private/import-plan.json) en Supabase mediante la función import_leads().
 * Es idempotente: se puede ejecutar varias veces sin duplicar leads.
 *
 * Requiere en .env.local (nunca se sube al repositorio):
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 *   npm run import:load -- [--dry-run]
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const dryRun = process.argv.includes("--dry-run");
const planPath = join(process.cwd(), "data-private", "import-plan.json");
if (!existsSync(planPath)) throw new Error("Falta data-private/import-plan.json: ejecuta antes `npm run import:preview`.");
const plan = JSON.parse(readFileSync(planPath, "utf8")) as { leads: unknown[]; stats: unknown };
console.log(`Plan: ${plan.leads.length} leads`, plan.stats);
if (dryRun) { console.log("--dry-run: no se escribe nada."); process.exit(0); }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const batchId = randomUUID();
const { error: batchError } = await supabase.from("import_batches").insert({ id: batchId, source: "pipefy+meta", filename: "import-plan.json", stats: plan.stats });
if (batchError) throw batchError;

const SIZE = 100;
let created = 0, skipped = 0;
for (let i = 0; i < plan.leads.length; i += SIZE) {
  const chunk = plan.leads.slice(i, i + SIZE);
  const { data, error } = await supabase.rpc("import_leads", { p_batch: batchId, p_items: chunk });
  if (error) throw new Error(`Lote ${i / SIZE + 1}: ${error.message}`);
  created += data.created; skipped += data.skipped;
  console.log(`  ${Math.min(i + SIZE, plan.leads.length)}/${plan.leads.length}  (creados ${created}, ya existían ${skipped})`);
}
await supabase.from("import_batches").update({ stats: { ...(plan.stats as object), created, skipped } }).eq("id", batchId);
console.log(`Listo. Creados ${created}, ya existían ${skipped}. Lote ${batchId}.`);
