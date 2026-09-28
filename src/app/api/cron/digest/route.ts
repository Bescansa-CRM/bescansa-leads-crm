import { NextResponse } from "next/server";
import { secretMatches } from "@/lib/ingest";
import { runDailyDigest } from "@/lib/sla";
import { buildRuntimeDeps } from "@/lib/sla-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tarea programada (una vez por la mañana): resumen de leads sin contactar para administración. */
export async function GET(request: Request) {
  if (!secretMatches(request.headers.get("authorization"), process.env.CRON_SECRET)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const deps = await buildRuntimeDeps();
    return NextResponse.json({ ok: true, ...(await runDailyDigest(deps)) });
  } catch (e) {
    console.error("cron digest falló", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Error al enviar el resumen" }, { status: 500 });
  }
}
