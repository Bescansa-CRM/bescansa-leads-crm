import type { EventRow, EventTipo, HoyStats, LeadDetail, LeadFilters, LeadRow, LeadsRepo, SpendRow, TaskRow, UserRow } from "./types.ts";
import { ETAPAS, type Etapa } from "./types.ts";

// Datos de demostración 100 % inventados (nombres, teléfonos y correos ficticios). Viven en memoria y se pierden al reiniciar.

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const USERS: UserRow[] = [
  { id: "u1", nombre: "Fernando (admin)", email: "admin@demo.local", role: "admin" },
  { id: "u2", nombre: "Lucía Varela", email: "lucia@demo.local", role: "ventas" },
  { id: "u3", nombre: "Marcos Rey", email: "marcos@demo.local", role: "ventas" },
];

const NOMBRES = ["Ana", "Beatriz", "Carlos", "Diego", "Elena", "Fabián", "Gema", "Hugo", "Inés", "Jorge", "Karina", "Luis", "Marta", "Nuria", "Óscar", "Paula", "Raúl", "Sonia", "Tomás", "Uxía"];
const APELLIDOS = ["Ferreiro", "Souto", "Lago", "Pardo", "Vidal", "Castro", "Naveira", "Iglesias", "Otero", "Rial", "Seoane", "Trillo"];
const ADS = ["AD01 - CASAS MODULARES CORUÑA", "AD02 - DISEÑO MODULAR PREMIUM", "AD06 - CONSTRUYE TU CASA", "AD07 - REFORMA INTEGRAL"];
const MUNICIPIOS = ["A Coruña", "Oleiros", "Culleredo", "Arteixo", "Betanzos", "Cambre", "Carballo", "Sada"];
const ETAPAS_PROYECTO = ["solicita_informacion", "solo_informacion", "tiene_terreno", "explorando", "tiene_proyecto"];
const PLAZOS = ["Urgente", "6–12 meses", "12–24 meses", "Sin definir"];
const PRESUPUESTOS = ["Menos de 150.000 €", "150.000–200.000 €", "200.000–300.000 €", "Más de 300.000 €", "No lo sé"];
const SUPERFICIES = ["Hasta 60 m²", "60–90 m²", "90–120 m²", "120–165 m²", "Más de 165 m²"];
const EDADES = ["25–34", "35–44", "45–54", "55–64"];
const HOGARES = ["En pareja", "Familia con hijos pequeños", "Familia con hijos mayores", "Vive solo/a"];

const H = 3600_000;

const ORDEN: Etapa[] = ["nuevo", "contactado", "calificado", "visita", "propuesta", "negociacion", "ganado"];
function alcanzadas(etapa: Etapa, contactado: boolean): Etapa[] {
  if (etapa === "perdido") return contactado ? ["nuevo", "contactado", "perdido"] : ["nuevo", "perdido"];
  return ORDEN.slice(0, ORDEN.indexOf(etapa) + 1);
}

