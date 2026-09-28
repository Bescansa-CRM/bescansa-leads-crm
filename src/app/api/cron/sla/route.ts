import { NextResponse } from "next/server";
import { secretMatches } from "@/lib/ingest";
import { runSlaCheck } from "@/lib/sla";
import { buildRuntimeDeps } from "@/lib/sla-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tarea programada (cada ~10 min): recordatorios de leads sin contactar. Protegida con CRON_SECRET (Vercel lo envía como Bearer). */
export async function GET(request: Request) {
  if (!secretMatches(request.headers.get("authorization"), process.env.CRON_SECRET)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const deps = await buildRuntimeDeps();
    return NextResponse.json({ ok: true, ...(await runSlaCheck({ ...deps })) });
  } catch (e) {
    console.error("cron sla falló", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Error al ejecutar las alertas" }, { status: 500 });
  }
}
