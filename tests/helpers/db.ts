import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Simula lo mínimo de Supabase (roles y auth.uid()) sobre un Postgres embebido para probar
// las migraciones reales y la seguridad por filas sin necesidad de un proyecto en la nube.
const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, created_at timestamptz not null default now());
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to service_role;
  alter default privileges in schema public grant all on sequences to service_role;
`;

export async function newDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  const dir = join(process.cwd(), "supabase", "migrations");
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, f), "utf8"));
  }
  await db.exec("grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role;");
  return db;
}

export const ADMIN = "00000000-0000-4000-8000-000000000001";
export const VENTAS = "00000000-0000-4000-8000-000000000002";
export const INACTIVO = "00000000-0000-4000-8000-000000000003";

export async function seedUsers(db: PGlite) {
  // Los perfiles los crea el trigger de alta (el primero es admin). Después se fijan nombre, actividad y antigüedad.
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN}', 'admin@test.local');
    insert into auth.users (id, email) values ('${VENTAS}', 'ventas@test.local');
    insert into auth.users (id, email) values ('${INACTIVO}', 'baja@test.local');
    update public.profiles set full_name = 'Admin', created_at = now() - interval '3 days' where id = '${ADMIN}';
    update public.profiles set full_name = 'Ventas', created_at = now() - interval '2 days' where id = '${VENTAS}';
    update public.profiles set full_name = 'Baja', active = false, created_at = now() - interval '1 day' where id = '${INACTIVO}';
  `);
}

type Who = { role: "anon" | "authenticated" | "service_role"; uid?: string };

/** Ejecuta `fn` con el rol y el usuario indicados, dentro de una transacción que se revierte al terminar. */
export async function as<T>(db: PGlite, who: Who, fn: () => Promise<T>): Promise<T> {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${who.role}`);
    await db.exec(`select set_config('request.jwt.claim.sub', '${who.uid ?? ""}', true)`);
    return await fn();
  } finally {
    await db.exec("rollback");
  }
}

/** Igual que `as`, pero conserva los cambios (para preparar datos con el rol de servicio). */
export async function asCommit<T>(db: PGlite, who: Who, fn: () => Promise<T>): Promise<T> {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${who.role}`);
    await db.exec(`select set_config('request.jwt.claim.sub', '${who.uid ?? ""}', true)`);
    const r = await fn();
    await db.exec("commit");
    return r;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
