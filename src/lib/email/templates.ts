export interface EmailMessage { to: string; subject: string; html: string; text: string }

export interface LeadForEmail {
  id: string;
  nombre: string;
  apellidos?: string | null;
  email?: string | null;
  telefono?: string | null;
  ad?: string | null;
  campaign?: string | null;
  interes?: string | null;
  etapaProyecto?: string | null;
  presupuestoRango?: string | null;
  municipio?: string | null;
  createdAt?: string;
}

export const esc = (s: unknown): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const full = (l: LeadForEmail) => `${l.nombre} ${l.apellidos ?? ""}`.trim();

const shell = (title: string, body: string, footer = "") => `<!doctype html><html lang="es"><body style="margin:0;background:#f4f7f7;font-family:Arial,Helvetica,sans-serif;color:#171817">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #dfe6e7;border-radius:12px">
<tr><td style="padding:20px 24px;border-bottom:3px solid #5db1bd;font-size:13px;letter-spacing:.08em;color:#347f89;font-weight:bold">ESTUDIO BESCANSA</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 14px;font-size:20px;line-height:1.3">${esc(title)}</h1>${body}</td></tr>
${footer ? `<tr><td style="padding:14px 24px;border-top:1px solid #dfe6e7;font-size:12px;color:#657075">${footer}</td></tr>` : ""}
</table></td></tr></table></body></html>`;

const button = (href: string, label: string) =>
  `<p style="margin:20px 0 0"><a href="${esc(href)}" style="display:inline-block;background:#5db1bd;color:#fff;text-decoration:none;font-weight:bold;padding:11px 18px;border-radius:8px">${esc(label)}</a></p>`;

const row = (k: string, v: unknown) => (v ? `<tr><td style="padding:4px 12px 4px 0;color:#657075;font-size:14px">${esc(k)}</td><td style="padding:4px 0;font-size:14px">${esc(v)}</td></tr>` : "");

/** Aviso al equipo de que ha entrado un lead nuevo. */
export function newLeadAlert(l: LeadForEmail, appUrl: string, to: string, opts: { duplicate?: boolean } = {}): EmailMessage {
  const url = `${appUrl.replace(/\/$/, "")}/leads/${l.id}`;
  const title = opts.duplicate ? `Ha vuelto a escribir: ${full(l)}` : `Nuevo lead: ${full(l)}`;
  const body = `<p style="margin:0 0 12px;font-size:15px">${opts.duplicate ? "Este contacto ya existía y ha enviado el formulario otra vez." : "Ha entrado un lead nuevo. Cuanto antes se le contacte, más probabilidades hay de cerrar."}</p>
<table role="presentation" cellpadding="0" cellspacing="0">${row("Nombre", full(l))}${row("Teléfono", l.telefono)}${row("Email", l.email)}${row("Municipio", l.municipio)}${row("Interés", l.interes)}${row("Proyecto", l.etapaProyecto)}${row("Presupuesto", l.presupuestoRango)}${row("Anuncio", l.ad)}</table>${button(url, "Abrir el lead")}`;
  const text = [title, "", `Teléfono: ${l.telefono ?? "—"}`, `Email: ${l.email ?? "—"}`, l.ad ? `Anuncio: ${l.ad}` : "", "", `Abrir: ${url}`].filter((x) => x !== "").join("\n");
  return { to, subject: `${opts.duplicate ? "↩︎" : "🔔"} ${title}`, html: shell(title, body), text };
}