function build() {
  const r = rng(20260926);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const now = Date.now();
  const leads: LeadRow[] = [];
  const events: EventRow[] = [];
  const tasks: TaskRow[] = [];
  let eid = 1, tid = 1;

  const dist: [Etapa, number][] = [["nuevo", 26], ["contactado", 14], ["calificado", 8], ["visita", 5], ["propuesta", 6], ["negociacion", 2], ["ganado", 2], ["perdido", 9]];
  let n = 0;
  for (const [etapa, count] of dist) {
    for (let i = 0; i < count; i++, n++) {
      const nombre = pick(NOMBRES), ap = pick(APELLIDOS);
      const horas = etapa === "nuevo" ? r() * 90 : 24 + r() * 24 * 22;
      const created = now - horas * H;
      const ad = pick(ADS);
      const owner = r() < 0.12 && etapa === "nuevo" ? null : pick(USERS);
      const contactado = etapa !== "nuevo" || r() < 0.25;
      const firstContact = contactado ? created + (0.3 + r() * 30) * H : null;
      const id = `l${n + 1}`;
      const lead: LeadRow = {
        id, createdAt: new Date(created).toISOString(), nombre, apellidos: ap,
        email: `${nombre.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}.${ap.toLowerCase()}${n}@ejemplo.test`,
        telefono: `+346000${String(10000 + n * 7).slice(-5)}`,
        municipio: pick(MUNICIPIOS), etapa,
        etapaDesde: new Date(etapa === "nuevo" ? created : created + r() * (now - created)).toISOString(),
        etapasAlcanzadas: alcanzadas(etapa, contactado),
        prioridad: etapa === "propuesta" || etapa === "negociacion" ? "alta" : etapa === "perdido" ? "baja" : "normal",
        ownerId: owner?.id ?? null, ownerName: owner?.nombre ?? null,
        interes: ad.includes("REFORMA") ? "reforma" : "casa_modular",
        etapaProyecto: pick(ETAPAS_PROYECTO), terreno: r() < 0.4 ? "propio" : r() < 0.5 ? "buscando" : null,
        superficieRango: pick(SUPERFICIES), presupuestoRango: pick(PRESUPUESTOS), plazo: pick(PLAZOS),
        perfil: r() < 0.5 ? { edad_rango: pick(EDADES), hogar: pick(HOGARES) } : {},
        campaign: "CASAS MODULARES | LEAD NATIVO | 04.06.26", adset: "ARQUITECTURA | HM | FEED REELS | 25 - 60", ad,
        utmSource: "facebook", firstContactAt: firstContact ? new Date(firstContact).toISOString() : null,
        contactAttempts: contactado ? 1 + Math.floor(r() * 3) : 0,
        nextActionAt: etapa === "ganado" || etapa === "perdido" ? null : new Date(now + (r() - 0.4) * 48 * H).toISOString(),
        motivoPerdida: etapa === "perdido" ? pick(["sin_respuesta", "precio", "sin_terreno", "reforma", "ya_no_le_interesa"]) : null,
        tags: r() < 0.15 ? ["sin-contactar-agencia"] : [], source: "meta_form", consentAt: new Date(created).toISOString(),
      };
      leads.push(lead);
      events.push({ id: `e${eid++}`, leadId: id, createdAt: lead.createdAt, tipo: "sistema", detalle: "Lead recibido por meta_form", authorName: null, efectivo: null });
      if (firstContact) events.push({ id: `e${eid++}`, leadId: id, createdAt: lead.firstContactAt!, tipo: "llamada", detalle: "Primera llamada: interesado en información", authorName: owner?.nombre ?? null, efectivo: true });
      if (etapa !== "nuevo") events.push({ id: `e${eid++}`, leadId: id, createdAt: lead.etapaDesde, tipo: "cambio_etapa", detalle: `nuevo → ${etapa}`, authorName: owner?.nombre ?? null, efectivo: null });
      if (etapa !== "ganado" && etapa !== "perdido") {
        tasks.push({
          id: `t${tid++}`, leadId: id, leadName: `${nombre} ${ap}`,
          titulo: etapa === "nuevo" ? "Contactar al lead nuevo" : "Hacer seguimiento",
          dueAt: lead.nextActionAt, doneAt: null, ownerId: lead.ownerId, ownerName: lead.ownerName,
        });
      }
    }
  }
  const spend: SpendRow[] = [];
  for (const ad of ADS) for (let d = 0; d < 21; d++) spend.push({ day: new Date(now - d * 24 * H).toISOString().slice(0, 10), ad, campaign: "CASAS MODULARES | LEAD NATIVO | 04.06.26", spend: Math.round((ad.includes("AD01") ? 11 : 3) * (0.7 + r() * 0.6) * 100) / 100 });
  return { leads, events, tasks, spend };
}

type Store = ReturnType<typeof build> & { seq: number };
const g = globalThis as unknown as { __crmDemo?: Store };
const store = (): Store => (g.__crmDemo ??= { ...build(), seq: 10_000 });

const fullName = (l: LeadRow) => `${l.nombre} ${l.apellidos ?? ""}`.trim();

