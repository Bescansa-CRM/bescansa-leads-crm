/** Normaliza un teléfono a formato internacional E.164. Sin prefijo se asume España (+34). Devuelve null si no es válido. */
export function normalizePhone(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s) return null;
  const plus = s.startsWith("+");
  s = s.replace(/[^\d]/g, "");
  if (!s) return null;
  if (!plus && s.startsWith("00")) return finish("+" + s.slice(2));
  if (plus) return finish("+" + s);
  if (s.length === 9 && /^[6789]/.test(s)) return "+34" + s; // móvil o fijo español
  if (s.length === 11 && s.startsWith("34")) return "+" + s; // 34 + 9 dígitos, sin el +
  return null; // ambiguo: no adivinamos el país
}

function finish(e164: string): string | null {
  const digits = e164.slice(1);
  if (digits.length < 8 || digits.length > 15) return null;
  if (digits.startsWith("34") && digits.length !== 11) return null; // un +34 debe llevar 9 dígitos
  return e164;
}

export function normalizeEmail(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : null;
}
