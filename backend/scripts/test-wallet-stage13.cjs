"use strict";
// Integration test. Writes ONLY to fazajoo_restore_test. Requires an existing test user.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { pool } = require("../src/db/pool");
const { settleVerifiedTopup } = require("../src/services/payments/walletPaymentVerification.service");
const { createPendingIntent } = require("../src/services/payments/walletPaymentIntent.service");
const TEST_DB = "fazajoo_restore_test";
let passed = 0;
function pass(name) { passed++; console.log("PASS:", name); }
async function main() {
  if (process.env.DB_NAME !== TEST_DB) throw new Error("TEST_DB_REQUIRED");
  const db = await pool.query("SELECT current_database() AS name");
  assert.equal(db.rows[0]?.name, TEST_DB); pass("actual database guard");
  await assert.rejects(settleVerifiedTopup({intentId:crypto.randomUUID(),testOnly:false,verifyWithProvider:async()=>({})}),/DISABLED/);
  pass("production mode disabled");
  const user = await pool.query("SELECT id FROM users LIMIT 1");
  if (!user.rowCount) throw new Error("TEST_USER_REQUIRED");
  const userId = user.rows[0].id;
  const intent = (await createPendingIntent({userId,amountRial:"13013",idempotencyKey:"s13_"+crypto.randomUUID()})).intent;
  const authority = "A" + crypto.randomBytes(18).toString("hex");
  await pool.query("UPDATE wallet_payment_intents SET provider_authority=$2 WHERE id=$1",[intent.id,authority]);
  const before = await pool.query("SELECT balance_rial FROM wallet_accounts WHERE user_id=$1",[userId]);
  const beforeAmount = BigInt(before.rows[0]?.balance_rial ?? 0);
  const valid = {source:"server_to_server",verified:true,provider:"zarinpal",authority,amountRial:"13013",reference:"ref_"+crypto.randomBytes(12).toString("hex")};
  const verify = async () => valid;
  await assert.rejects(settleVerifiedTopup({intentId:intent.id,testOnly:true,verifyWithProvider:async()=>({...valid,source:"browser_callback"})}),/UNTRUSTED_VERIFICATION_RESULT/);
  pass("browser callback rejected");
  await assert.rejects(settleVerifiedTopup({intentId:intent.id,testOnly:true,verifyWithProvider:async()=>({...valid,authority:"B1234567890"})}),/UNTRUSTED_VERIFICATION_RESULT/);
  pass("authority mismatch rejected");
  await assert.rejects(settleVerifiedTopup({intentId:intent.id,testOnly:true,verifyWithProvider:async()=>({...valid,amountRial:"13014"})}),/UNTRUSTED_VERIFICATION_RESULT/);
  pass("amount mismatch rejected");
  const stillPending = await pool.query("SELECT status FROM wallet_payment_intents WHERE id=$1",[intent.id]);
  assert.equal(stillPending.rows[0].status,"pending");
  pass("rejected attempts rolled back");
  let calls = 0;
  const counted = async () => { calls++; return verify(); };
  const results = await Promise.all([
    settleVerifiedTopup({intentId:intent.id,testOnly:true,verifyWithProvider:counted}),
    settleVerifiedTopup({intentId:intent.id,testOnly:true,verifyWithProvider:counted}),
  ]);
  assert.equal(results.filter(r=>r.applied).length,1);
  assert.equal(calls,1);
  pass("concurrent settlement exactly once");
  const after = await pool.query("SELECT balance_rial FROM wallet_accounts WHERE user_id=$1",[userId]);
  assert.equal(BigInt(after.rows[0].balance_rial)-beforeAmount,13013n);
  pass("balance credited exactly once");
  const tx = await pool.query("SELECT count(*)::int AS n FROM wallet_transactions WHERE idempotency_key=$1",["topup:"+intent.id]);
  assert.equal(tx.rows[0].n,1);
  pass("single journal entry");
  console.log(`Stage 13: ${passed}/9 PASS (LOCAL TEST DB ONLY)`);
}
main().catch(e=>{console.error("FAILED:",e.stack||e.message);process.exitCode=1}).finally(()=>pool.end());
