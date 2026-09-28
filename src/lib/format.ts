const TZ = "Europe/Madrid";

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-ES", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-ES", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** "hace 5 min", "hace 3 h", "hace 2 d". Para fechas futuras: "en 3 h". */
export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const diff = now - Date.parse(iso);
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60_000);
  const txt = m < 1 ? "un momento" : m < 60 ? `${m} min` : m < 60 * 24 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`;
  if (m < 1) return "ahora";
  return diff >= 0 ? `hace ${txt}` : `en ${txt}`;
}

export function hoursSince(iso: string, now = Date.now()): number {
  return (now - Date.parse(iso)) / 3_600_000;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "—";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export function fullName(l: { nombre: string; apellidos: string | null }): string {
  return `${l.nombre} ${l.apellidos ?? ""}`.trim();
}

/** Teléfono legible: +34 600 00 00 01 */
export function fmtPhone(p: string | null | undefined): string {
  if (!p) return "—";
  const m = p.match(/^\+34(\d{3})(\d{2})(\d{2})(\d{2})$/);
  return m ? `+34 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
}

/** Instante actual. Va en un helper para que las páginas de servidor no llamen a Date.now() directamente. */
export const nowMs = (): number => Date.now();
