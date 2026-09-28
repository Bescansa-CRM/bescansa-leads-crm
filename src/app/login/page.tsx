import { loginAction } from "./actions";

const MENSAJES: Record<string, string> = {
  credenciales: "El correo o la contraseña no son correctos.",
  inactivo: "Tu usuario está desactivado. Habla con un administrador.",
};

export const metadata = { title: "Acceso · CRM de leads" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section className="card section-card" style={{ width: "min(400px, 100%)" }}>
        <div className="panel-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/bescansa-logo-color.png" alt="Estudio Bescansa" style={{ height: 40, width: "auto", marginBottom: 18 }} />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, margin: "0 0 4px" }}>Acceso al CRM</h1>
          <p className="panel-subtitle" style={{ marginBottom: 16 }}>Captación y gestión de leads</p>
          {error && MENSAJES[error] && <div className="form-error" role="alert" style={{ marginBottom: 12 }}>{MENSAJES[error]}</div>}
          <form action={loginAction} className="stack">
            <input type="hidden" name="next" value={next ?? "/"} />
            <div className="field"><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" className="input" autoComplete="username" required autoFocus /></div>
            <div className="field"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" className="input" autoComplete="current-password" required /></div>
            <button className="btn btn-primary" type="submit">Entrar</button>
          </form>
        </div>
      </section>
    </main>
  );
}
