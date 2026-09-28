import { readFileSync } from "node:fs"; import { join } from "node:path";
function loadEnv(p: string) { for (const l of readFileSync(p, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } }
loadEnv(join(process.cwd(), ".env.local"));
const { createClient } = await import("@supabase/supabase-js");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const { data, error } = await db.auth.signInWithPassword({ email: "fsagardia@estudiobescansa.com", password: "yq4uh4kiy3Sm" });
console.log("data.user:", data?.user?.email, "session:", !!data?.session);
console.log("error:", error ? { message: error.message, status: error.status, code: (error as any).code } : null);
