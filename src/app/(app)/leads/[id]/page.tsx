import Link from "next/link";
import { notFound } from "next/navigation";
import { addEventAction, completeTaskAction, setOwnerAction } from "@/app/actions";
import { StageForm } from "@/components/StageForm";
import { getRepo } from "@/lib/data/repo";
import {
  ETAPA_BADGE, ETAPA_LABEL, ETAPA_PROYECTO_LABEL, INTERES_LABEL, MOTIVO_LABEL, TERRENO_LABEL, type EventTipo,
} from "@/lib/data/types";
import { ago, fmtDateTime, fmtPhone, fullName, hoursSince, nowMs } from "@/lib/format";

const TIPO_LABEL: Record<EventTipo, string> = {
  nota: "Nota", llamada: "Llamada", email: "Email", whatsapp: "WhatsApp", visita: "Visita",
  cambio_etapa: "Cambio de fase", asignacion: "Asignación", reingreso: "Volvió a escribir", importacion: "Importación", sistema: "Sistema",
};
const PERFIL_LABEL: Record<string, string> = { edad_rango: "Edad", hogar: "Hogar", motivo: "Motivo", situacion_vivienda: "Vivienda actual" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const [detail, users] = await Promise.all([repo.getLead(id), repo.listUsers()]);
  if (!detail) notFound();
  const { lead: l, events, tasks } = detail;
  const abiertas = tasks.filter((t) => !t.doneAt);
  const esperando = l.etapa === "nuevo" && !l.firstContactAt;
  const kv = (label: string, value: React.ReactNode) => (<><dt>{label}</dt><dd>{value ?? "—"}</dd></>);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow"><Link href="/leads" className="lead-link">← Leads</Link></div>
          <h1>{fullName(l)}</h1>
          <p>
            <span className={`badge ${ETAPA_BADGE[l.etapa]}`}>{ETAPA_LABEL[l.etapa]}</span>{" "}
            {l.prioridad === "alta" && <span className="badge badge-warning">Prioridad alta</span>}{" "}
            <span style={{ color: "var(--muted)" }}>Alta {ago(l.createdAt)} · {l.contactAttempts} intento{l.contactAttempts === 1 ? "" : "s"} de contacto</span>
          </p>
        </div>
        <div className="actions">
          {l.telefono && <a className="btn btn-secondary" href={`tel:${l.telefono}`}>Llamar</a>}
          {l.telefono && <a className="btn btn-secondary" href={`https://wa.me/${l.telefono.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          {l.email && <a className="btn btn-secondary" href={`mailto:${l.email}`}>Email</a>}
        </div>
      </div>

      {esperando && (
        <div className="notice form-error" role="status" style={{ marginBottom: 14 }}>
          Este lead lleva {Math.round(hoursSince(l.createdAt))} h sin ningún contacto. Regístralo aquí en cuanto lo llames o le escribas.
        </div>
      )}

      <div className="lead-grid">
        <div className="stack">
          <section className="card section-card">
            <div className="panel-head"><div><h2>Registrar contacto</h2><p className="panel-subtitle">Cada llamada o mensaje queda en el historial y cuenta como intento</p></div></div>
            <div className="panel-body">
              <form action={addEventAction} className="stack">
                <input type="hidden" name="id" value={l.id} />
                <div className="inline-form">
                  <select name="tipo" className="select" defaultValue="llamada" aria-label="Tipo">
                    <option value="llamada">Llamada</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option>
                    <option value="visita">Visita / reunión</option><option value="nota">Solo una nota</option>
                  </select>
                  <select name="efectivo" className="select" defaultValue="si" aria-label="Resultado">
                    <option value="si">Hablé con la persona</option><option value="no">Sin respuesta</option>
                  </select>
                </div>
                <textarea name="detalle" className="textarea" rows={3} placeholder="Qué se habló, qué falta, próximos pasos…" />
                <div><button className="btn btn-primary" type="submit">Guardar</button></div>
              </form>
            </div>
          </section>

          <section className="card section-card">
            <div className="panel-head"><div><h2>Historial</h2></div></div>
            <div className="panel-body">
              <ol className="timeline">
                {events.map((e) => (
                  <li key={e.id}>
                    <span className={`dot${["sistema", "importacion", "cambio_etapa", "asignacion"].includes(e.tipo) ? " sys" : ""}`} />
                    <div>
                      <strong style={{ fontSize: 14 }}>{TIPO_LABEL[e.tipo]}{e.efectivo === false ? " · sin respuesta" : ""}</strong>{" "}
                      <time dateTime={e.createdAt}>{fmtDateTime(e.createdAt)}{e.authorName ? ` · ${e.authorName}` : ""}</time>
                      {e.detalle && <p>{e.detalle}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card section-card">
            <div className="panel-head"><div><h2>Gestión</h2></div></div>
            <div className="panel-body stack">
              <StageForm id={l.id} etapa={l.etapa} />
              <form action={setOwnerAction} className="inline-form">
                <input type="hidden" name="id" value={l.id} />
                <select name="owner" className="select" defaultValue={l.ownerId ?? ""} aria-label="Responsable">
                  <option value="">Sin responsable</option>{users.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
                <button className="btn btn-secondary btn-small" type="submit">Asignar</button>
              </form>
              {l.etapa === "perdido" && <p style={{ margin: 0 }}>Motivo de pérdida: <strong>{l.motivoPerdida ? MOTIVO_LABEL[l.motivoPerdida] ?? l.motivoPerdida : "—"}</strong></p>}
            </div>
          </section>

          <section className="card section-card">
            <div className="panel-head"><div><h2>Tareas</h2></div></div>
            <div className="panel-body">
              {abiertas.length === 0 && <p className="empty-state">Sin tareas abiertas.</p>}
              {abiertas.map((t) => (
                <div className="task-row" key={t.id}>
                  <div>{t.titulo}<div style={{ color: "var(--muted)", fontSize: 12.5 }}><span className={t.dueAt && Date.parse(t.dueAt) < nowMs() ? "task-due-late" : ""}>{ago(t.dueAt)}</span>{t.ownerName ? ` · ${t.ownerName}` : ""}</div></div>
                  <form action={completeTaskAction}><input type="hidden" name="id" value={t.id} /><button className="btn btn-small btn-soft" type="submit">Hecha</button></form>
                </div>
              ))}
            </div>
          </section>

          <section className="card section-card">
            <div className="panel-head"><div><h2>Datos</h2></div></div>
            <div className="panel-body">
              <dl className="kv">
                {kv("Teléfono", fmtPhone(l.telefono))}
                {kv("Email", l.email)}
                {kv("Municipio", l.municipio)}
                {kv("Interés", l.interes ? INTERES_LABEL[l.interes] ?? l.interes : null)}
                {kv("Etapa del proyecto", l.etapaProyecto ? ETAPA_PROYECTO_LABEL[l.etapaProyecto] ?? l.etapaProyecto : null)}
                {kv("Terreno", l.terreno ? TERRENO_LABEL[l.terreno] ?? l.terreno : null)}
                {kv("Superficie", l.superficieRango)}
                {kv("Presupuesto", l.presupuestoRango)}
                {kv("Plazo", l.plazo)}
                {Object.entries(l.perfil).map(([k, v]) => kv(PERFIL_LABEL[k] ?? k, v))}
              </dl>
              {l.tags.length > 0 && <div style={{ marginTop: 12 }}>{l.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>}
            </div>
          </section>

          <section className="card section-card">
            <div className="panel-head"><div><h2>Origen</h2><p className="panel-subtitle">Para medir qué anuncio trae leads que compran</p></div></div>
            <div className="panel-body">
              <dl className="kv">
                {kv("Canal", l.source)}
                {kv("Campaña", l.campaign)}
                {kv("Conjunto", l.adset)}
                {kv("Anuncio", l.ad)}
                {kv("Consentimiento", l.consentAt ? fmtDateTime(l.consentAt) : "Sin registro")}
              </dl>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
