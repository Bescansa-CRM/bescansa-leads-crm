/** Solo se aceptan rutas internas como destino tras iniciar sesión (evita redirecciones abiertas a otros sitios). */
export function safeNext(next: string | null | undefined): string {
  if (!next || !/^\/[\w\-./?=&%]*$/.test(next)) return "/";
  if (next.startsWith("//") || next.includes("..")) return "/";
  return next;
}
