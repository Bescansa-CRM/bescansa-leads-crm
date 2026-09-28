import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount, parseDay, parseSpendCsv } from "../src/lib/spend-csv.ts";

test("importes: formatos español e inglés, con símbolo y miles", () => {
  const casos: [string, number | null][] = [
    ["12,34", 12.34], ["12.34", 12.34], ["1.234,56", 1234.56], ["1,234.56", 1234.56], ["€ 12,3", 12.3], ["331,30 €", 331.3],
    ["1.234", 1234], ["1,234,567", 1234567], ["0", 0], ["abc", null], ["", null],
  ];
  for (const [entrada, esperado] of casos) assert.equal(parseAmount(entrada), esperado, entrada);
});

test("fechas: ISO y dd/mm/aaaa; se rechazan las imposibles", () => {
  assert.equal(parseDay("2026-09-20"), "2026-09-20");
  assert.equal(parseDay("2026-09-20 00:00:00"), "2026-09-20");
  assert.equal(parseDay("20/09/2026"), "2026-09-20");
  assert.equal(parseDay("5-1-2026"), "2026-01-05");
  assert.equal(parseDay("31/02/2026"), null);
  assert.equal(parseDay("ayer"), null);
});

test("CSV de Meta en español (coma), con totales y separador de miles", () => {
  const csv = [
    "Día,Nombre del anuncio,Importe gastado (EUR),Impresiones,Clics en el enlace (todos)",
    "2026-09-20,AD01 - CASAS MODULARES CORUÑA,\"11,52\",\"1.204\",35",
    "2026-09-20,AD02 - DISEÑO MODULAR PREMIUM,\"3,10\",310,4",
    "2026-09-21,AD01 - CASAS MODULARES CORUÑA,\"12,00\",1300,40",
    ",Resultados totales,\"26,62\",,",
  ].join("\n");
  const r = parseSpendCsv(csv);
  assert.deepEqual(r.errors, []);
  assert.equal(r.rows.length, 3);
  assert.deepEqual(r.rows[0], { day: "2026-09-20", ad: "AD01 - CASAS MODULARES CORUÑA", spend: 11.52, impressions: 1204, clicks: 35 });
});

test("CSV con punto y coma y BOM (Excel en español)", () => {
  const csv = "﻿Inicio del informe;Nombre del anuncio;Importe gastado (EUR)\n20/09/2026;AD01;11,52\n21/09/2026;AD01;12,00";
  const r = parseSpendCsv(csv);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.rows.map((x) => [x.day, x.spend]), [["2026-09-20", 11.52], ["2026-09-21", 12]]);
});

test("CSV en inglés", () => {
  const r = parseSpendCsv("Day,Ad name,Amount spent (EUR),Impressions\n2026-09-20,AD01,11.52,1204");
  assert.deepEqual(r.errors, []);
  assert.equal(r.rows[0].spend, 11.52);
});

test("errores claros: columnas que faltan y filas con datos malos (las buenas se conservan)", () => {
  const sin = parseSpendCsv("Día,Campaña\n2026-09-20,X");
  assert.equal(sin.rows.length, 0);
  assert.ok(sin.errors[0].includes("nombre del anuncio") && sin.errors[0].includes("importe gastado"));

  const mix = parseSpendCsv("Día,Nombre del anuncio,Importe gastado\n2026-09-20,AD01,10\nayer,AD01,10\n2026-09-22,AD01,mucho\n2026-09-23,AD02,-5");
  assert.equal(mix.rows.length, 1);
  assert.equal(mix.errors.length, 3);
  assert.ok(mix.errors[0].startsWith("Línea 3"));

  assert.equal(parseSpendCsv("").rows.length, 0);
  assert.equal(parseSpendCsv("solo,cabecera").errors[0], "El archivo no tiene filas de datos");
});
