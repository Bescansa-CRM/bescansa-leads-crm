"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { moveStageAction } from "@/app/actions";
import { ETAPAS, ETAPA_LABEL, ETAPA_TONE, MOTIVOS_PERDIDA, type Etapa } from "@/lib/data/types";

export interface CardData {
  id: string;
  nombre: string;
  telefono: string | null;
  ad: string | null;
  owner: string | null;
  ownerInitials: string;
  etapa: Etapa;
  prioridad: "alta" | "normal" | "baja";
  edad: string;          // "hace 3 h" desde el alta
  urgente: boolean;      // nuevo y sin contactar hace más de 30 min
  intentos: number;
}

export function KanbanBoard({ cards }: { cards: CardData[] }) {
  const [pending, start] = useTransition();
  const [over, setOver] = useState<Etapa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lost, setLost] = useState<{ id: string; nombre: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const motivo = useRef<HTMLSelectElement>(null);

  function move(id: string, etapa: Etapa, m?: string) {
    setError(null);
    start(async () => {
      const r = await moveStageAction(id, etapa, m);
      if (!r.ok) setError(r.error ?? "No se pudo mover el lead");
    });
  }

  function onDrop(e: React.DragEvent, etapa: Etapa) {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/lead");
    const card = cards.find((c) => c.id === id);
    if (!card || card.etapa === etapa) return;
    if (etapa === "perdido") {
      setLost({ id, nombre: card.nombre });
      dialog.current?.showModal();
      return;
    }
    move(id, etapa);
  }

  return (
    <>
      {error && <div className="notice form-error" role="alert">{error}</div>}
      <div className="kanban" aria-busy={pending}>
        {ETAPAS.map((etapa) => {
          const col = cards.filter((c) => c.etapa === etapa);
          return (
            <section
              key={etapa}
              className={`kanban-col${over === etapa ? " is-over" : ""}`}
              data-tone={ETAPA_TONE[etapa]}
              onDragOver={(e) => { e.preventDefault(); setOver(etapa); }}
              onDragLeave={() => setOver((o) => (o === etapa ? null : o))}
              onDrop={(e) => onDrop(e, etapa)}
              aria-label={`${ETAPA_LABEL[etapa]}: ${col.length}`}
            >
              <header className="kanban-head"><strong>{ETAPA_LABEL[etapa]}</strong><span className="kanban-count">{col.length}</span></header>
              <div className="kanban-list">
                {col.slice(0, 60).map((c) => (
                  <Link
                    key={c.id}
                    href={`/leads/${c.id}`}
                    className={`kanban-card${c.urgente ? " is-urgent" : ""}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/lead", c.id)}
                  >
                    <div className="kanban-card-top">
                      <strong>{c.nombre}</strong>
                      {c.prioridad === "alta" && <span className="badge badge-warning">Alta</span>}
                    </div>
                    <div className="kanban-card-meta">{c.telefono ?? "sin teléfono"}</div>
                    {c.ad && <div className="kanban-card-ad" title={c.ad}>{c.ad}</div>}
                    <div className="kanban-card-foot">
                      <span title={c.owner ?? "Sin responsable"} className={`avatar avatar-sm${c.owner ? "" : " avatar-empty"}`}>{c.ownerInitials}</span>
                      <span className="kanban-card-age">{c.urgente ? "Sin contactar · " : ""}{c.edad}{c.intentos ? ` · ${c.intentos} int.` : ""}</span>
                    </div>
                  </Link>
                ))}
                {col.length > 60 && <p className="kanban-more">Y {col.length - 60} más. Usa Leads para verlos todos.</p>}
                {col.length === 0 && <p className="kanban-empty">Sin leads</p>}
              </div>
            </section>
          );
        })}
      </div>

      <dialog ref={dialog} className="crm-dialog" onClose={() => setLost(null)}>
        <form
          method="dialog"
          onSubmit={(e) => {
            const value = motivo.current?.value;
            if (!value || !lost || (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "cancel") return;
            move(lost.id, "perdido", value);
          }}
        >
          <h2>Marcar como perdido</h2>
          <p className="panel-subtitle">{lost?.nombre}. Indica el motivo para poder medir por qué se pierden leads.</p>
          <div className="field">
            <label htmlFor="motivo">Motivo</label>
            <select id="motivo" ref={motivo} className="select" defaultValue="" required>
              <option value="" disabled>Elige un motivo</option>
              {MOTIVOS_PERDIDA.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn btn-tertiary" value="cancel" formNoValidate>Cancelar</button>
            <button className="btn btn-primary" value="ok">Marcar como perdido</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
