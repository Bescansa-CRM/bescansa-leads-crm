"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/data/repo";
import { parseAmount, parseDay, parseSpendCsv } from "@/lib/spend-csv";

const MAX_FILE_BYTES = 2_000_000;
const go = (params: Record<string, string>) => redirect(`/gasto?${new URLSearchParams(params)}`);

export async function addSpendAction(formData: FormData): Promise<void> {
  const { repo, user } = await getContext();
  if (user.role !== "admin") go({ err: "Solo un administrador puede cargar gasto." });
  const day = parseDay(String(formData.get("day") ?? ""));
  const ad = String(formData.get("ad") ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const spend = parseAmount(String(formData.get("spend") ?? ""));
  if (!day || !ad || spend === null || spend < 0) go({ err: "Revisa la fecha, el anuncio y el importe." });
  await repo.addSpend([{ day: day!, ad, spend: Math.round(spend! * 100) / 100 }]);
  revalidatePath("/", "layout");
  go({ ok: "1 fila guardada." });
}

export async function importSpendCsvAction(formData: FormData): Promise<void> {
  const { repo, user } = await getContext();
  if (user.role !== "admin") go({ err: "Solo un administrador puede cargar gasto." });
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) go({ err: "Elige un archivo CSV." });
  if ((file as File).size > MAX_FILE_BYTES) go({ err: "El archivo es demasiado grande (máximo 2 MB)." });
  const { rows, errors } = parseSpendCsv(await (file as File).text());
  if (rows.length === 0) go({ err: errors[0] ?? "No se encontraron filas de gasto en el archivo." });
  const saved = await repo.addSpend(rows);
  revalidatePath("/", "layout");
  go({ ok: `${saved} filas guardadas.`, ...(errors.length ? { aviso: `${errors.length} filas se omitieron: ${errors.slice(0, 3).join(" · ")}` } : {}) });
}
