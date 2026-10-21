"use strict";
// Offline mocks only. No DB writes, no gateway calls.
const assert = require("node:assert/strict");
const { inspectTopupIntent } = require("../src/services/payments/walletReconciliation.service");
const id = "11111111-1111-4111-8111-111111111111";
const owner = "22222222-2222-4222-8222-222222222222";
let passed = 0;
async function check(name, fn) { await fn(); console.log("PASS:", name); passed++; }
const intent = { id, user_id: owner, amount_rial: "14000", status: "verified", provider: "zarinpal", provider_reference: "ref123", verified_at: new Date() };
const entry = { id: "33333333-3333-4333-8333-333333333333", user_id: owner, wallet_user_id: owner, kind: "topup", direction: "credit", amount_rial: "14000", reference_type: "wallet_payment_intent", reference_id: id };
function mock(i, rows = []) { return { async query(sql) { if (sql.includes("current_database()")) return { rows: [{ name: "fazajoo_restore_test" }] }; if (sql.includes("FROM wallet_payment_intents")) return { rowCount: i ? 1 : 0, rows: i ? [i] : [] }; if (sql.includes("FROM wallet_transactions")) return { rowCount: rows.length, rows }; throw new Error("UNEXPECTED_QUERY"); } }; }
async function inspect(i, rows) { return inspectTopupIntent({ intentId: id, db: mock(i, rows), testOnly: true }); }
(async () => {
  await check("environment guard", async () => { const old = process.env.DB_NAME; delete process.env.DB_NAME; try { await assert.rejects(inspect(intent,[entry]),/DISABLED/); } finally { if (old === undefined) delete process.env.DB_NAME; else process.env.DB_NAME = old; } });
  process.env.DB_NAME = "fazajoo_restore_test";
  await check("testOnly guard", async () => { await assert.rejects(inspectTopupIntent({intentId:id,db:mock(intent,[entry])}),/DISABLED/); });
  await check("invalid id rejected", async () => { await assert.rejects(inspectTopupIntent({intentId:"invalid",db:mock(intent,[entry]),testOnly:true}),/INVALID_INTENT/); });
  await check("verified intent matches journal", async () => { assert.equal((await inspect(intent,[entry])).ok,true); });
  await check("verified without journal flagged", async () => { assert((await inspect(intent,[])).findings.includes("VERIFIED_JOURNAL_COUNT_MISMATCH")); });
  await check("pending with credit flagged", async () => { assert((await inspect({...intent,status:"pending",verified_at:null},[entry])).findings.includes("UNVERIFIED_INTENT_HAS_CREDIT")); });
  await check("wrong amount flagged", async () => { assert((await inspect(intent,[{...entry,amount_rial:"14001"}])).findings.includes("JOURNAL_FIELDS_MISMATCH")); });
  await check("wrong owner flagged", async () => { assert((await inspect(intent,[{...entry,user_id:id}])).findings.includes("JOURNAL_OWNER_MISMATCH")); });
  await check("duplicate credit flagged", async () => { assert((await inspect(intent,[entry,entry])).findings.includes("VERIFIED_JOURNAL_COUNT_MISMATCH")); });
  await check("missing intent reported", async () => { assert.equal((await inspect(null,[])).found,false); });
  console.log(`Stage 14: ${passed}/10 PASS (OFFLINE MOCKS ONLY)`);
})().catch(e=>{console.error("FAILED:",e);process.exitCode=1});
