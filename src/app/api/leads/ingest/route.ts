import { after, NextResponse } from "next/server";
import { parseIngestPayload, secretMatches } from "@/lib/ingest";
import { notifyLeadReceived } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 20_000;

/**
 * Punto único de entrada de leads para integraciones servidor a servidor (Make/Zapier con Meta, webhooks de Meta y Google).
 * Requiere `Authorization: Bearer <INGEST_SECRET>`. La landing usa un endpoint distinto, sin clave en el navegador.
 */
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("authorization"), process.env.INGEST_SECRET)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Cuerpo demasiado grande" }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "JSON no válido" }, { status: 400 }); }

  const parsed = parseIngestPayload(body);
  if (!parsed.ok) return NextResponse.json({ error: "Datos no válidos", detalles: parsed.errors }, { status: 400 });

  const { data, error } = await createAdminClient().rpc("ingest_lead", { p: parsed.value });
  if (error) {
    console.error("ingest_lead falló", error.message);
    return NextResponse.json({ error: "No se pudo guardar el lead" }, { status: 500 });
  }
  const created = Boolean((data as { created?: boolean } | null)?.created);
  after(() => notifyLeadReceived((data ?? {}) as Parameters<typeof notifyLeadReceived>[0]));
  return NextResponse.json({ ok: true, ...(data as object) }, { status: created ? 201 : 200 });
}
