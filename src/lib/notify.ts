import { sendEmail } from "./email/send.ts";
import { leadConfirmation, newLeadAlert, type LeadForEmail } from "./email/templates.ts";
import { createAdminClient } from "./supabase/admin.ts";

interface IngestResult { lead_id?: string; created?: boolean; duplicate?: boolean; owner_id?: string | null }

/**
 * Avisos tras recibir un lead: al responsable y a los correos de administración (ajuste `alertas.emails_admin`),
 * y, si está activado (SEND_LEAD_CONFIRMATION=1), una confirmación al cliente.
 * Nunca lanza: un fallo de correo no debe impedir que el lead quede guardado.
 */
export async function notifyLeadReceived(result: IngestResult): Promise<void> {
  try {
    if (!result.lead_id || (!result.created && !result.duplicate)) return;
    const db = createAdminClient();
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    const { data: row } = await db
      .from("leads")
      .select("id, nombre, apellidos, email, telefono, municipio, interes, etapa_proyecto, presupuesto_rango, owner_id, ads(name)")
      .eq("id", result.lead_id)
      .single();
    if (!row) return;
    const ad = (row.ads as { name?: string } | { name?: string }[] | null);
    const lead: LeadForEmail = {
      id: row.id, nombre: row.nombre, apellidos: row.apellidos, email: row.email, telefono: row.telefono,
      municipio: row.municipio, interes: row.interes, etapaProyecto: row.etapa_proyecto, presupuestoRango: row.presupuesto_rango,
      ad: Array.isArray(ad) ? ad[0]?.name : ad?.name,
    };

    const recipients = new Set<string>();
    if (row.owner_id) {
      const { data: owner } = await db.from("profiles").select("email").eq("id", row.owner_id).single();
      if (owner?.email) recipients.add(owner.email);
    }
    const { data: alertas } = await db.from("app_settings").select("value").eq("key", "alertas").single();
    for (const e of (alertas?.value as { emails_admin?: string[] } | undefined)?.emails_admin ?? []) recipients.add(e);

    const log = async (tipo: string, to: string, r: { ok: boolean; skipped?: boolean; error?: string }) => {
      await db.from("notifications_log").insert({
        lead_id: lead.id, tipo, to_email: to, status: r.ok ? "enviado" : r.skipped ? "pendiente" : "error",
        error: r.error ?? null, sent_at: r.ok ? new Date().toISOString() : null,
      });
    };

    for (const to of recipients) {
      const r = await sendEmail(newLeadAlert(lead, appUrl, to, { duplicate: result.duplicate }));
      await log(result.duplicate ? "reingreso" : "lead_nuevo", to, r);
    }

    if (result.created && process.env.SEND_LEAD_CONFIRMATION === "1") {
      const msg = leadConfirmation(lead, {
        telefonoContacto: process.env.CONTACT_PHONE ?? "981 91 22 29",
        web: process.env.PUBLIC_WEB_URL ?? "https://estudiobescansa.com",
        privacidadUrl: process.env.PRIVACY_URL ?? "https://estudiobescansa.com/privacidad",
      });
      if (msg) await log("confirmacion_cliente", msg.to, await sendEmail(msg));
    }
  } catch (e) {
    console.error("notifyLeadReceived falló", e instanceof Error ? e.message : e);
  }
}
