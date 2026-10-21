"use strict";
// Fazajoo wallet stage 03 - local test database only. No HTTP/payment gateway calls.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const backendRoot = path.resolve(__dirname, "..");
const { pool } = require(path.join(backendRoot, "src/db/pool"));
const wallet = require(path.join(backendRoot, "src/services/walletLedger.service"));
const EXPECTED_DB = "fazajoo_restore_test";
const results = [];
function pass(name) { results.push(name); console.log("PASS:", name); }
async function rejectWith(promise, code) {
  await assert.rejects(promise, (err) => err?.message === code, `Expected ${code}`);
}
async function run() {
  const db = await pool.query("SELECT current_database() AS name");
  assert.equal(db.rows[0].name, EXPECTED_DB, "SAFETY STOP: must use fazajoo_restore_test");
  pass("database safety guard");
  const userResult = await pool.query("SELECT id FROM users ORDER BY id LIMIT 1");
  assert.ok(userResult.rowCount, "No test user in database");
  const userId = userResult.rows[0].id;
  const runId = crypto.randomUUID();
  const key = (suffix) => `wallet-stage03-${runId}-${suffix}`;
  const balance0 = BigInt(await wallet.getBalance(userId));
  const topup = await wallet.recordMovement({userId, amountRial:"1000", kind:"topup", direction:"credit", idempotencyKey:key("topup"), referenceType:"local_test", referenceId:runId});
  assert.equal(topup.applied, true);
  assert.equal(BigInt(await wallet.getBalance(userId)), balance0 + 1000n);
  pass("topup and balance");
  const duplicate = await wallet.recordMovement({userId, amountRial:"1000", kind:"topup", direction:"credit", idempotencyKey:key("topup"), referenceType:"local_test", referenceId:runId});
  assert.equal(duplicate.applied, false);
  assert.equal(duplicate.transactionId, topup.transactionId);
  pass("idempotent retry");
  await rejectWith(wallet.recordMovement({userId, amountRial:"1001", kind:"topup", direction:"credit", idempotencyKey:key("topup"), referenceType:"local_test", referenceId:runId}), "IDEMPOTENCY_CONFLICT");
  pass("idempotency conflict");
  const purchases = await Promise.all(Array.from({length:5}, (_,i) => wallet.recordMovement({userId, amountRial:"100", kind:"purchase", direction:"debit", idempotencyKey:key(`purchase-${i}`), referenceType:"local_test", referenceId:runId})));
  assert.ok(purchases.every(x=>x.applied));
  assert.equal(BigInt(await wallet.getBalance(userId)), balance0 + 500n);
  pass("concurrent debits and correct balance");
  const refund = await wallet.recordMovement({userId, amountRial:"100", kind:"refund", direction:"credit", idempotencyKey:key("refund"), referenceType:"local_test", referenceId:runId});
  assert.equal(refund.applied, true);
  const refundAgain = await wallet.recordMovement({userId, amountRial:"100", kind:"refund", direction:"credit", idempotencyKey:key("refund"), referenceType:"local_test", referenceId:runId});
  assert.equal(refundAgain.applied, false);
  assert.equal(BigInt(await wallet.getBalance(userId)), balance0 + 600n);
  pass("refund and duplicate refund prevention");
  await rejectWith(wallet.recordMovement({userId, amountRial:(balance0+601n).toString(), kind:"purchase", direction:"debit", idempotencyKey:key("overdraft"), referenceType:"local_test", referenceId:runId}), "INSUFFICIENT_BALANCE");
  assert.equal(BigInt(await wallet.getBalance(userId)), balance0 + 600n);
  pass("overdraft prevention");
  await rejectWith(wallet.recordMovement({userId, amountRial:"0", kind:"topup", direction:"credit", idempotencyKey:key("invalid"), referenceType:"local_test", referenceId:runId}), "INVALID_AMOUNT");
  pass("invalid amount rejection");
  const history = await wallet.getHistory(userId, 50);
  assert.ok(history.some(x=>x.id===refund.transactionId));
  pass("transaction history");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assert.rejects(client.query("UPDATE wallet_transactions SET amount_rial = 999 WHERE id = $1", [topup.transactionId]), /append-only/);
    await client.query("ROLLBACK");
    await client.query("BEGIN");
    await assert.rejects(client.query("DELETE FROM wallet_transactions WHERE id = $1", [topup.transactionId]), /append-only/);
    await client.query("ROLLBACK");
  } finally { client.release(); }
  pass("immutable ledger update/delete protection");
  console.log(`\nSUCCESS: ${results.length} wallet tests passed. TEST DATABASE ONLY.`);
  console.log("Test journal entries remain append-only; no production changes.");
}
run().catch(err=>{ console.error("FAILED:", err.message); process.exitCode=1; }).finally(async()=>{ await pool.end(); });
