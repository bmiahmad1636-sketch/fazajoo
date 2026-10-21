"use strict";

// Internal wallet engine. NEVER expose credit() directly to a public HTTP route.
// All amounts are integer RIALS, represented as BigInt internally.
const crypto = require("node:crypto");
const { pool } = require("../db/pool");

const MAX_RIAL = 9223372036854775807n;
const KINDS = new Set(["topup", "purchase", "refund", "admin_adjustment"]);

function amountToBigInt(value) {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
    throw new Error("INVALID_AMOUNT");
  }
  const raw = String(value);
  if (!/^[1-9][0-9]*$/.test(raw)) throw new Error("INVALID_AMOUNT");
  const amount = BigInt(raw);
  if (amount > MAX_RIAL) throw new Error("INVALID_AMOUNT");
  return amount;
}

function validateInput({ userId, amountRial, kind, direction, idempotencyKey, referenceType, referenceId, note }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId))) throw new Error("INVALID_USER");
  if (!KINDS.has(kind) || !["credit", "debit"].includes(direction)) throw new Error("INVALID_OPERATION");
  if ((kind === "topup" || kind === "refund") && direction !== "credit") throw new Error("INVALID_OPERATION");
  if (kind === "purchase" && direction !== "debit") throw new Error("INVALID_OPERATION");
  if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9:_-]{8,160}$/.test(idempotencyKey)) throw new Error("INVALID_IDEMPOTENCY_KEY");
  if (referenceType != null && (typeof referenceType !== "string" || referenceType.length > 64)) throw new Error("INVALID_REFERENCE");
  if (referenceId != null && (typeof referenceId !== "string" || referenceId.length > 160)) throw new Error("INVALID_REFERENCE");
  if (note != null && (typeof note !== "string" || note.length > 2000)) throw new Error("INVALID_NOTE");
  return amountToBigInt(amountRial);
}

// Caller must establish an authorized, independently verified financial event.
// For topups: verify gateway server-to-server, never trust a browser callback.
async function recordMovement(input) {
  const { userId, kind, direction, idempotencyKey, referenceType = null, referenceId = null, note = null } = input;
  const amount = validateInput(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize duplicate requests, including when the wallet does not exist yet.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [idempotencyKey]);
    const existing = await client.query("SELECT * FROM wallet_transactions WHERE idempotency_key = $1", [idempotencyKey]);
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.user_id !== userId || row.kind !== kind || row.direction !== direction || String(row.amount_rial) !== amount.toString() || row.reference_type !== referenceType || row.reference_id !== referenceId) {
        throw new Error("IDEMPOTENCY_CONFLICT");
      }
      await client.query("COMMIT");
      return { applied: false, transactionId: row.id, balanceRial: String(row.balance_after_rial) };
    }
    await client.query("INSERT INTO wallet_accounts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [userId]);
    const account = await client.query("SELECT balance_rial FROM wallet_accounts WHERE user_id = $1 FOR UPDATE", [userId]);
    if (!account.rowCount) throw new Error("WALLET_NOT_FOUND");
    const before = BigInt(account.rows[0].balance_rial);
    const after = direction === "credit" ? before + amount : before - amount;
    if (after < 0n) throw new Error("INSUFFICIENT_BALANCE");
    if (after > MAX_RIAL) throw new Error("BALANCE_OVERFLOW");
    await client.query("UPDATE wallet_accounts SET balance_rial = $2, updated_at = NOW() WHERE user_id = $1", [userId, after.toString()]);
    const transactionId = crypto.randomUUID();
    await client.query(`INSERT INTO wallet_transactions
      (id, user_id, wallet_user_id, kind, direction, amount_rial, balance_after_rial, idempotency_key, reference_type, reference_id, note)
      VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [transactionId, userId, kind, direction, amount.toString(), after.toString(), idempotencyKey, referenceType, referenceId, note]);
    await client.query("COMMIT");
    return { applied: true, transactionId, balanceRial: after.toString() };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) { console.error("Wallet rollback failed:", rollbackError); }
    throw error;
  } finally {
    client.release();
  }
}

async function getBalance(userId) {
  const result = await pool.query("SELECT balance_rial FROM wallet_accounts WHERE user_id = $1", [userId]);
  return result.rowCount ? String(result.rows[0].balance_rial) : "0";
}

async function getHistory(userId, limit = 20) {
  const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 50)) : 20;
  const result = await pool.query(`SELECT id, kind, direction, amount_rial, balance_after_rial, reference_type, reference_id, created_at
    FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`, [userId, safeLimit]);
  return result.rows.map((row) => ({ ...row, amount_rial: String(row.amount_rial), balance_after_rial: String(row.balance_after_rial) }));
}

module.exports = { recordMovement, getBalance, getHistory };
