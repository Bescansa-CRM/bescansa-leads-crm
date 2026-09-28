"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { createSessionClient, supabaseConfigured } from "@/lib/supabase/server";

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));
  if (!supabaseConfigured()) redirect(next);
  if (!email || !password) redirect(`/login?error=credenciales&next=${encodeURIComponent(next)}`);

  const client = await createSessionClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=credenciales&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  if (supabaseConfigured()) await (await createSessionClient()).auth.signOut();
  redirect("/login");
}
