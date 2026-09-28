import Link from "next/link";
import { LeadFiltersForm, parseFilters, type RawSearch } from "@/components/LeadFilters";
import { getRepo } from "@/lib/data/repo";
import { ETAPA_BADGE, ETAPA_LABEL, INTERES_LABEL } from "@/lib/data/types";
import { ago, fmtDate, fmtPhone, fullName, hoursSince } from "@/lib/format";

const PAGE_SIZE = 50;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const raw = await searchParams;
  const filters = { ...parseFilters(raw), incluirCerrados: true };
  const repo = await getRepo();
  const [all, users, ads] = await Promise.all([repo.listLeads(filters), repo.listUsers(), repo.listAds()]);
  const page = Math.max(1, Number(Array.isArray(raw.p) ? raw.p[0] : raw.p) || 1);
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const rows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const qs = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) { const s = Array.isArray(v) ? v[0] : v; if (s && k !== "p") sp.set(k, s); }
    sp.set("p", String(p));
    return `/leads?${sp}`;
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Comercial</div>
          <h1>Leads</h1>
          <p>{all.length.toLocaleString("es-ES")} leads con los filtros actuales.</p>
        </div>
      </div>
      <LeadFiltersForm action="/leads" raw={raw} users={users} ads={ads} withEtapa />

      <div className="data-table-wrap"><div className="data-table-scroll">
        <table className="data-table">
          <thead><tr><th>Lead</th><th>Fase</th><th>Contacto</th><th>Interés</th><th>Anuncio</th><th>Responsable</th><th data-align="right">Alta</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="data-table-empty">Ningún lead coincide con los filtros.</td></tr>}
            {rows.map((l) => (
              <tr key={l.id} data-tone={l.etapa === "nuevo" && !l.firstContactAt && hoursSince(l.createdAt) > 24 ? "attention" : undefined}>
                <td data-label="Lead"><Link className="lead-link" href={`/leads/${l.id}`}>{fullName(l)}</Link><small>{l.municipio ?? "—"}</small></td>
                <td data-label="Fase"><span className={`badge ${ETAPA_BADGE[l.etapa]}`}>{ETAPA_LABEL[l.etapa]}</span></td>
                <td data-label="Contacto">{fmtPhone(l.telefono)}<small>{l.email ?? "—"}</small></td>
                <td data-label="Interés">{l.interes ? INTERES_LABEL[l.interes] ?? l.interes : "—"}</td>
                <td data-label="Anuncio"><small style={{ color: "inherit" }}>{l.ad ?? "—"}</small></td>
                <td data-label="Responsable">{l.ownerName ?? <span className="badge badge-critical">Sin asignar</span>}</td>
                <td data-label="Alta" data-align="right">{fmtDate(l.createdAt)}<small>{ago(l.createdAt)}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>

      {pages > 1 && (
        <nav className="actions" style={{ marginTop: 14, justifyContent: "flex-end", alignItems: "center" }} aria-label="Paginación">
          {page > 1 && <Link className="btn btn-secondary btn-small" href={qs(page - 1)}>← Anterior</Link>}
          <span style={{ color: "var(--muted)", fontSize: 14 }}>Página {page} de {pages}</span>
          {page < pages && <Link className="btn btn-secondary btn-small" href={qs(page + 1)}>Siguiente →</Link>}
        </nav>
      )}
    </>
  );
}
