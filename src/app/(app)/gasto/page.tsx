import type { RawSearch } from "@/components/LeadFilters";
import { getContext } from "@/lib/data/repo";
import { fmtDate, nowMs } from "@/lib/format";
import { addSpendAction, importSpendCsvAction } from "./actions";

const eur = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function GastoPage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const raw = await searchParams;
  const { repo, user } = await getContext();
  const [spend, ads] = await Promise.all([repo.listSpend(), repo.listAds()]);
  const isAdmin = user.role === "admin";

  const desde = new Date(nowMs() - 30 * 24 * 3_600_000).toISOString().slice(0, 10);
  const porAnuncio = new Map<string, { gasto: number; dias: Set<string> }>();
  for (const s of spend.filter((x) => x.day >= desde)) {
    const k = s.ad ?? "(sin anuncio)";
    const g = porAnuncio.get(k) ?? { gasto: 0, dias: new Set<string>() };
    g.gasto += s.spend; g.dias.add(s.day);
    porAnuncio.set(k, g);
  }
  const resumen = [...porAnuncio].sort((a, b) => b[1].gasto - a[1].gasto);
  const total = resumen.reduce((a, [, g]) => a + g.gasto, 0);
  const recientes = [...spend].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 15);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Publicidad</div>
          <h1>Campañas y gasto</h1>
          <p>El gasto por anuncio permite calcular el coste por lead, por visita y por cierre en Reportes.</p>
        </div>
      </div>

      {one(raw.ok) && <div className="notice form-success" role="status" style={{ marginBottom: 12 }}>{one(raw.ok)}</div>}
      {one(raw.aviso) && <div className="notice" role="status" style={{ marginBottom: 12 }}>{one(raw.aviso)}</div>}
      {one(raw.err) && <div className="notice form-error" role="alert" style={{ marginBottom: 12 }}>{one(raw.err)}</div>}

      <section className="stat-grid">
        <div className="stat-tile stat-tile-brand"><div className="stat-tile-head"><span className="stat-tile-label">Gasto (30 días)</span></div><div className="stat-tile-value">{eur(total)}</div><div className="stat-tile-detail">{resumen.length} anuncio{resumen.length === 1 ? "" : "s"} con gasto</div></div>
      </section>

      <div className="lead-grid" style={{ marginTop: 22 }}>
        <section className="card section-card">
          <div className="panel-head"><div><h2>Gasto por anuncio</h2><p className="panel-subtitle">Últimos 30 días</p></div></div>
          <div className="panel-body">
            <div className="data-table-wrap"><div className="data-table-scroll">
              <table className="data-table">
                <thead><tr><th>Anuncio</th><th data-align="right">Días con gasto</th><th data-align="right">Gasto</th></tr></thead>
                <tbody>
                  {resumen.length === 0 && <tr><td colSpan={3} className="data-table-empty">Todavía no hay gasto cargado.</td></tr>}
                  {resumen.map(([ad, g]) => (<tr key={ad}><td data-label="Anuncio">{ad}</td><td data-label="Días" data-align="right">{g.dias.size}</td><td data-label="Gasto" data-align="right">{eur(g.gasto)}</td></tr>))}
                </tbody>
              </table>
            </div></div>
            {recientes.length > 0 && (
              <>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, margin: "20px 0 6px" }}>Últimas filas cargadas</h3>
                {recientes.map((s, i) => (<div className="task-row" key={`${s.day}-${s.ad}-${i}`}><span>{fmtDate(`${s.day}T12:00:00Z`)} · {s.ad ?? "—"}</span><strong>{eur(s.spend)}</strong></div>))}
              </>
            )}
          </div>
        </section>

        <div className="stack">
          <section className="card section-card">
            <div className="panel-head"><div><h2>Importar desde Meta</h2><p className="panel-subtitle">CSV del Administrador de anuncios</p></div></div>
            <div className="panel-body">
              {isAdmin ? (
                <form action={importSpendCsvAction} className="stack">
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "var(--muted)" }}>
                    <li>En el Administrador de anuncios, pestaña <strong>Anuncios</strong>, elige el periodo.</li>
                    <li><strong>Desglose → Por tiempo → Día</strong>.</li>
                    <li><strong>Exportar → Exportar datos de la tabla (.csv)</strong>.</li>
                  </ol>
                  <input type="file" name="file" accept=".csv,text/csv" className="input" required />
                  <div><button className="btn btn-primary" type="submit">Importar CSV</button></div>
                </form>
              ) : <p className="empty-state">Solo un administrador puede cargar gasto.</p>}
            </div>
          </section>

          <section className="card section-card">
            <div className="panel-head"><div><h2>Añadir a mano</h2></div></div>
            <div className="panel-body">
              {isAdmin ? (
                <form action={addSpendAction} className="stack">
                  <div className="field"><label htmlFor="day">Día</label><input id="day" name="day" type="date" className="input" required /></div>
                  <div className="field"><label htmlFor="ad">Anuncio</label><input id="ad" name="ad" className="input" list="ads" placeholder="Ej.: AD01 - CASAS MODULARES CORUÑA" required /><datalist id="ads">{ads.map((a) => <option key={a} value={a} />)}</datalist></div>
                  <div className="field"><label htmlFor="spend">Importe (€)</label><input id="spend" name="spend" inputMode="decimal" className="input" placeholder="12,50" required /></div>
                  <div><button className="btn btn-secondary" type="submit">Guardar</button></div>
                </form>
              ) : <p className="empty-state">Solo un administrador puede cargar gasto.</p>}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
