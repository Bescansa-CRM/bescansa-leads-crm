"use server";

import { revalidatePath } from "next/cache";
import { getRepo } from "@/lib/data/repo";
import { ETAPAS, MOTIVOS_PERDIDA, type Etapa, type EventTipo } from "@/lib/data/types";

const TIPOS_MANUALES: EventTipo[] = ["nota", "llamada", "email", "whatsapp", "visita"];

export async function moveStageAction(id: string, etapa: string, motivo?: string): Promise<{ ok: boolean; error?: string }> {
  if (!(ETAPAS as readonly string[]).includes(etapa)) return { ok: false, error: "Fase no válida" };
  if (etapa === "perdido" && !MOTIVOS_PERDIDA.some(([k]) => k === motivo)) return { ok: false, error: "Elige un motivo de pérdida" };
  try {
    await (await getRepo()).moveStage(id, etapa as Etapa, motivo);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo mover el lead" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addEventAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const tipo = String(formData.get("tipo") ?? "nota") as EventTipo;
  const detalle = String(formData.get("detalle") ?? "").trim().slice(0, 2000);
  const efectivo = formData.get("efectivo") === "si" ? true : formData.get("efectivo") === "no" ? false : undefined;
  if (!id || !TIPOS_MANUALES.includes(tipo)) return;
  if (tipo === "nota" && !detalle) return;
  await (await getRepo()).addEvent(id, { tipo, detalle: detalle || undefined, efectivo });
  revalidatePath("/", "layout");
}

export async function setOwnerAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const owner = String(formData.get("owner") ?? "");
  if (!id) return;
  await (await getRepo()).setOwner(id, owner || null);
  revalidatePath("/", "layout");
}

export async function completeTaskAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await (await getRepo()).completeTask(id);
  revalidatePath("/", "layout");
}
