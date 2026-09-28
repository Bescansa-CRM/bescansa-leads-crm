/** Convierte una fecha "de pared" en Europa/Madrid (como aparece en Pipefy y en los CSV de Meta) a ISO UTC. */
export function madridLocalToIso(y: number, mo: number, d: number, h = 0, mi = 0, s = 0, ms = 0): string {
  const naive = Date.UTC(y, mo - 1, d, h, mi, s, ms);
  // El desfase de Madrid en ese instante (probamos con el resultado para cubrir el cambio de hora)
  let ts = naive - offsetMs(naive);
  ts = naive - offsetMs(ts);
  return new Date(ts).toISOString();
}

function offsetMs(utcTs: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcTs));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return asUtc - Math.floor(utcTs / 1000) * 1000;
}

/** Fecha de una celda de Excel (ExcelJS la entrega como Date en UTC con los números "de pared") → ISO UTC real. */
export function excelWallToIso(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return madridLocalToIso(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate(), v.getUTCHours(), v.getUTCMinutes(), v.getUTCSeconds(), v.getUTCMilliseconds());
  }
  if (typeof v === "string" && v.trim()) {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) return madridLocalToIso(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] ?? 0));
  }
  return null;
}

/** "09/25/2026 8:15am" (formato mes/día del CSV de Meta) → ISO UTC. */
export function metaCsvDateToIso(v: unknown): string | null {
  const m = String(v ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!m) return null;
  let h = +m[4] % 12;
  if (m[6].toLowerCase() === "pm") h += 12;
  return madridLocalToIso(+m[3], +m[1], +m[2], h, +m[5]);
}
