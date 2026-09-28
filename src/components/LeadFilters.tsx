import Link from "next/link";
import { ETAPAS, ETAPA_LABEL, INTERES_LABEL, type Etapa, type LeadFilters, type UserRow } from "@/lib/data/types";

export type RawSearch = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export function parseFilters(raw: RawSearch): LeadFilters {
  const etapa = one(raw.etapa);
  return {
    q: one(raw.q),
    etapa: etapa && (ETAPAS as readonly string[]).includes(etapa) ? (etapa as Etapa) : undefined,
    owner: one(raw.owner),
    ad: one(raw.ad),
    interes: one(raw.interes),
    sinContactar: one(raw.sinContactar) === "1",
  };
}

/** Formulario de filtros por GET: se puede compartir la URL y no necesita JavaScript. */
export function LeadFiltersForm({ action, raw, users, ads, withEtapa = false }: { action: string; raw: RawSearch; users: UserRow[]; ads: string[]; withEtapa?: boolean }) {
  return (
    <form className="filters" action={action} method="get">
      <div className="field"><label htmlFor="q">Buscar</label><input id="q" name="q" className="input" placeholder="Nombre, email o teléfono" defaultValue={one(raw.q)} /></div>
      {withEtapa && (
        <div className="field"><label htmlFor="etapa">Fase</label>
          <select id="etapa" name="etapa" className="select" defaultValue={one(raw.etapa) ?? ""}>
            <option value="">Todas</option>{ETAPAS.map((e) => <option key={e} value={e}>{ETAPA_LABEL[e]}</option>)}
          </select></div>
      )}
      <div className="field"><label htmlFor="owner">Responsable</label>
        <select id="owner" name="owner" className="select" defaultValue={one(raw.owner) ?? ""}>
          <option value="">Todos</option><option value="sin">Sin asignar</option>{users.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select></div>
      <div className="field"><label htmlFor="ad">Anuncio</label>
        <select id="ad" name="ad" className="select" defaultValue={one(raw.ad) ?? ""}>
          <option value="">Todos</option>{ads.map((a) => <option key={a} value={a}>{a}</option>)}
        </select></div>
      <div className="field"><label htmlFor="interes">Interés</label>
        <select id="interes" name="interes" className="select" defaultValue={one(raw.interes) ?? ""}>
          <option value="">Todos</option>{Object.entries(INTERES_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></div>
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14, paddingBottom: 10 }}>
        <input type="checkbox" name="sinContactar" value="1" defaultChecked={one(raw.sinContactar) === "1"} /> Solo sin contactar
      </label>
      <div className="actions" style={{ paddingBottom: 4 }}>
        <button className="btn btn-primary btn-small" type="submit">Filtrar</button>
        <Link className="btn btn-tertiary btn-small" href={action}>Limpiar</Link>
      </div>
    </form>
  );
}
