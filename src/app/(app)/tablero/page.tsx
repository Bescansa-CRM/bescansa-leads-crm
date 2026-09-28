import { KanbanBoard, type CardData } from "@/components/KanbanBoard";
import { LeadFiltersForm, parseFilters, type RawSearch } from "@/components/LeadFilters";
import { getRepo } from "@/lib/data/repo";
import { ago, fullName, hoursSince, initials } from "@/lib/format";

export default async function TableroPage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const raw = await searchParams;
  const filters = { ...parseFilters(raw), incluirCerrados: true };
  const repo = await getRepo();
  const [leads, users, ads] = await Promise.all([repo.listLeads(filters), repo.listUsers(), repo.listAds()]);

  const cards: CardData[] = leads.map((l) => ({
    id: l.id,
    nombre: fullName(l),
    telefono: l.telefono,
    ad: l.ad,
    owner: l.ownerName,
    ownerInitials: initials(l.ownerName),
    etapa: l.etapa,
    prioridad: l.prioridad,
    edad: ago(l.etapa === "nuevo" ? l.createdAt : l.etapaDesde),
    urgente: l.etapa === "nuevo" && !l.firstContactAt && hoursSince(l.createdAt) > 0.5,
    intentos: l.contactAttempts,
  }));

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Comercial</div>
          <h1>Tablero</h1>
          <p>Arrastra un lead a otra columna para cambiar su fase. Al pasar a Perdido se pide el motivo.</p>
        </div>
      </div>
      <LeadFiltersForm action="/tablero" raw={raw} users={users} ads={ads} />
      <KanbanBoard cards={cards} />
    </>
  );
}
