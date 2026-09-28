import { sendEmail } from "./email/send.ts";
import type { LeadForEmail } from "./email/templates.ts";
import { ALERTAS_POR_DEFECTO, HORARIO_POR_DEFECTO, type Alertas, type DigestDeps, type Horario, type SlaDeps, type SlaRow, type UnattendedRow } from "./sla.ts";
import { createAdminClient } from "./supabase/admin.ts";

/** Construye las dependencias reales (Supabase + Resend) para las tareas programadas. */
export async function buildRuntimeDeps(): Promise<Omit<SlaDeps, "pending" | "lead"> & Pick<DigestDeps, "unattended"> & { pending: SlaDeps["pending"]; lead: SlaDeps["lead"] }> {
  const db = createAdminClient();
  const { data: settings } = await db.from("app_settings").select("key, value").in("key", ["horario", "alertas"]);
  const get = <T,>(key: string, fallback: T): T => ({ ...fallback, ...((settings ?? []).find((s) => s.key === key)?.value as object | undefined) }) as T;
  const horario = get<Horario>("horario", HORARIO_POR_DEFECTO);
  const alertas = get<Alertas>("alertas", ALERTAS_POR_DEFECTO);

  return {
    now: new Date(),
    appUrl: process.env.APP_URL ?? "http://localhost:3000",
    horario,
    alertas,
    async pending(minReminder, minEscalate) {
      const { data, error } = await db.rpc("pending_sla_alerts", { p_min_reminder: minReminder, p_min_escalate: minEscalate });
      if (error) throw new Error(error.message);
      return (data ?? []) as SlaRow[];
    },
    async unattended() {
      const { data, error } = await db.rpc("unattended_leads", { p_limit: 200 });
      if (error) throw new Error(error.message);
      return (data ?? []) as UnattendedRow[];
    },
    async lead(id): Promise<LeadForEmail | null> {
      const { data } = await db.from("leads").select("id, nombre, apellidos, email, telefono, municipio, ads(name)").eq("id", id).maybeSingle();
      if (!data) return null;
      const ad = data.ads as { name?: string } | { name?: string }[] | null;
      return { id: data.id, nombre: data.nombre, apellidos: data.apellidos, email: data.email, telefono: data.telefono, municipio: data.municipio, ad: Array.isArray(ad) ? ad[0]?.name : ad?.name };
    },
    send: (msg) => sendEmail(msg),
    async log(e) {
      await db.from("notifications_log").insert({
        lead_id: e.lead_id, tipo: e.tipo, to_email: e.to_email, status: e.ok ? "enviado" : e.skipped ? "pendiente" : "error",
        error: e.error ?? null, sent_at: e.ok ? new Date().toISOString() : null,
      });
    },
  };
}
