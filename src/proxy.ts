import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que no exigen sesión: el login, la entrada de leads y las tareas programadas (cada una con su propia clave).
const PUBLIC = [/^\/login$/, /^\/api\/leads\/(ingest|landing)$/, /^\/api\/cron\/(sla|digest)$/];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (process.env.DEMO_MODE === "1" || !url || !anon) return NextResponse.next(); // modo demostración: sin sesión

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getUser(); // refresca la sesión si hace falta
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((re) => re.test(path));

  if (!data.user && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }
  if (data.user && path === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|fonts/).*)"] };
