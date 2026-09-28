import Link from "next/link";
import type { RawSearch } from "@/components/LeadFilters";
import { getRepo } from "@/lib/data/repo";
import { ETAPA_LABEL, MOTIVO_LABEL } from "@/lib/data/types";
import { nowMs } from "@/lib/format";
import { byAd, funnel, lostReasons, perDay, responseTimes, totals } from "@/lib/reports";

const PERIODOS = [["7", "7 días"], ["30", "30 días"], ["90", "90 días"], ["todo", "Todo"]] as const;
const eur = (n: number | null, dec = 2) => (n === null ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n));
const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(n < 10 ? 1 : 0).replace(".", ",")} %`);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ReportesPage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const raw = await searchParams;
  const p = PERIODOS.some(([k]) => k === one(raw.p)) ? one(raw.p)! : "30";
  const now = nowMs();
  const desde = p === "todo" ? undefined : new Date(now - Number(p) * 24 * 3_600_000).toISOString();
  const range = { desde };

  const repo = await getRepo();
  const [all, spend] = await Promise.all([repo.listLeads({ incluirCerrados: true }), repo.listSpend()]);
  const leads = all.filter((l) => !desde || l.createdAt >= desde);
  const t = totals(all, spend, range);
  const rt = responseTimes(leads);
  const steps = funnel(leads);
  const ads = byAd(all, spend, range);
  const lost = lostReasons(leads);
  const days = perDay(all, p === "todo" ? 30 : Math.min(Number(p), 90), now);
  const max = Math.max(1, ...days.map((d) => d.n));

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Análisis</div>
          <h1>Reportes</h1>
          <p>Qué anuncios traen leads, cuánto cuesta cada uno y en qué punto se pierden.</p>
        </div>
        <nav className="actions" aria-label="Periodo">
          {PERIODOS.map(([k, label]) => (
            <Link key={k} href={`/reportes?p=${k}`} className={`btn btn-small ${p === k ? "btn-primary" : "btn-secondary"}`} aria-current={p === k ? "true" : undefined}>{label}</Link>
          ))}
        </nav>
      </div>

      <section className="stat-grid">
        <div className="stat-tile stat-tile-brand"><div className="stat-tile-head"><span className="stat-tile-label">Leads</span></div><div className="stat-tile-value">{t.leads}</div><div className="stat-tile-detail">Gasto: {eur(t.gasto, 0)}</div></div>
        <div className="stat-tile stat-tile-info"><div className="stat-tile-head"><span className="stat-tile-label">Coste por lead</span></div><div className="stat-tile-value">{eur(t.cpl)}</div><div className="stat-tile-detail">Gasto publicitario entre leads</div></div>
        <div className={`stat-tile ${t.ganados ? "stat-tile-good" : "stat-tile-warning"}`}><div className="stat-tile-head"><span className="stat-tile-label">Coste por cierre</span></div><div className="stat-tile-value">{eur(t.costeCierre, 0)}</div><div className="stat-tile-detail">{t.ganados} cierre{t.ganados === 1 ? "" : "s"} · tasa {pct(t.tasaCierre)}</div></div>
        <div className={`stat-tile ${(rt.pctEn24h ?? 0) >= 80 ? "stat-tile-good" : "stat-tile-critical"}`}><div className="stat-tile-head"><span className="stat-tile-label">Contactados en 24 h</span></div><div className="stat-tile-value">{pct(rt.pctEn24h)}</div><div className="stat-tile-detail">Mediana: {rt.medianaHoras === null ? "—" : `${rt.medianaHoras.toFixed(1).replace(".", ",")} h`} · {rt.sinContactar} sin contactar</div></div>
      </section>

      <section className="card section-card" style={{ marginTop: 22 }}>
        <div className="panel-head"><div><h2>Leads por día</h2><p className="panel-subtitle">Últimos {days.length} días</p></div></div>
        <div className="panel-body">
          <div className="bars" role="img" aria-label={`Leads por día, máximo ${max}`}>
            {days.map((d) => (<div key={d.day} className="bar" title={`${d.day}: ${d.n}`}><span style={{ height: `${(d.n / max) * 100}%` }} /></div>))}
          </div>
        </div>
      </section>

      <div className="lead-grid" style={{ marginTop: 22 }}>
        <section className="card section-card">
          <div className="panel-head"><div><h2>Rendimiento por anuncio</h2><p className="panel-subtitle">El gasto se carga en «Campañas y gasto»</p></div></div>
          <div className="panel-body">
            <div className="data-table-wrap"><div className="data-table-scroll">
              <table className="data-table">
                <thead><tr><th>Anuncio</th><th data-align="right">Leads</th><th data-align="right">Visitas</th><th data-align="right">Propuestas</th><th data-align="right">Cierres</th><th data-align="right">Gasto</th><th data-align="right">€/lead</th><th data-align="right">€/cierre</th></tr></thead>
                <tbody>
                  {ads.length === 0 && <tr><td colSpan={8} className="data-table-empty">Sin datos en el periodo.</td></tr>}
                  {ads.map((r) => (
                    <tr key={r.ad} data-tone={r.sinContactarPct > 50 || (r.leads === 0 && r.gasto > 0) ? "attention" : undefined}>
                      <td data-label="Anuncio">{r.ad}<small>{r.leads === 0 ? "Gasto sin leads" : r.sinContactarPct > 0 ? `${Math.round(r.sinContactarPct)} % sin contactar` : "Todos contactados"}</small></td>
                      <td data-label="Leads" data-align="right">{r.leads}</td>
                      <td data-label="Visitas" data-align="right">{r.visitas}</td>
                      <td data-label="Propuestas" data-align="right">{r.propuestas}</td>
                      <td data-label="Cierres" data-align="right">{r.ganados}</td>
                      <td data-label="Gasto" data-align="right">{eur(r.gasto, 0)}</td>
                      <td data-label="€/lead" data-align="right">{eur(r.cpl)}</td>
                      <td data-label="€/cierre" data-align="right">{eur(r.costeCierre, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          </div>
        </section>

        <div className="stack">
          <section className="card section-card">
            <div className="panel-head"><div><h2>Embudo</h2><p className="panel-subtitle">Leads que llegaron a cada fase</p></div></div>
            <div className="panel-body stack">
              {steps.map((s) => (
                <div key={s.etapa}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span>{ETAPA_LABEL[s.etapa]}</span>
                    <span><strong>{s.leads}</strong> <span style={{ color: "var(--muted)" }}>· {pct(s.pctDelTotal)}{s.pctDelPaso !== null ? ` · ${pct(s.pctDelPaso)} del paso anterior` : ""}</span></span>
                  </div>
                  <div className="meter"><span style={{ width: `${Math.max(2, s.pctDelTotal)}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="card section-card">
            <div className="panel-head"><div><h2>Motivos de pérdida</h2></div></div>
            <div className="panel-body">
              {lost.length === 0 && <p className="empty-state">Sin leads perdidos en el periodo.</p>}
              {lost.map((m) => (
                <div className="task-row" key={m.motivo}><span>{MOTIVO_LABEL[m.motivo] ?? m.motivo}</span><span><strong>{m.n}</strong> <span style={{ color: "var(--muted)" }}>· {pct(m.pct)}</span></span></div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
