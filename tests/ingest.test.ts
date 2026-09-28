import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIngestPayload, secretMatches } from "../src/lib/ingest.ts";

test("ingest: un lead válido se normaliza (teléfono E.164, email en minúsculas, etapa de proyecto en lista cerrada)", () => {
  const r = parseIngestPayload({
    source: "landing", nombre: "  Ana   Pérez ", email: "ANA@Test.es", telefono: "600 00 00 01",
    etapa_proyecto: "Tengo el terreno, busco proyecto", terreno: "propio", interes: "casa_modular",
    utm_source: "facebook", consent_at: "2026-09-25T10:00:00+02:00", consent_whatsapp: true, tags: ["a", " b "],
    perfil: { edad_rango: "35-44", hogar: "familia con hijos pequeños", vacio: "" },
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.value.nombre, "Ana Pérez");
  assert.equal(r.value.email, "ana@test.es");
  assert.equal(r.value.telefono, "+34600000001");
  assert.equal(r.value.etapa_proyecto, "tiene_terreno");
  assert.equal(r.value.consent_at, "2026-09-25T08:00:00.000Z");
  assert.equal(r.value.consent_whatsapp, true);
  assert.deepEqual(r.value.tags, ["a", "b"]);
  assert.deepEqual(r.value.perfil, { edad_rango: "35-44", hogar: "familia con hijos pequeños" });
});

test("ingest: acepta los nombres de campo habituales de Make/Zapier (name, phone)", () => {
  const r = parseIngestPayload({ source: "meta_form", name: "Beto", phone: "+34600000002" });
  assert.ok(r.ok);
});

test("ingest: rechaza lo que no es válido y explica por qué", () => {
  const cases: [unknown, RegExp][] = [
    [null, /objeto JSON/],
    [[], /objeto JSON/],
    [{ source: "otra", nombre: "x", email: "a@b.es" }, /source debe ser/],
    [{ source: "landing", email: "a@b.es" }, /nombre es obligatorio/],
    [{ source: "landing", nombre: "x" }, /email o un teléfono/],
    [{ source: "landing", nombre: "x", email: "no-es-email" }, /email no válido/],
    [{ source: "landing", nombre: "x", telefono: "123" }, /teléfono no válido/],
    [{ source: "landing", nombre: "x", email: "a@b.es", consent_at: "ayer" }, /consent_at/],
    [{ source: "landing", nombre: "x", email: "a@b.es", tags: "no" }, /tags/],
  ];
  for (const [body, re] of cases) {
    const r = parseIngestPayload(body);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errors.some((e) => re.test(e)), `${JSON.stringify(body)} → ${r.errors.join("; ")}`);
  }
});

test("ingest: valores fuera de lista se descartan en vez de romper la carga", () => {
  const r = parseIngestPayload({ source: "landing", nombre: "x", email: "a@b.es", interes: "cualquier cosa", terreno: "??", platform: "tiktok" });
  assert.ok(r.ok);
  if (r.ok) { assert.equal(r.value.interes, undefined); assert.equal(r.value.terreno, undefined); assert.equal(r.value.platform, undefined); }
});

test("ingest: los textos largos se recortan", () => {
  const r = parseIngestPayload({ source: "landing", nombre: "x".repeat(500), email: "a@b.es" });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.nombre.length, 120);
});

test("clave del endpoint: solo la correcta abre; sin clave configurada queda cerrado", () => {
  const secret = "s".repeat(32);
  assert.equal(secretMatches(`Bearer ${secret}`, secret), true);
  assert.equal(secretMatches(`bearer ${secret}`, secret), true);
  assert.equal(secretMatches(`Bearer ${secret}x`, secret), false);
  assert.equal(secretMatches(secret, secret), false, "sin esquema Bearer");
  assert.equal(secretMatches(null, secret), false);
  assert.equal(secretMatches("Bearer abc", undefined), false);
  assert.equal(secretMatches("Bearer corta", "corta"), false, "una clave corta no se acepta nunca");
});
