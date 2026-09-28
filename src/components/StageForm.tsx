"use client";

import { useState, useTransition } from "react";
import { moveStageAction } from "@/app/actions";
import { ETAPAS, ETAPA_LABEL, MOTIVOS_PERDIDA, type Etapa } from "@/lib/data/types";

export function StageForm({ id, etapa }: { id: string; etapa: Etapa }) {
  const [value, setValue] = useState<Etapa>(etapa);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const needsMotivo = value === "perdido" && etapa !== "perdido";
  const changed = value !== etapa;

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await moveStageAction(id, value, needsMotivo ? motivo : undefined);
          if (!r.ok) setError(r.error ?? "No se pudo cambiar la fase");
        });
      }}
    >
      <div className="inline-form">
        <select className="select" value={value} onChange={(e) => setValue(e.target.value as Etapa)} aria-label="Fase">
          {ETAPAS.map((e) => <option key={e} value={e}>{ETAPA_LABEL[e]}</option>)}
        </select>
        <button className="btn btn-secondary btn-small" type="submit" disabled={!changed || pending || (needsMotivo && !motivo)}>Cambiar fase</button>
      </div>
      {needsMotivo && (
        <select className="select" value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-label="Motivo de pérdida" required>
          <option value="">Motivo de pérdida (obligatorio)</option>
          {MOTIVOS_PERDIDA.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      )}
      {error && <p className="form-error" role="alert" style={{ margin: 0 }}>{error}</p>}
    </form>
  );
}
