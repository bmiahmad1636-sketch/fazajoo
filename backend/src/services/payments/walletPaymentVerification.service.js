"use strict";

// Stage 13: atomic LOCAL-TEST-ONLY settlement using the Stage 12 trusted verification guard.
// No public payment endpoint or live gateway integration is enabled here.
const crypto = require("node:crypto");
const { pool } = require("../../db/pool");
const { validateServerVerification } = require("./zarinpalVerificationGuard");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RIAL = 9223372036854775807n;
const TEST_DB = "fazajoo_restore_test";

async function settleVerifiedTopup({ intentId, verifyWithProvider, testOnly = false }) {
  if (process.env.DB_NAME !== TEST_DB || testOnly !== true) {
    throw new Error("SETTLEMENT_DISABLED_OUTSIDE_LOCAL_TEST");
  }
  if (!UUID.test(String(intentId))) throw new Error("INVALID_INTENT_ID");
  if (typeof verifyWithProvider !== "function") throw new Error("VERIFIER_REQUIRED");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Guard against an .env override or a pool pointing to a different database.
    const dbCheck = await client.query("SELECT current_database() AS name");
    if (dbCheck.rows[0]?.name !== TEST_DB) throw new Error("CONNECTED_DATABASE_NOT_TEST");
    const found = await client.query("SELECT * FROM wallet_payment_intents WHERE id=$1 FOR UPDATE", [intentId]);
    if (!found.rowCount) throw new Error("INTENT_NOT_FOUND");
    const intent = found.rows[0];
    if (intent.status === "verified") {
      const old = await client.query("SELECT id FROM wallet_transactions WHERE idempotency_key=$1", ["topup:" + intentId]);
      if (!old.rowCount) throw new Error("INCONSISTENT_VERIFIED_INTENT");
      await client.query("COMMIT");
      return { applied: false, transactionId: old.rows[0].id };
    }
    if (intent.status !== "pending") throw new Error("INTENT_NOT_PENDING");
    if (intent.provider !== "zarinpal" || typeof intent.provider_authority !== "string" || !intent.provider_authority) {
      throw new Error("INTENT_AUTHORITY_NOT_SET");
    }
    // A verifier must independently call the gateway server-to-server. The callback is NOT proof.
    const result = await verifyWithProvider({
      intentId: intent.id,
      provider: intent.provider,
      authority: intent.provider_authority,
      amountRial: String(intent.amount_rial),
    });
    const proof = validateServerVerification({
      intent: { provider: intent.provider, status: intent.status, authority: intent.provider_authority, amountRial: String(intent.amount_rial) },
      result,
    });
    await client.query("INSERT INTO wallet_accounts(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING", [intent.user_id]);
    const acc = await client.query("SELECT balance_rial FROM wallet_accounts WHERE user_id=$1 FOR UPDATE", [intent.user_id]);
    const after = BigInt(acc.rows[0].balance_rial) + BigInt(intent.amount_rial);
    if (after > MAX_RIAL) throw new Error("BALANCE_OVERFLOW");
    await client.query("UPDATE wallet_accounts SET balance_rial=$2, updated_at=NOW() WHERE user_id=$1", [intent.user_id, after.toString()]);
    const transactionId = crypto.randomUUID();
    await client.query(`INSERT INTO wallet_transactions
      (id,user_id,wallet_user_id,kind,direction,amount_rial,balance_after_rial,idempotency_key,reference_type,reference_id,note)
      VALUES($1,$2,$2,'topup','credit',$3,$4,$5,'wallet_payment_intent',$6,'verified payment')`,
      [transactionId, intent.user_id, String(intent.amount_rial), after.toString(), "topup:" + intentId, intentId]);
    await client.query(`UPDATE wallet_payment_intents SET status='verified', verified_at=NOW(),
      provider_reference=$2 WHERE id=$1`, [intentId, proof.reference]);
    await client.query("COMMIT");
    return { applied: true, transactionId, balanceRial: after.toString() };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (rollbackErr) { console.error("Wallet settlement rollback failed:", rollbackErr); }
    throw err;
  } finally { client.release(); }
}

module.exports = { settleVerifiedTopup };
