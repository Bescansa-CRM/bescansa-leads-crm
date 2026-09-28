import type { Etapa, PlannedLead, SourceRecord } from "./types.ts";

export interface MergeStats {
  input: number;
  leads: number;
  merged: number;               // registros absorbidos por otro (duplicados)
  metaOnly: number;             // leads que solo existen en Meta (nunca llegaron a Pipefy)
  byEtapa: Record<string, number>;
}

class UnionFind {
  private p: number[];
  constructor(n: number) { this.p = Array.from({ length: n }, (_, i) => i); }
  find(x: number): number { while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; } return x; }
  union(a: number, b: number) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.p[Math.max(ra, rb)] = Math.min(ra, rb); }
}

/** Une los registros de Pipefy y de Meta que son la misma persona (mismo teléfono o mismo email). */
export function mergeRecords(records: SourceRecord[]): { leads: PlannedLead[]; stats: MergeStats } {
  const uf = new UnionFind(records.length);
  const byKey = new Map<string, number>();
  records.forEach((r, i) => {
    for (const key of [r.telefono && `t:${r.telefono}`, r.email && `e:${r.email}`]) {
      if (!key) continue;
      const seen = byKey.get(key);
      if (seen === undefined) byKey.set(key, i); else uf.union(seen, i);
    }
  });

  const groups = new Map<number, SourceRecord[]>();
  records.forEach((r, i) => { const g = uf.find(i); (groups.get(g) ?? groups.set(g, []).get(g)!).push(r); });

  const leads: PlannedLead[] = [];
  let merged = 0, metaOnly = 0;
  for (const members of groups.values()) {
    // Principal: un cierre ("ganado") nunca se pierde; luego Pipefy antes que Meta (tiene el historial);
    // entre varios, el actualizado más recientemente.
    const sorted = [...members].sort((a, b) => {
      if ((a.etapa === "ganado") !== (b.etapa === "ganado")) return a.etapa === "ganado" ? -1 : 1;
      if (a.source !== b.source) return a.source === "import_pipefy" ? -1 : 1;
      return (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);
    });
    const main = sorted[0];
    const others = sorted.slice(1);
    merged += others.length;

    const first = <T>(pick: (r: SourceRecord) => T | null): T | null => { for (const r of sorted) { const v = pick(r); if (v !== null && v !== undefined) return v; } return null; };

    const hist = new Map<Etapa, string>();
    for (const r of members) for (const h of r.stageHistory) { const prev = hist.get(h.etapa); if (!prev || h.enteredAt < prev) hist.set(h.etapa, h.enteredAt); }

    const notes = [...members.flatMap((r) => r.notes)];
    for (const o of others) if (o.source === "import_pipefy") notes.push({ at: o.createdAt, text: `Tarjeta duplicada en Pipefy (ID ${o.externalId}), fusionada en este lead.` });

    const fromPipefy = members.some((r) => r.source === "import_pipefy");
    const etapa = main.etapa;
    const tags = [...new Set(members.flatMap((r) => r.tags))];
    let prioridad: PlannedLead["prioridad"] = "normal";
    if (!fromPipefy) { prioridad = "alta"; tags.push("sin-contactar-agencia"); metaOnly++; }
    else if (etapa === "propuesta" || etapa === "negociacion") prioridad = "alta";
    else if (etapa === "perdido") prioridad = "baja";

    leads.push({
      source: main.source,
      externalId: main.externalId,
      createdAt: members.map((r) => r.createdAt).sort()[0],
      nombre: main.nombre,
      apellidos: first((r) => r.apellidos),
      email: first((r) => r.email),
      telefono: first((r) => r.telefono),
      etapa,
      prioridad,
      interes: first((r) => r.interes),
      etapaProyecto: first((r) => r.etapaProyecto),
      terreno: first((r) => r.terreno),
      motivoPerdida: etapa === "perdido" ? (main.motivoPerdida ?? "otro") : null,
      campaign: first((r) => r.campaign),
      adset: first((r) => r.adset),
      ad: first((r) => r.ad),
      tags,
      stageHistory: [...hist].map(([e, enteredAt]) => ({ etapa: e, enteredAt })).sort((a, b) => a.enteredAt.localeCompare(b.enteredAt)),
      notes: notes.sort((a, b) => a.at.localeCompare(b.at)),
      mergedFrom: members.map((r) => r.externalId),
      raw: { ...main.raw, fuentes: members.map((r) => r.source) },
    });
  }

  const byEtapa: Record<string, number> = {};
  for (const l of leads) byEtapa[l.etapa] = (byEtapa[l.etapa] ?? 0) + 1;
  leads.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { leads, stats: { input: records.length, leads: leads.length, merged, metaOnly, byEtapa } };
}
