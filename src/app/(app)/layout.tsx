import { NavLink } from "@/components/NavLink";
import { logoutAction } from "@/app/login/actions";
import { getContext } from "@/lib/data/repo";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { repo, user: me } = await getContext();
  return (
    <div className="admin-grid">
      <aside className="sidebar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="brand"><img src="/brand/bescansa-logo-color.png" alt="Estudio Bescansa" /></div>
        <nav className="sidebar-nav" aria-label="Principal">
          <div className="sidebar-group">
            <NavLink href="/" icon="◧" exact>Hoy</NavLink>
            <NavLink href="/tablero" icon="▦">Tablero</NavLink>
            <NavLink href="/leads" icon="☰">Leads</NavLink>
            <NavLink href="/reportes" icon="◔">Reportes</NavLink>
            <NavLink href="/gasto" icon="€">Campañas y gasto</NavLink>
          </div>
          <div className="sidebar-group">
            <div className="sidebar-group-label">Próximamente</div>
            <span className="sidebar-link" aria-disabled="true" style={{ opacity: 0.45, cursor: "default" }}><span className="nav-icon">⇪</span>Importar</span>
          </div>
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <span className="avatar">{me.nombre.slice(0, 2).toUpperCase()}</span>
            <div><strong>{me.nombre}</strong><span>{me.email}</span></div>
          </div>
          {repo.mode === "supabase" && <form action={logoutAction}><button className="btn btn-tertiary btn-small" type="submit" style={{ marginTop: 8 }}>Salir</button></form>}
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-title"><strong>CRM de leads</strong><span>Estudio Bescansa · captación y ventas</span></div>
          {repo.mode === "demo" && <span className="environment-pill demo-pill" title="Datos ficticios en memoria: no se guarda nada">Modo demostración</span>}
        </header>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