export const demoRepo: LeadsRepo = {
  mode: "demo",
  async listUsers() { return USERS; },
  async listSpend() { return store().spend; },
  async addSpend(rows) {
    const s = store();
    for (const r of rows) {
      const i = s.spend.findIndex((x) => x.day === r.day && x.ad === r.ad);
      const row = { day: r.day, ad: r.ad, campaign: null, spend: r.spend };
      if (i >= 0) s.spend[i] = { ...s.spend[i], spend: r.spend }; else s.spend.push(row);
    }
    return rows.length;
  },
  async listAds() { return [...new Set(store().leads.map((l) => l.ad).filter(Boolean) as string[])].sort(); },

  async listLeads(f: LeadFilters = {}) {
    const q = f.q?.toLowerCase().trim();
    return store().leads
      .filter((l) => {
        if (f.etapa && l.etapa !== f.etapa) return false;
        if (!f.incluirCerrados && !f.etapa && (l.etapa === "ganado" || l.etapa === "perdido") && f.sinContactar) return false;
        if (f.owner === "sin" ? l.ownerId : f.owner && l.ownerId !== f.owner) return false;
        if (f.ad && l.ad !== f.ad) return false;
        if (f.interes && l.interes !== f.interes) return false;
        if (f.sinContactar && !(l.etapa === "nuevo" && !l.firstContactAt)) return false;
        if (q && ![fullName(l), l.email ?? "", l.telefono ?? ""].some((s) => s.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getLead(id: string): Promise<LeadDetail | null> {
    const s = store();
    const lead = s.leads.find((l) => l.id === id);
    if (!lead) return null;
    return {
      lead,
      events: s.events.filter((e) => e.leadId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      tasks: s.tasks.filter((t) => t.leadId === id).sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? "")),
    };
  },

  async moveStage(id, etapa, motivo) {
    const s = store();
    const l = s.leads.find((x) => x.id === id);
    if (!l || !ETAPAS.includes(etapa) || l.etapa === etapa) return;
    if (etapa === "perdido" && !motivo) throw new Error("El motivo de pérdida es obligatorio");
    const de = l.etapa;
    l.etapa = etapa;
    l.etapaDesde = new Date().toISOString();
    if (!l.etapasAlcanzadas.includes(etapa)) l.etapasAlcanzadas.push(etapa);
    l.motivoPerdida = etapa === "perdido" ? motivo! : null;
    if (etapa === "ganado" || etapa === "perdido") for (const t of s.tasks) if (t.leadId === id && !t.doneAt) t.doneAt = new Date().toISOString();
    s.events.push({ id: `e${s.seq++}`, leadId: id, createdAt: l.etapaDesde, tipo: "cambio_etapa", detalle: `${de} → ${etapa}`, authorName: USERS[0].nombre, efectivo: null });
  },

  async addEvent(id, e) {
    const s = store();
    const l = s.leads.find((x) => x.id === id);
    if (!l) return;
    const at = new Date().toISOString();
    s.events.push({ id: `e${s.seq++}`, leadId: id, createdAt: at, tipo: e.tipo as EventTipo, detalle: e.detalle ?? null, authorName: USERS[0].nombre, efectivo: e.efectivo ?? null });
    if (["llamada", "email", "whatsapp", "visita"].includes(e.tipo)) {
      l.contactAttempts += 1;
      if (!l.firstContactAt && (e.efectivo ?? true)) l.firstContactAt = at;
    }
  },

  async setOwner(id, ownerId) {
    const s = store();
    const l = s.leads.find((x) => x.id === id);
    if (!l) return;
    const u = USERS.find((x) => x.id === ownerId) ?? null;
    l.ownerId = u?.id ?? null;
    l.ownerName = u?.nombre ?? null;
    for (const t of s.tasks) if (t.leadId === id && !t.doneAt) { t.ownerId = l.ownerId; t.ownerName = l.ownerName; }
    s.events.push({ id: `e${s.seq++}`, leadId: id, createdAt: new Date().toISOString(), tipo: "asignacion", detalle: u ? `Asignado a ${u.nombre}` : "Sin responsable", authorName: USERS[0].nombre, efectivo: null });
  },

  async listTasks(f = {}) {
    return store().tasks
      .filter((t) => (!f.soloAbiertas || !t.doneAt) && (!f.owner || t.ownerId === f.owner))
      .sort((a, b) => (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9"));
  },

  async completeTask(id) {
    const t = store().tasks.find((x) => x.id === id);
    if (t && !t.doneAt) t.doneAt = new Date().toISOString();
  },

  async hoyStats(): Promise<HoyStats> {
    const s = store();
    const now = Date.now();
    const nuevos = s.leads.filter((l) => l.etapa === "nuevo" && !l.firstContactAt);
    const abiertas = s.tasks.filter((t) => !t.doneAt && t.dueAt);
    const ult7 = s.leads.filter((l) => now - Date.parse(l.createdAt) < 7 * 24 * H);
    const contactadosRapido = ult7.filter((l) => l.firstContactAt && Date.parse(l.firstContactAt) - Date.parse(l.createdAt) < 24 * H);
    const finDeHoy = new Date(); finDeHoy.setHours(23, 59, 59, 999);
    return {
      sinContactar: nuevos.length,
      sinContactarMas24h: nuevos.filter((l) => now - Date.parse(l.createdAt) > 24 * H).length,
      tareasVencidas: abiertas.filter((t) => Date.parse(t.dueAt!) < now).length,
      tareasHoy: abiertas.filter((t) => Date.parse(t.dueAt!) >= now && Date.parse(t.dueAt!) <= finDeHoy.getTime()).length,
      leadsUltimos7: ult7.length,
      contactadosEn24hPct: ult7.length ? Math.round((contactadosRapido.length / ult7.length) * 100) : null,
    };
  },
};
