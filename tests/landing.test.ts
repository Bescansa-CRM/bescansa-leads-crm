import { test } from "node:test";
import assert from "node:assert/strict";
import { CONSENT_VERSION, corsHeaders, parseLandingPayload, RateLimiter } from "../src/lib/landing.ts";

const NOW = Date.parse("2026-09-26T10:00:00Z");
const ok = {
  nombre: "Ana Pérez", email: "ana@test.es", telefono: "600 000 001", terreno: "propio", superficie_rango: "90–120 m²",
  presupuesto_rango: "200.000–300.000 €", plazo: "6–12 meses", dormitorios: "3", municipio: "Oleiros",
  consent: true, consent_text: "Acepto la política de privacidad.", event_id: "evt-1", started_at: NOW - 60_000,
  utm_source: "facebook", utm_campaign: "CASAS MODULARES", fbclid: "abc", website: "",
  perfil: { edad_rango: "35–44" },
};

test("landing: un envío completo se valida y se transforma al formato de entrada", () => {
  const r = parseLandingPayload(ok, NOW);
  assert.ok(r.ok && !r.suspicious);
  if (!r.ok || r.suspicious) return;
  assert.equal(r.value.source, "landing");
  assert.equal(r.value.telefono, "+34600000001");
  assert.equal(r.value.external_id, "landing:evt-1");
  assert.equal(r.value.consent_version, CONSENT_VERSION);
  assert.equal(r.value.consent_at, "2026-09-26T10:00:00.000Z");
  assert.equal(r.value.campaign, "CASAS MODULARES");
  assert.deepEqual(r.value.perfil, { edad_rango: "35–44", dormitorios: "3" });
  assert.ok(r.value.tags?.includes("landing"));
});

test("landing: sin consentimiento no se guarda", () => {
  const r = parseLandingPayload({ ...ok, consent: false }, NOW);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.some((e) => /política de privacidad/.test(e)));
  const r2 = parseLandingPayload({ ...ok, consent: true, consent_text: "" }, NOW);
  assert.equal(r2.ok, false);
});

test("landing: el consentimiento tiene que ser exactamente true (no vale 'si' ni 1)", () => {
  assert.equal(parseLandingPayload({ ...ok, consent: "true" }, NOW).ok, false);
  assert.equal(parseLandingPayload({ ...ok, consent: 1 }, NOW).ok, false);
});

test("landing: antispam — campo trampa y envío demasiado rápido se descartan en silencio", () => {
  const trampa = parseLandingPayload({ ...ok, website: "http://spam.example" }, NOW);
  assert.ok(trampa.ok && trampa.suspicious);
  const rapido = parseLandingPayload({ ...ok, started_at: NOW - 800 }, NOW);
  assert.ok(rapido.ok && rapido.suspicious);
});

test("landing: un formulario abierto hace más de 6 h caduca con un mensaje claro", () => {
  const r = parseLandingPayload({ ...ok, started_at: NOW - 7 * 3_600_000 }, NOW);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors[0].includes("caducado"));
});

test("landing: exige teléfono o email válidos y explica el error", () => {
  const r = parseLandingPayload({ ...ok, email: "mal", telefono: "" }, NOW);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.some((e) => /email no válido/.test(e)));
});

test("landing: un valor no permitido en la lista de terreno se ignora, no rompe", () => {
  const r = parseLandingPayload({ ...ok, terreno: "otra cosa" }, NOW);
  assert.ok(r.ok && !r.suspicious);
  if (r.ok && !r.suspicious) assert.equal(r.value.terreno, undefined);
});

test("límite de envíos: 3 por ventana y se libera al pasar el tiempo", () => {
  const l = new RateLimiter(3, 60_000);
  assert.equal(l.allow("1.1.1.1", 0), true);
  assert.equal(l.allow("1.1.1.1", 1000), true);
  assert.equal(l.allow("1.1.1.1", 2000), true);
  assert.equal(l.allow("1.1.1.1", 3000), false);
  assert.equal(l.allow("2.2.2.2", 3000), true, "otra IP no se ve afectada");
  assert.equal(l.allow("1.1.1.1", 61_000), true, "pasada la ventana vuelve a permitir");
});

test("CORS: solo los orígenes de la lista", () => {
  const allowed = "https://casas.estudiobescansa.com, https://estudiobescansa.netlify.app/";
  assert.equal(corsHeaders("https://casas.estudiobescansa.com", allowed)["Access-Control-Allow-Origin"], "https://casas.estudiobescansa.com");
  assert.equal(corsHeaders("https://estudiobescansa.netlify.app", allowed)["Access-Control-Allow-Origin"], "https://estudiobescansa.netlify.app");
  assert.equal(corsHeaders("https://malo.example", allowed)["Access-Control-Allow-Origin"], undefined);
  assert.equal(corsHeaders(null, allowed)["Access-Control-Allow-Origin"], undefined);
  assert.equal(corsHeaders("https://casas.estudiobescansa.com", undefined)["Access-Control-Allow-Origin"], undefined);
});
