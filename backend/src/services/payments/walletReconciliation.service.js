"use strict";
// Stage 14: READ-ONLY reconciliation for one wallet payment intent.
// No gateway calls, no wallet mutations, no public route.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEST_DB = "fazajoo_restore_test";

async function inspectTopupIntent({ intentId, db, testOnly = false }) {
  if (process.env.DB_NAME !== TEST_DB || testOnly !== true) throw new Error("RECONCILIATION_DISABLED_OUTSIDE_LOCAL_TEST");
  if (!UUID.test(String(intentId))) throw new Error("INVALID_INTENT_ID");
  if (!db || typeof db.query !== "function") throw new Error("DB_REQUIRED");
  const actual = await db.query("SELECT current_database() AS name");
  if (actual.rows[0]?.name !== TEST_DB) throw new Error("CONNECTED_DATABASE_NOT_TEST");
  const found = await db.query("SELECT id,user_id,amount_rial,status,provider,provider_reference,verified_at FROM wallet_payment_intents WHERE id=$1", [intentId]);
  if (!found.rowCount) return { found: false, intentId, findings: ["INTENT_NOT_FOUND"] };
  const intent = found.rows[0];
  const entries = await db.query(`SELECT id,user_id,wallet_user_id,kind,direction,amount_rial,reference_type,reference_id
    FROM wallet_transactions WHERE idempotency_key=$1 ORDER BY created_at,id`, ["topup:" + intentId]);
  const findings = [];
  if (intent.status === "verified") {
    if (!intent.verified_at) findings.push("VERIFIED_TIMESTAMP_MISSING");
    if (!intent.provider_reference) findings.push("PROVIDER_REFERENCE_MISSING");
    if (entries.rowCount !== 1) findings.push("VERIFIED_JOURNAL_COUNT_MISMATCH");
  } else if (entries.rowCount !== 0) findings.push("UNVERIFIED_INTENT_HAS_CREDIT");
  for (const entry of entries.rows) {
    if (entry.user_id !== intent.user_id || entry.wallet_user_id !== intent.user_id) findings.push("JOURNAL_OWNER_MISMATCH");
    if (entry.kind !== "topup" || entry.direction !== "credit" || String(entry.amount_rial) !== String(intent.amount_rial) ||
        entry.reference_type !== "wallet_payment_intent" || String(entry.reference_id) !== String(intentId)) findings.push("JOURNAL_FIELDS_MISMATCH");
  }
  return { found: true, intentId, status: intent.status, journalCount: entries.rowCount, ok: findings.length === 0, findings: [...new Set(findings)] };
}
module.exports = { inspectTopupIntent };
