import { dailyDigest, slaReminder, type EmailMessage, type LeadForEmail } from "./email/templates.ts";

export interface Horario { dias: number[]; desde: string; hasta: string; zona: string } // dias: 1 = lunes … 7 = domingo
export interface Alertas { minutos_sin_contactar: number; minutos_escalado: number; emails_admin: string[] }

export const HORARIO_POR_DEFECTO: Horario = { dias: [1, 2, 3, 4, 5], desde: "09:00", hasta: "19:00", zona: "Europe/Madrid" };
export const ALERTAS_POR_DEFECTO: Alertas = { minutos_sin_contactar: 30, minutos_escalado: 120, emails_admin: [] };

const DIAS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** ¿Estamos dentro del horario laboral configurado? (en la zona horaria del negocio) */
export function isBusinessHours(now: Date, h: Horario = HORARIO_POR_DEFECTO): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: h.zona, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const dia = DIAS[parts.find((p) => p.type === "weekday")?.value ?? ""] ?? 0;
  const hhmm = `${parts.find((p) => p.type === "hour")?.value}:${parts.find((p) => p.type === "minute")?.value}`;
  return h.dias.includes(dia) && hhmm >= h.desde && hhmm < h.hasta;
}

export interface SlaRow { lead_id: string; age_minutes: number; owner_id: string | null; owner_email: string | null; send_reminder: boolean; send_escalation: boolean }
export interface UnattendedRow { lead_id: string; nombre: string; apellidos: string | null; telefono: string | null; email: string | null; hours_waiting: number }

/** Dependencias externas (base de datos y correo) para poder probar la lógica sin red. */
export interface SlaDeps {
  now: Date;
  appUrl: string;
  horario: Horario;
  alertas: Alertas;
  pending(minReminder: number, minEscalate: number): Promise<SlaRow[]>;
  lead(id: string): Promise<LeadForEmail | null>;
  send(msg: EmailMessage): Promise<{ ok: boolean; skipped?: boolean; error?: string }>;
  log(entry: { lead_id: string | null; tipo: string; to_email: string; ok: boolean; skipped?: boolean; error?: string }): Promise<void>;
}

export interface SlaSummary { skipped?: string; recordatorios: number; escalados: number; errores: number }

/** Envía los recordatorios pendientes. Fuera del horario laboral no hace nada (los avisos se enviarán al abrir). */
export async function runSlaCheck(d: SlaDeps): Promise<SlaSummary> {
  const out: SlaSummary = { recordatorios: 0, escalados: 0, errores: 0 };
  if (!isBusinessHours(d.now, d.horario)) return { ...out, skipped: "fuera de horario laboral" };

  const rows = await d.pending(d.alertas.minutos_sin_contactar, d.alertas.minutos_escalado);
  for (const r of rows) {
    const lead = await d.lead(r.lead_id);
    if (!lead) continue;

    if (r.send_reminder && r.owner_email) {
      const res = await d.send(slaReminder(lead, r.age_minutes, d.appUrl, r.owner_email));
      await d.log({ lead_id: r.lead_id, tipo: "sla_recordatorio", to_email: r.owner_email, ...res });
      if (res.ok) out.recordatorios++; else if (!res.skipped) out.errores++;
    } else if (r.send_reminder && !r.owner_email) {
      // Sin responsable activo: el recordatorio va a administración junto con el escalado
      for (const to of d.alertas.emails_admin) {
        const res = await d.send(slaReminder(lead, r.age_minutes, d.appUrl, to, true));
        await d.log({ lead_id: r.lead_id, tipo: "sla_recordatorio", to_email: to, ...res });
        if (res.ok) out.recordatorios++; else if (!res.skipped) out.errores++;
      }
    }

    if (r.send_escalation) {
      for (const to of d.alertas.emails_admin) {
        const res = await d.send(slaReminder(lead, r.age_minutes, d.appUrl, to, true));
        await d.log({ lead_id: r.lead_id, tipo: "sla_escalado", to_email: to, ...res });
        if (res.ok) out.escalados++; else if (!res.skipped) out.errores++;
      }
    }
  }
  return out;
}

export interface DigestDeps {
  now: Date;
  appUrl: string;
  horario: Horario;
  alertas: Alertas;
  unattended(): Promise<UnattendedRow[]>;
  send(msg: EmailMessage): Promise<{ ok: boolean; skipped?: boolean; error?: string }>;
  log(entry: { lead_id: string | null; tipo: string; to_email: string; ok: boolean; skipped?: boolean; error?: string }): Promise<void>;
}

/** Resumen diario de leads sin contactar para administración (solo en días laborables). */
export async function runDailyDigest(d: DigestDeps): Promise<{ skipped?: string; enviados: number }> {
  const dia = new Intl.DateTimeFormat("en-GB", { timeZone: d.horario.zona, weekday: "short" }).format(d.now);
  if (!d.horario.dias.includes(DIAS[dia] ?? 0)) return { skipped: "día no laborable", enviados: 0 };
  if (d.alertas.emails_admin.length === 0) return { skipped: "sin correos de administración configurados", enviados: 0 };
  const rows = await d.unattended();
  const items = rows.map((r) => ({ lead: { id: r.lead_id, nombre: r.nombre, apellidos: r.apellidos, telefono: r.telefono, email: r.email }, horas: Number(r.hours_waiting) }));
  let enviados = 0;
  for (const to of d.alertas.emails_admin) {
    const msg = dailyDigest(items, d.appUrl, to);
    if (!msg) return { skipped: "no hay leads sin contactar", enviados };
    const res = await d.send(msg);
    await d.log({ lead_id: null, tipo: "resumen_diario", to_email: to, ...res });
    if (res.ok) enviados++;
  }
  return { enviados };
}
