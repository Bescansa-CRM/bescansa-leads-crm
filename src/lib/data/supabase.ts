import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EVENT_SELECT, LEAD_SELECT, SPEND_SELECT, TASK_SELECT,
  mapEventRow, mapLeadRow, mapSpendRow, mapTaskRow, mapUserRow, sanitizeSearch, type LeadDbRow,
} from "./map.ts";
import type { EventTipo, HoyStats, LeadDetail, LeadFilters, LeadRow, LeadsRepo, TaskRow } from "./types.ts";

const PAGE = 1000;
const MAX_ROWS = 10_000;
const H = 3_600_000;

function fail(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what}: ${error.message}`);
}

/**
 * Repositorio sobre Supabase. Se usa con el cliente de la sesión del usuario, así que la seguridad por filas (RLS)
 * se aplica siempre: nunca se usa aquí la clave de servicio.
 */
export function createSupabaseRepo(db: SupabaseClient, userId: string): LeadsRepo {
  const repo: LeadsRepo = {
    mode: "supabase",

    async listUsers() {
      const { data, error } = await db.from("profiles").select("id, full_name, email, role").eq("active", true).order("full_name");
      fail(error, "usuarios");
      return (data ?? []).map(mapUserRow);
    },

    async listLeads(f: LeadFilters = {}): Promise<LeadRow[]> {
      const out: LeadRow[] = [];
      const select = f.ad ? LEAD_SELECT.replace("ad:ads!leads_ad_id_fkey(name)", "ad:ads!leads_ad_id_fkey!inner(name)") : LEAD_SELECT;
      for (let from = 0; from < MAX_ROWS; from += PAGE) {
        let q = db.from("leads").select(select).order("created_at", { ascending: false }).range(from, from + PAGE - 1);
        if (f.etapa) q = q.eq("etapa", f.etapa);
        if (f.owner === "sin") q = q.is("owner_id", null);
        else if (f.owner) q = q.eq("owner_id", f.owner);
        if (f.ad) q = q.eq("ad.name", f.ad);
        if (f.interes) q = q.eq("interes", f.interes);
        if (f.sinContactar) q = q.eq("etapa", "nuevo").is("first_contact_at", null);
        const term = f.q ? sanitizeSearch(f.q) : "";
        if (term) q = q.or(["nombre", "apellidos", "email", "telefono"].map((c) => `${c}.ilike.%${term}%`).join(","));
        const { data, error } = await q;
        fail(error, "leads");
        const rows = (data ?? []) as unknown as LeadDbRow[];
        out.push(...rows.map(mapLeadRow));
        if (rows.length < PAGE) break;
      }
      return out;
    },

    async getLead(id: string): Promise<LeadDetail | null> {
      const { data: lead, error } = await db.from("leads").select(LEAD_SELECT).eq("id", id).maybeSingle();
      fail(error, "lead");
      if (!lead) return null;
      const [ev, tk] = await Promise.all([
        db.from("lead_events").select(EVENT_SELECT).eq("lead_id", id).order("created_at", { ascending: false }).limit(500),
        db.from("tasks").select(TASK_SELECT).eq("lead_id", id).order("due_at", { ascending: true, nullsFirst: false }),
      ]);
      fail(ev.error, "historial");
      fail(tk.error, "tareas");
      return {
        lead: mapLeadRow(lead as unknown as LeadDbRow),
        events: (ev.data ?? []).map((e) => mapEventRow(e as never)),
        tasks: (tk.data ?? []).map((t) => mapTaskRow(t as never)),
      };
    },

    async moveStage(id, etapa, motivo) {
      if (etapa === "perdido" && !motivo) throw new Error("El motivo de pérdida es obligatorio");
      const { error } = await db.from("leads").update({ etapa, motivo_perdida: etapa === "perdido" ? motivo : null }).eq("id", id);
      fail(error, "cambio de fase");
      if (etapa === "ganado" || etapa === "perdido") {
        const { error: e2 } = await db.from("tasks").update({ done_at: new Date().toISOString() }).eq("lead_id", id).is("done_at", null);
        fail(e2, "cierre de tareas");
      }
    },

    async addEvent(id, e) {
      const { error } = await db.from("lead_events").insert({
        lead_id: id, author_id: userId, tipo: e.tipo as EventTipo, detalle: e.detalle ?? null, contacto_efectivo: e.efectivo ?? null,
      });
      fail(error, "registro de contacto");
    },

    async setOwner(id, ownerId) {
      const { error } = await db.from("leads").update({ owner_id: ownerId, assigned_at: ownerId ? new Date().toISOString() : null }).eq("id", id);
      fail(error, "asignación");
      await db.from("tasks").update({ owner_id: ownerId }).eq("lead_id", id).is("done_at", null);
      let nombre = "Sin responsable";
      if (ownerId) {
        const { data } = await db.from("profiles").select("full_name").eq("id", ownerId).maybeSingle();
        nombre = `Asignado a ${data?.full_name ?? "otra persona"}`;
      }
      await db.from("lead_events").insert({ lead_id: id, author_id: userId, tipo: "asignacion", detalle: nombre });
    },

    async listTasks(f = {}): Promise<TaskRow[]> {
      let q = db.from("tasks").select(TASK_SELECT).order("due_at", { ascending: true, nullsFirst: false }).limit(2000);
      if (f.soloAbiertas) q = q.is("done_at", null);
      if (f.owner) q = q.eq("owner_id", f.owner);
      const { data, error } = await q;
      fail(error, "tareas");
      return (data ?? []).map((t) => mapTaskRow(t as never));
    },

    async completeTask(id) {
      const { error } = await db.from("tasks").update({ done_at: new Date().toISOString() }).eq("id", id).is("done_at", null);
      fail(error, "tarea");
    },

    async hoyStats(): Promise<HoyStats> {
      const [leads, tasks] = await Promise.all([repo.listLeads(), repo.listTasks({ soloAbiertas: true })]);
      const now = Date.now();
      const nuevos = leads.filter((l) => l.etapa === "nuevo" && !l.firstContactAt);
      const conFecha = tasks.filter((t) => t.dueAt);
      const ult7 = leads.filter((l) => now - Date.parse(l.createdAt) < 7 * 24 * H);
      const rapidos = ult7.filter((l) => l.firstContactAt && Date.parse(l.firstContactAt) - Date.parse(l.createdAt) < 24 * H);
      const finDeHoy = new Date(); finDeHoy.setHours(23, 59, 59, 999);
      return {
        sinContactar: nuevos.length,
        sinContactarMas24h: nuevos.filter((l) => now - Date.parse(l.createdAt) > 24 * H).length,
        tareasVencidas: conFecha.filter((t) => Date.parse(t.dueAt!) < now).length,
        tareasHoy: conFecha.filter((t) => Date.parse(t.dueAt!) >= now && Date.parse(t.dueAt!) <= finDeHoy.getTime()).length,
        leadsUltimos7: ult7.length,
        contactadosEn24hPct: ult7.length ? Math.round((rapidos.length / ult7.length) * 100) : null,
      };
    },

    async listAds() {
      const { data, error } = await db.from("ads").select("name").order("name");
      fail(error, "anuncios");
      return [...new Set((data ?? []).map((a) => a.name as string))];
    },

    async addSpend(rows) {
      // Cada anuncio se busca por nombre; si no existe se crea (sin conjunto). Se sustituye el gasto de ese día y anuncio.
      const names = [...new Set(rows.map((r) => r.ad))];
      const ids = new Map<string, string>();
      const { data: found, error: e1 } = await db.from("ads").select("id, name");
      fail(e1, "anuncios");
      for (const a of found ?? []) if (!ids.has(String(a.name).toLowerCase())) ids.set(String(a.name).toLowerCase(), a.id as string);
      for (const name of names) {
        if (ids.has(name.toLowerCase())) continue;
        const { data: created, error } = await db.from("ads").insert({ name }).select("id").single();
        fail(error, "crear anuncio");
        ids.set(name.toLowerCase(), created!.id as string);
      }
      let saved = 0;
      for (const r of rows) {
        const adId = ids.get(r.ad.toLowerCase())!;
        const { error: d } = await db.from("ad_spend").delete().eq("day", r.day).eq("platform", "meta").eq("ad_id", adId);
        fail(d, "sustituir gasto");
        const { error } = await db.from("ad_spend").insert({ day: r.day, platform: "meta", ad_id: adId, spend: r.spend, impressions: r.impressions ?? null, clicks: r.clicks ?? null });
        fail(error, "guardar gasto");
        saved++;
      }
      return saved;
    },

    async listSpend() {
      const { data, error } = await db.from("ad_spend").select(SPEND_SELECT).order("day", { ascending: false }).limit(5000);
      fail(error, "gasto");
      return (data ?? []).map((s) => mapSpendRow(s as never));
    },
  };
  return repo;
}
