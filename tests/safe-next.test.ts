import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../src/lib/safe-next.ts";

test("destino tras el login: solo rutas internas", () => {
  assert.equal(safeNext("/tablero"), "/tablero");
  assert.equal(safeNext("/leads?etapa=nuevo&p=2"), "/leads?etapa=nuevo&p=2");
  assert.equal(safeNext("/leads/abc-123"), "/leads/abc-123");
  for (const malo of ["https://malo.example", "//malo.example", "/" + String.fromCharCode(92) + "malo.example", "javascript:alert(1)", "/../etc", "", null, undefined, "tablero"]) {
    assert.equal(safeNext(malo as string | null | undefined), "/", `debería rechazar ${String(malo)}`);
  }
});
