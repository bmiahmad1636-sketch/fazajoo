"use strict";
// Stage 11: read-only callback inspection. Never verify or credit from browser data.

const { parseCallbackQuery, validateVerificationContext } = require("../services/payments/zarinpalCallbackGuard");
const TEST_DB = "fazajoo_restore_test";
function createCallbackHandler({ db, expectedDatabase = TEST_DB } = {}) {
  db = db || require("../db/pool").pool;
  return async function callback(req, res) {
    try {
      // Both configuration and actual connected database must match the test DB.
      if (process.env.DB_NAME !== expectedDatabase) return res.status(404).json({ ok: false, message: "Unavailable" });
      const dbCheck = await db.query("SELECT current_database() AS name");
      if (dbCheck.rows[0]?.name !== expectedDatabase) return res.status(404).json({ ok: false, message: "Unavailable" });
      const parsed = parseCallbackQuery(req.query);
      if (!parsed.accepted) return res.status(400).json({ ok: false, status: "not_verified", reason: parsed.reason });
      // No intent ID from query is trusted; authority is matched against stored DB value.
      const result = await db.query(
        `SELECT id, amount_rial, provider_authority, status
           FROM wallet_payment_intents
          WHERE user_id=$1 AND provider='zarinpal' AND provider_authority=$2
          LIMIT 1`,
        [req.user.id, parsed.authority]
      );
      if (!result.rowCount) return res.status(404).json({ ok: false, status: "not_verified", reason: "INTENT_NOT_FOUND" });
      const intent = result.rows[0];
      if (intent.status !== "pending") return res.status(409).json({ ok: false, status: "not_verified", reason: "INTENT_NOT_PENDING" });
      validateVerificationContext({ intentId: intent.id, storedAuthority: intent.provider_authority,
        callbackAuthority: parsed.authority, amountRial: String(intent.amount_rial) });
      return res.status(202).json({ ok: true, intentId: intent.id, status: "awaiting_server_verification",
        message: "بازگشت از درگاه دریافت شد؛ پرداخت هنوز تأیید نشده است." });
    } catch (error) {
      console.error("Wallet callback inspection failed:", error);
      return res.status(500).json({ ok: false, message: "بررسی بازگشت پرداخت ناموفق بود." });
    }
  };
}
module.exports = { createCallbackHandler };
