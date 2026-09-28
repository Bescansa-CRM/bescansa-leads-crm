import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { logoutAction } from "@/app/login/actions";
import { getContext } from "@/lib/data/repo";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { repo, user: me } = await getContext();
  return (
    <div className="admin-grid sidebar-collapsed">
      <aside className="sidebar" aria-label="Navegación">
        {/* Panel plegado a íconos; al pasar el mouse (o llegar con el teclado) se despliega completo,
            como el panel original, y se repliega al salir — ver ".sidebar-collapsed .sidebar:hover" en crm.css. */}
        <div className="brand" title="Estudio Bescansa" aria-label="Estudio Bescansa">
          {/* Dos imágenes (isotipo/logo completo), una visible por vez según ancho del panel — ver crm.css. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-compact" src="/brand/bescansa-isotipo-color.png" alt="" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-full" src="/brand/bescansa-logo-color.png" alt="" aria-hidden="true" />
        </div>
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
            <span className="sidebar-link" aria-disabled="true" title="Importar (próximamente)" style={{ opacity: 0.45, cursor: "default" }}>
              <span className="nav-icon">⇪</span><span className="sidebar-link-label">Importar</span>
            </span>
          </div>
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user" title={`${me.nombre} · ${me.email}`} aria-label={`${me.nombre} · ${me.email}`}>
            <span className="avatar">{me.nombre.slice(0, 2).toUpperCase()}</span>
            <div className="sidebar-user-info"><strong>{me.nombre}</strong><span>{me.email}</span></div>
          </div>
          {repo.mode === "supabase" && (
            <form action={logoutAction}>
              <button className="btn btn-tertiary btn-small sidebar-logout" type="submit" title="Salir" aria-label="Salir" style={{ marginTop: 8 }}>
                <span aria-hidden="true">←</span><span className="sidebar-link-label">Salir</span>
              </button>
            </form>
          )}
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-title"><strong>CRM de leads</strong><span>Estudio Bescansa · captación y ventas</span></div>
          <ThemeToggle />
          {repo.mode === "demo" && <span className="environment-pill demo-pill" title="Datos ficticios en memoria: no se guarda nada">Modo demostración</span>}
        </header>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