/** Recordatorio cuando un lead lleva demasiado tiempo sin contactar. */
export function slaReminder(l: LeadForEmail, minutos: number, appUrl: string, to: string, escalated = false): EmailMessage {
  const url = `${appUrl.replace(/\/$/, "")}/leads/${l.id}`;
  const horas = minutos >= 120 ? `${Math.round(minutos / 60)} horas` : `${minutos} minutos`;
  const title = escalated ? `Sin atender desde hace ${horas}: ${full(l)}` : `Recordatorio: contactar a ${full(l)}`;
  const body = `<p style="margin:0 0 12px;font-size:15px">${escalated ? "Este lead sigue sin ningún contacto y se avisa a la administración." : "Este lead sigue sin ningún contacto."} Lleva <strong>${esc(horas)}</strong> esperando.</p>
<table role="presentation" cellpadding="0" cellspacing="0">${row("Teléfono", l.telefono)}${row("Email", l.email)}${row("Anuncio", l.ad)}</table>${button(url, "Abrir el lead")}`;
  return { to, subject: `⏰ ${title}`, html: shell(title, body), text: `${title}\nLleva ${horas} sin contacto.\n${url}` };
}

/** Confirmación al cliente que ha rellenado el formulario. */
export function leadConfirmation(l: LeadForEmail, opts: { telefonoContacto: string; web: string; privacidadUrl: string }): EmailMessage | null {
  if (!l.email) return null;
  const nombre = l.nombre.split(" ")[0];
  const body = `<p style="margin:0 0 12px;font-size:15px">Hola ${esc(nombre)}, hemos recibido tu solicitud de información sobre una casa modular.</p>
<p style="margin:0 0 12px;font-size:15px">Una persona de nuestro equipo te contactará en breve, en horario laboral (de lunes a viernes). Si prefieres hablar ya, puedes llamarnos al <strong>${esc(opts.telefonoContacto)}</strong>.</p>
<p style="margin:0;font-size:15px">Mientras tanto, puedes ver nuestras casas realizadas en <a href="${esc(opts.web)}" style="color:#347f89">${esc(opts.web.replace(/^https?:\/\//, ""))}</a>.</p>`;
  const footer = `Has recibido este mensaje porque solicitaste información a Estudio Bescansa. Puedes consultar cómo tratamos tus datos en nuestra <a href="${esc(opts.privacidadUrl)}" style="color:#657075">política de privacidad</a>. Si no fuiste tú, ignora este correo.`;
  return {
    to: l.email,
    subject: "Hemos recibido tu solicitud · Estudio Bescansa",
    html: shell("Hemos recibido tu solicitud", body, footer),
    text: `Hola ${nombre}, hemos recibido tu solicitud de información sobre una casa modular. Te contactaremos en breve (lunes a viernes). Teléfono: ${opts.telefonoContacto}. Política de privacidad: ${opts.privacidadUrl}`,
  };
}

/** Resumen diario de leads sin contactar (para administración). */
export function dailyDigest(items: { lead: LeadForEmail; horas: number }[], appUrl: string, to: string): EmailMessage | null {
  if (items.length === 0) return null;
  const base = appUrl.replace(/\/$/, "");
  const rows = items.slice(0, 30).map(({ lead, horas }) =>
    `<tr><td style="padding:5px 10px 5px 0;font-size:14px"><a href="${esc(`${base}/leads/${lead.id}`)}" style="color:#347f89">${esc(full(lead))}</a></td><td style="padding:5px 10px;font-size:14px;color:#657075">${esc(lead.telefono ?? "—")}</td><td style="padding:5px 0;font-size:14px;text-align:right">${esc(horas >= 48 ? `${Math.round(horas / 24)} d` : `${Math.round(horas)} h`)}</td></tr>`).join("");
  const title = `${items.length} lead${items.length === 1 ? "" : "s"} sin contactar`;
  const body = `<p style="margin:0 0 12px;font-size:15px">Estos leads siguen sin ningún contacto:</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${items.length > 30 ? `<p style="font-size:13px;color:#657075">Y ${items.length - 30} más.</p>` : ""}${button(`${base}/leads?sinContactar=1`, "Ver todos")}`;
  return { to, subject: `📋 ${title}`, html: shell(title, body), text: `${title}\n${items.slice(0, 30).map((i) => `- ${full(i.lead)} (${i.lead.telefono ?? "—"})`).join("\n")}\n${base}/leads?sinContactar=1` };
}
