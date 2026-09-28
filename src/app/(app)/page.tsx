import Link from "next/link";
import { completeTaskAction } from "@/app/actions";
import { getRepo } from "@/lib/data/repo";
import { ago, fmtPhone, fullName, hoursSince, nowMs } from "@/lib/format";

export default async function HoyPage() {
  const repo = await getRepo();
  const [stats, tasks, sinContactar] = await Promise.all([
    repo.hoyStats(),
    repo.listTasks({ soloAbiertas: true }),
    repo.listLeads({ sinContactar: true }),
  ]);
  const now = nowMs();
  const vencidas = tasks.filter((t) => t.dueAt && Date.parse(t.dueAt) < now);
  const proximas = tasks.filter((t) => !t.dueAt || Date.parse(t.dueAt) >= now).slice(0, 8);
  const oldest = [...sinContactar].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 8);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Trabajo diario</div>
          <h1>Hoy</h1>
          <p>Lo primero es contactar a los leads nuevos: cada hora que pasa baja la probabilidad de cerrar.</p>
        </div>
        <div className="actions"><Link className="btn btn-primary" href="/tablero">Ver tablero</Link></div>
      </div>

      <section className="stat-grid">
        <Link className={`stat-tile ${stats.sinContactar ? "stat-tile-critical" : "stat-tile-good"}`} href="/leads?sinContactar=1">
          <div className="stat-tile-head"><span className="stat-tile-label">Sin contactar</span></div>
          <div className="stat-tile-value">{stats.sinContactar}</div>
          <div className="stat-tile-detail">{stats.sinContactarMas24h} llevan más de 24 h esperando</div>
          <span className="stat-tile-link-hint">Ver leads →</span>
        </Link>
        <div className={`stat-tile ${stats.tareasVencidas ? "stat-tile-warning" : "stat-tile-good"}`}>
          <div className="stat-tile-head"><span className="stat-tile-label">Tareas vencidas</span></div>
          <div className="stat-tile-value">{stats.tareasVencidas}</div>
          <div className="stat-tile-detail">{stats.tareasHoy} más vencen hoy</div>
        </div>
        <div className="stat-tile stat-tile-brand">
          <div className="stat-tile-head"><span className="stat-tile-label">Leads en 7 días</span></div>
          <div className="stat-tile-value">{stats.leadsUltimos7}</div>
          <div className="stat-tile-detail">Entradas de Meta, landing y otros</div>
        </div>
        <div className={`stat-tile ${(stats.contactadosEn24hPct ?? 0) >= 80 ? "stat-tile-good" : "stat-tile-warning"}`}>
          <div className="stat-tile-head"><span className="stat-tile-label">Contactados en 24 h</span></div>
          <div className="stat-tile-value">{stats.contactadosEn24hPct === null ? "—" : `${stats.contactadosEn24hPct} %`}</div>
          <div className="stat-tile-detail">Sobre los leads de los últimos 7 días</div>
        </div>
      </section>

      <div className="lead-grid" style={{ marginTop: 22 }}>
        <section className="card section-card">
          <div className="panel-head"><div><h2>Leads que llevan más tiempo esperando</h2><p className="panel-subtitle">Nuevos sin ningún contacto</p></div></div>
          <div className="panel-body">
            {oldest.length === 0 ? <p className="empty-state">No hay leads pendientes de contactar. </p> : (
              <div className="data-table-wrap"><div className="data-table-scroll">
                <table className="data-table">
                  <thead><tr><th>Lead</th><th>Teléfono</th><th>Responsable</th><th data-align="right">Espera</th></tr></thead>
                  <tbody>
                    {oldest.map((l) => (
                      <tr key={l.id} data-tone={hoursSince(l.createdAt) > 24 ? "attention" : undefined}>
                        <td data-label="Lead"><Link className="lead-link" href={`/leads/${l.id}`}>{fullName(l)}</Link><small>{l.ad ?? "Sin anuncio"}</small></td>
                        <td data-label="Teléfono">{fmtPhone(l.telefono)}</td>
                        <td data-label="Responsable">{l.ownerName ?? <span className="badge badge-critical">Sin asignar</span>}</td>
                        <td data-label="Espera" data-align="right">{ago(l.createdAt).replace("hace ", "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            )}
          </div>
        </section>

        <section className="card section-card">
          <div className="panel-head"><div><h2>Tareas</h2><p className="panel-subtitle">Vencidas y próximas</p></div></div>
          <div className="panel-body">
            {[...vencidas.slice(0, 6), ...proximas].length === 0 ? <p className="empty-state">Sin tareas abiertas.</p> : null}
            {[...vencidas.slice(0, 6), ...proximas].map((t) => {
              const late = t.dueAt ? Date.parse(t.dueAt) < now : false;
              return (
                <div className="task-row" key={t.id}>
                  <div>
                    <Link className="lead-link" href={`/leads/${t.leadId}`}>{t.leadName}</Link>
                    <div style={{ color: "var(--muted)", fontSize: 12.5 }}>{t.titulo} · <span className={late ? "task-due-late" : ""}>{ago(t.dueAt)}</span></div>
                  </div>
                  <form action={completeTaskAction}><input type="hidden" name="id" value={t.id} /><button className="btn btn-small btn-soft" type="submit">Hecha</button></form>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
