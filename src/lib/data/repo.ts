import { redirect } from "next/navigation";
import { createSessionClient, supabaseConfigured } from "../supabase/server.ts";
import { demoRepo } from "./demo.ts";
import { mapUserRow } from "./map.ts";
import { createSupabaseRepo } from "./supabase.ts";
import type { LeadsRepo, UserRow } from "./types.ts";

export interface AppContext { repo: LeadsRepo; user: UserRow }

/**
 * Repositorio y usuario de la petición actual.
 * - Sin Supabase configurado (o con DEMO_MODE=1): datos de demostración en memoria.
 * - Con Supabase: exige sesión iniciada (si no, redirige a /login) y usa la seguridad por filas del usuario.
 */
export async function getContext(): Promise<AppContext> {
  if (!supabaseConfigured()) {
    const users = await demoRepo.listUsers();
    return { repo: demoRepo, user: users[0] };
  }
  const client = await createSessionClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: profile } = await client.from("profiles").select("id, full_name, email, role, active").eq("id", data.user.id).maybeSingle();
  if (!profile || !profile.active) {
    await client.auth.signOut();
    redirect("/login?error=inactivo");
  }
  return { repo: createSupabaseRepo(client, data.user.id), user: mapUserRow(profile) };
}

export async function getRepo(): Promise<LeadsRepo> {
  return (await getContext()).repo;
}
