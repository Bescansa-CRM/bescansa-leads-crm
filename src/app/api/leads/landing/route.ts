import { after, NextResponse } from "next/server";
import { corsHeaders, parseLandingPayload, RateLimiter } from "@/lib/landing";
import { notifyLeadReceived } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16_000;
const limiter = new RateLimiter(5, 10 * 60_000); // 5 envíos por IP cada 10 minutos

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "desconocida";
}

async function turnstileOk(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true; // sin Turnstile configurado no se exige
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    return Boolean(((await res.json()) as { success?: boolean }).success);
  } catch {
    return false;
  }
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin"), process.env.LANDING_ORIGINS) });
}

/** Formulario público de la landing. Sin claves en el navegador: protegido por consentimiento, antispam, límite por IP y (opcional) Turnstile. */
export async function POST(request: Request) {
  const headers = corsHeaders(request.headers.get("origin"), process.env.LANDING_ORIGINS);
  const json = (body: object, status: number) => NextResponse.json(body, { status, headers });

  const ip = clientIp(request);
  if (!limiter.allow(ip)) return json({ error: "Demasiados envíos. Inténtalo de nuevo en unos minutos." }, 429);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "Cuerpo demasiado grande" }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: "JSON no válido" }, 400); }

  if (!(await turnstileOk((body as { cf_token?: unknown } | null)?.cf_token, ip))) return json({ error: "No se pudo verificar que eres una persona. Recarga la página." }, 400);

  const parsed = parseLandingPayload(body);
  if (!parsed.ok) return json({ error: "Datos no válidos", detalles: parsed.errors }, 400);
  if (parsed.suspicious) return json({ ok: true }, 200); // el bot cree que ha funcionado; no se guarda nada

  const { data, error } = await createAdminClient().rpc("ingest_lead", { p: parsed.value });
  if (error) {
    console.error("ingest_lead (landing) falló", error.message);
    return json({ error: "No se pudo enviar el formulario. Inténtalo de nuevo o llámanos." }, 500);
  }
  after(() => notifyLeadReceived((data ?? {}) as Parameters<typeof notifyLeadReceived>[0]));
  return json({ ok: true }, 201);
}
