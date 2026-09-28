import { parse } from "csv-parse/sync";

export interface SpendInput { day: string; ad: string; spend: number; impressions?: number; clicks?: number }
export interface SpendParse { rows: SpendInput[]; errors: string[] }

const find = (headers: string[], patterns: RegExp[]) => headers.findIndex((h) => patterns.some((p) => p.test(h.trim())));

/**
 * "12,34" · "12.34" · "1.234,56" · "1,234.56" · "€ 12,3" · "1.234" → número. Devuelve null si no es un importe.
 * Un único separador seguido de exactamente 3 cifras se interpreta como separador de miles ("1.234" = 1234).
 */
export function parseAmount(raw: string): number | null {
  let s = raw.replace(/[^\d,.-]/g, "");
  if (!/\d/.test(s)) return null;
  const lastComma = s.lastIndexOf(","), lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1 || lastDot > -1) {
    const sep = lastComma > -1 ? "," : ".";
    const count = s.split(sep).length - 1;
    const tail = s.length - s.lastIndexOf(sep) - 1;
    s = count > 1 || tail === 3 ? s.split(sep).join("") : s.replace(sep, ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Enteros (impresiones, clics): cualquier punto o coma es separador de miles. */
export function parseCount(raw: string): number | null {
  const d = raw.replace(/[^\d]/g, "");
  return d ? Number(d) : null;
}

/** "2026-09-20" · "20/09/2026" · "20-09-2026" → "2026-09-20". */
export function parseDay(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return valid(+m[3], +m[2], +m[1]);
  return null;
}
function valid(y: number, mo: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Lee el CSV que exporta el Administrador de anuncios de Meta (desglose por día y por anuncio).
 * Columnas reconocidas (español o inglés): día, nombre del anuncio, importe gastado, impresiones, clics.
 */
export function parseSpendCsv(text: string): SpendParse {
  const clean = text.replace(/^﻿/, "");
  const delimiter = (clean.split("\n", 1)[0].match(/;/g) ?? []).length > (clean.split("\n", 1)[0].match(/,/g) ?? []).length ? ";" : ",";
  let records: string[][];
  try { records = parse(clean, { delimiter, skip_empty_lines: true, relax_column_count: true }) as string[][]; }
  catch { return { rows: [], errors: ["No se pudo leer el archivo como CSV"] }; }
  if (records.length < 2) return { rows: [], errors: ["El archivo no tiene filas de datos"] };

  const headers = records[0];
  const iDay = find(headers, [/^d[ií]a$/i, /inicio del informe/i, /^day$/i, /^date$/i, /^reporting starts$/i, /^fecha$/i]);
  const iAd = find(headers, [/nombre del anuncio/i, /^anuncio$/i, /^ad name$/i, /^ad$/i]);
  const iSpend = find(headers, [/importe gastado/i, /amount spent/i, /^gasto$/i, /^spend$/i]);
  const iImp = find(headers, [/^impresiones$/i, /^impressions$/i]);
  const iClk = find(headers, [/clics en el enlace/i, /^clics/i, /link clicks/i, /^clicks/i]);
  const missing = [iDay < 0 && "día", iAd < 0 && "nombre del anuncio", iSpend < 0 && "importe gastado"].filter(Boolean);
  if (missing.length) return { rows: [], errors: [`Faltan columnas: ${missing.join(", ")}. En Meta, exporta con desglose «Por día» y «Anuncio».`] };

  const rows: SpendInput[] = [];
  const errors: string[] = [];
  records.slice(1).forEach((r, i) => {
    const line = i + 2;
    const ad = (r[iAd] ?? "").trim();
    if (!ad || /^(total|resultados totales)/i.test(ad)) return; // filas de totales
    const day = parseDay(r[iDay] ?? "");
    const spend = parseAmount(r[iSpend] ?? "");
    if (!day) { errors.push(`Línea ${line}: fecha no válida («${r[iDay] ?? ""}»)`); return; }
    if (spend === null || spend < 0) { errors.push(`Línea ${line}: importe no válido («${r[iSpend] ?? ""}»)`); return; }
    const imp = iImp >= 0 ? parseCount(r[iImp] ?? "") : null, clk = iClk >= 0 ? parseCount(r[iClk] ?? "") : null;
    rows.push({ day, ad, spend: Math.round(spend * 100) / 100, impressions: imp ?? undefined, clicks: clk ?? undefined });
  });
  return { rows, errors };
}
