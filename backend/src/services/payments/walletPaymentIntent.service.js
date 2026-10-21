"use strict";

// Stage 07: internal payment intent lifecycle only. No HTTP routes, gateway calls,
// verified status transitions, or wallet crediting are implemented here.
const crypto = require("node:crypto");
const { pool } = require("../../db/pool");

const MAX_RIAL = 9223372036854775807n;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,160}$/;

function validateRequest({ userId, amountRial, idempotencyKey }) {
  if (!UUID.test(String(userId))) throw new Error("INVALID_USER");
  if (typeof amountRial !== "string" || !/^[1-9][0-9]*$/.test(amountRial) || BigInt(amountRial) > MAX_RIAL) {
    throw new Error("INVALID_AMOUNT");
  }
  if (typeof idempotencyKey !== "string" || !KEY.test(idempotencyKey)) throw new Error("INVALID_IDEMPOTENCY_KEY");
  return { userId, amountRial: BigInt(amountRial).toString(), idempotencyKey };
}

function publicIntent(row) {
  return {
    id: row.id,
    amountRial: String(row.amount_rial),
    status: row.status,
    provider: row.provider,
    createdAt: row.created_at,
  };
}

async function createPendingIntent(input) {
  const { userId, amountRial, idempotencyKey } = validateRequest(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // A transaction-level lock serializes concurrent retries for the same key.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", ["wallet-intent:" + idempotencyKey]);
    const existing = await client.query("SELECT * FROM wallet_payment_intents WHERE idempotency_key=$1", [idempotencyKey]);
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.user_id !== userId || String(row.amount_rial) !== amountRial || row.provider !== "zarinpal") {
        throw new Error("IDEMPOTENCY_CONFLICT");
      }
      await client.query("COMMIT");
      return { created: false, intent: publicIntent(row) };
    }
    const result = await client.query(
      `INSERT INTO wallet_payment_intents (id,user_id,amount_rial,status,provider,idempotency_key)
       VALUES ($1,$2,$3,'pending','zarinpal',$4)
       RETURNING *`,
      [crypto.randomUUID(), userId, amountRial, idempotencyKey]
    );
    await client.query("COMMIT");
    return { created: true, intent: publicIntent(result.rows[0]) };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) { console.error("Payment intent rollback failed:", rollbackError); }
    throw error;
  } finally { client.release(); }
}

async function getOwnIntent(userId, intentId) {
  if (!UUID.test(String(userId)) || !UUID.test(String(intentId))) throw new Error("INVALID_ID");
  const result = await pool.query(
    "SELECT * FROM wallet_payment_intents WHERE id=$1 AND user_id=$2",
    [intentId, userId]
  );
  return result.rowCount ? publicIntent(result.rows[0]) : null;
}

async function listOwnIntents(userId, limit = 20) {
  if (!UUID.test(String(userId))) throw new Error("INVALID_USER");
  const result = await pool.query(
    `SELECT id, amount_rial, status, provider, created_at
     FROM wallet_payment_intents WHERE user_id=$1
     ORDER BY created_at DESC, id DESC LIMIT $2`,
    [userId, Math.max(1, Math.min(30, limit))]
  );
  return result.rows.map(publicIntent);
}

// Intentionally no markVerified(), creditWallet(), or callback handler.
module.exports = { createPendingIntent, getOwnIntent, listOwnIntents, validateRequest };
