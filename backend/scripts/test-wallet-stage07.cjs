"use strict";
// Run ONLY with DB_NAME=fazajoo_restore_test. This test creates pending intents
// but never calls a gateway and never modifies wallet balances.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { pool } = require("../src/db/pool");
const intents = require("../src/services/payments/walletPaymentIntent.service");
async function main() {
  const db = await pool.query("SELECT current_database() AS name");
  assert.equal(db.rows[0].name, "fazajoo_restore_test", "SAFETY STOP: wrong database");
  console.log("PASS: test database guard");
  const users = await pool.query("SELECT id FROM users ORDER BY id LIMIT 1");
  assert.ok(users.rowCount, "No user in test database");
  const userId = users.rows[0].id;
  const key = `wallet-stage07-${crypto.randomUUID()}`;
  const before = await pool.query("SELECT balance_rial FROM wallet_accounts WHERE user_id=$1", [userId]);
  const balanceBefore = before.rowCount ? String(before.rows[0].balance_rial) : "0";
  const [a, b] = await Promise.all([
    intents.createPendingIntent({ userId, amountRial: "500000", idempotencyKey: key }),
    intents.createPendingIntent({ userId, amountRial: "500000", idempotencyKey: key }),
  ]);
  assert.equal(a.intent.id, b.intent.id);
  assert.equal(Number(a.created) + Number(b.created), 1);
  assert.equal(a.intent.status, "pending");
  console.log("PASS: concurrent retry creates exactly one pending intent");
  await assert.rejects(
    intents.createPendingIntent({ userId, amountRial: "500001", idempotencyKey: key }),
    /IDEMPOTENCY_CONFLICT/
  );
  console.log("PASS: idempotency amount conflict rejected");
  const own = await intents.getOwnIntent(userId, a.intent.id);
  assert.equal(own.id, a.intent.id);
  assert.equal(await intents.getOwnIntent(crypto.randomUUID(), a.intent.id), null);
  console.log("PASS: intent is owner-scoped");
  assert.throws(() => intents.validateRequest({ userId, amountRial: "0", idempotencyKey: key }), /INVALID_AMOUNT/);
  assert.throws(() => intents.validateRequest({ userId, amountRial: "1.5", idempotencyKey: key }), /INVALID_AMOUNT/);
  console.log("PASS: invalid amounts rejected");
  const after = await pool.query("SELECT balance_rial FROM wallet_accounts WHERE user_id=$1", [userId]);
  const balanceAfter = after.rowCount ? String(after.rows[0].balance_rial) : "0";
  assert.equal(balanceAfter, balanceBefore);
  const verified = await pool.query("SELECT status FROM wallet_payment_intents WHERE id=$1", [a.intent.id]);
  assert.equal(verified.rows[0].status, "pending");
  console.log("PASS: no wallet credit and no fake verification");
  console.log("Stage 07: 6/6 PASS (local test database only)");
}
main().catch((err) => { console.error("FAILED:", err.message); process.exitCode = 1; }).finally(() => pool.end());
