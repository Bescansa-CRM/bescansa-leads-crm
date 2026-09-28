import { test } from "node:test";
import assert from "node:assert/strict";
import { sendEmail } from "../src/lib/email/send.ts";
import { dailyDigest, esc, leadConfirmation, newLeadAlert, slaReminder } from "../src/lib/email/templates.ts";

const lead = { id: "abc", nombre: "Ana", apellidos: "<b>Pérez</b>", email: "ana@x.es", telefono: "+34600000001", ad: "AD01 - CASAS", presupuestoRango: "150.000–200.000 €" };

test("plantillas: escapan HTML de los datos del lead", () => {
  const m = newLeadAlert(lead, "https://crm.test/", "equipo@x.es");
  assert.ok(!m.html.includes("<b>Pérez</b>"), "el HTML del lead no debe pasar tal cual");
  assert.ok(m.html.includes("&lt;b&gt;Pérez&lt;/b&gt;"));
  assert.equal(esc(`"<&>'`), "&quot;&lt;&amp;&gt;&#39;");
});

test("aviso de lead nuevo: enlace a la ficha, sin barra doble, y versión de texto", () => {
  const m = newLeadAlert(lead, "https://crm.test/", "equipo@x.es");
  assert.equal(m.to, "equipo@x.es");
  assert.ok(m.html.includes("https://crm.test/leads/abc"));
  assert.ok(!m.html.includes("test//leads"));
  assert.ok(m.text.includes("+34600000001"));
  assert.ok(m.subject.includes("Nuevo lead"));
  assert.ok(newLeadAlert(lead, "https://crm.test", "a@b.es", { duplicate: true }).subject.includes("Ha vuelto a escribir"));
});

test("recordatorio: usa horas a partir de 2 h y distingue el escalado", () => {
  assert.ok(slaReminder(lead, 30, "https://crm.test", "a@b.es").html.includes("30 minutos"));
  const e = slaReminder(lead, 180, "https://crm.test", "a@b.es", true);
  assert.ok(e.html.includes("3 horas"));
  assert.ok(e.subject.includes("Sin atender"));
});

test("confirmación al cliente: solo si hay email, con teléfono, web y política de privacidad", () => {
  assert.equal(leadConfirmation({ ...lead, email: null }, { telefonoContacto: "981 91 22 29", web: "https://estudiobescansa.com", privacidadUrl: "https://x/priv" }), null);
  const m = leadConfirmation(lead, { telefonoContacto: "981 91 22 29", web: "https://estudiobescansa.com", privacidadUrl: "https://x/priv" })!;
  assert.equal(m.to, "ana@x.es");
  assert.ok(m.html.includes("981 91 22 29"));
  assert.ok(m.html.includes("https://x/priv"));
  assert.ok(m.html.includes("Hola Ana"));
});

test("resumen diario: vacío no envía nada", () => {
  assert.equal(dailyDigest([], "https://crm.test", "a@b.es"), null);
  const d = dailyDigest([{ lead, horas: 60 }], "https://crm.test", "a@b.es")!;
  assert.ok(d.subject.includes("1 lead sin contactar"));
  assert.ok(d.html.includes("3 d"));
});

test("envío: sin configuración se omite sin fallar", async () => {
  const r = await sendEmail({ to: "a@b.es", subject: "x", html: "x", text: "x" }, { apiKey: undefined, from: undefined });
  assert.equal(r.skipped, true);
  assert.equal(r.ok, false);
});

test("envío: manda a Resend con la clave y devuelve el id", async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const fetchImpl = (async (url: string, init: RequestInit) => { seen = { url, init }; return new Response(JSON.stringify({ id: "re_123" }), { status: 200 }); }) as unknown as typeof fetch;
  const r = await sendEmail({ to: "a@b.es", subject: "Hola", html: "<p>x</p>", text: "x" }, { apiKey: "key", from: "CRM <a@b.es>", fetchImpl });
  assert.deepEqual(r, { ok: true, id: "re_123" });
  assert.equal(seen!.url, "https://api.resend.com/emails");
  assert.equal((seen!.init.headers as Record<string, string>).Authorization, "Bearer key");
  const body = JSON.parse(String(seen!.init.body));
  assert.deepEqual(body.to, ["a@b.es"]);
  assert.equal(body.from, "CRM <a@b.es>");
});

test("envío: errores de Resend y de red se devuelven sin lanzar", async () => {
  const bad = (async () => new Response(JSON.stringify({ message: "dominio no verificado" }), { status: 403 })) as unknown as typeof fetch;
  assert.deepEqual(await sendEmail({ to: "a@b.es", subject: "x", html: "x", text: "x" }, { apiKey: "k", from: "f@x.es", fetchImpl: bad }), { ok: false, error: "dominio no verificado" });
  const net = (async () => { throw new Error("sin red"); }) as unknown as typeof fetch;
  assert.deepEqual(await sendEmail({ to: "a@b.es", subject: "x", html: "x", text: "x" }, { apiKey: "k", from: "f@x.es", fetchImpl: net }), { ok: false, error: "sin red" });
  assert.equal((await sendEmail({ to: "no-es-email", subject: "x", html: "x", text: "x" }, { apiKey: "k", from: "f@x.es" })).ok, false);
});
