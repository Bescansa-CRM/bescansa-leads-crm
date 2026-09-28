import type { EmailMessage } from "./templates.ts";

export interface SendResult { ok: boolean; id?: string; skipped?: boolean; error?: string }

export interface SendDeps {
  apiKey?: string;
  from?: string;
  fetchImpl?: typeof fetch;
}

/** Envía un correo con la API de Resend. Sin clave configurada no falla: se omite y se avisa en el resultado. */
export async function sendEmail(msg: EmailMessage, deps: SendDeps = {}): Promise<SendResult> {
  const apiKey = deps.apiKey ?? process.env.RESEND_API_KEY;
  const from = deps.from ?? process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, skipped: true, error: "Resend sin configurar (RESEND_API_KEY / EMAIL_FROM)" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(msg.to)) return { ok: false, error: "Destinatario no válido" };
  try {
    const res = await (deps.fetchImpl ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: data.message ?? `Resend respondió ${res.status}` };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red" };
  }
}
