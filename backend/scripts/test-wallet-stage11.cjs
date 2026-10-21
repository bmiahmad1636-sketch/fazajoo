"use strict";
const assert = require("node:assert/strict");
const { createCallbackHandler } = require("../src/controllers/walletCallback.controller");
const authority = "A0000000000000000000000000000001";
const id = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const previous = process.env.DB_NAME;
const cases = [];
function mock({ database = "fazajoo_restore_test", row = null, query = { Authority: authority, Status: "OK" } } = {}) {
  const statements = [];
  const db = { async query(sql, params) { statements.push({ sql, params }); if (sql.includes("current_database")) return { rows: [{ name: database }] };
    return { rowCount: row ? 1 : 0, rows: row ? [row] : [] }; } };
  const req = { user: { id: userId }, query };
  const res = { code: 200, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } };
  return { db, req, res, statements };
}
async function check(label, setup, expected) {
  const m = mock(setup); await createCallbackHandler({ db: m.db })(m.req, m.res);
  assert.equal(m.res.code, expected); assert(m.statements.every(x => /^SELECT\s/i.test(x.sql.trim())), "read-only SQL only");
  cases.push(label); console.log("PASS:", label);
}
(async () => {
  process.env.DB_NAME = "fazajoo_restore_test";
  await check("valid callback without matching stored authority cannot verify", {}, 404);
  await check("cancelled callback rejected", { query: { Authority: authority, Status: "NOK" } }, 400);
  await check("invalid callback rejected", { query: { Authority: [authority], Status: "OK" } }, 400);
  await check("actual database mismatch rejected", { database: "fazajoo" }, 404);
  await check("matching pending intent remains unverified", { row: { id, amount_rial: "100000", provider_authority: authority, status: "pending" } }, 202);
  await check("already verified intent not treated as new proof", { row: { id, amount_rial: "100000", provider_authority: authority, status: "verified" } }, 409);
  process.env.DB_NAME = "fazajoo";
  await check("production environment disabled", {}, 404);
  console.log(`Stage 11: ${cases.length}/${cases.length} PASS (offline mocks; no DB writes, no network, no settlement)`);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { if (previous === undefined) delete process.env.DB_NAME; else process.env.DB_NAME = previous; });
