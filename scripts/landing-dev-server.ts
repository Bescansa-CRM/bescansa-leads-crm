// Servidor local para probar la landing sin CRM: sirve landing/ y valida los envíos con el mismo código del endpoint real.
// Uso: npx tsx scripts/landing-dev-server.ts  →  http://localhost:4000
import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { parseLandingPayload } from "../src/lib/landing.ts";
const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".woff2": "font/woff2" };
createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  if (req.method === "POST" && url.pathname === "/api/leads/landing") {
    let raw = ""; req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const r = parseLandingPayload(JSON.parse(raw));
      writeFileSync(join(process.cwd(), "data-private", "landing_last.json"), JSON.stringify({ result: r, raw: JSON.parse(raw) }, null, 1));
      res.setHeader("content-type", "application/json");
      if (!r.ok) { res.statusCode = 400; res.end(JSON.stringify({ error: "Datos no válidos", detalles: r.errors })); return; }
      res.statusCode = 201; res.end(JSON.stringify({ ok: true }));
    });
    return;
  }
  if (url.pathname === "/config.js") { res.setHeader("content-type", "text/javascript"); res.end(readFileSync("landing/config.js", "utf8").replace('apiUrl: "http://localhost:3100"', 'apiUrl: ""')); return; }
  const path = join("landing", url.pathname === "/" ? "index.html" : url.pathname);
  if (!existsSync(path) || path.includes("..")) { res.statusCode = 404; res.end("no"); return; }
  res.setHeader("content-type", types[extname(path)] ?? "application/octet-stream"); res.end(readFileSync(path));
}).listen(4000, () => console.log("mock en 4000"));
