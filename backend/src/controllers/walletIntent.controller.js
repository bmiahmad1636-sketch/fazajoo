"use strict";
const { randomUUID } = require("node:crypto");
const { pool } = require("../db/pool");
const { createPendingIntent, listOwnIntents } = require("../services/payments/walletPaymentIntent.service");
const { rateLimit } = require("express-rate-limit");
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 6, standardHeaders: "draft-7", legacyHeaders: false,
  message: { ok: false, message: "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید." } });
const MAX_TOPUP = 1000000000000n; // 100 billion toman maximum, test-only UI limit
async function localOnly(req, res) {
  // Check actual DB identity, not merely an environment variable.
  if (process.env.DB_NAME !== "fazajoo_restore_test") {
    res.status(404).json({ ok: false, message: "این امکان فقط در محیط آزمایشی فعال است." }); return false;
  }
  const db = await pool.query("SELECT current_database() AS name");
  if (db.rows[0]?.name !== "fazajoo_restore_test") {
    res.status(404).json({ ok: false, message: "دیتابیس آزمایشی فعال نیست." }); return false;
  }
  return true;
}
async function list(req, res) {
  try {
    if (!(await localOnly(req, res))) return;
    const requests = await listOwnIntents(req.user.id, 20);
    res.json({ ok: true, requests, demo: true });
  } catch (err) {
    console.error("Wallet intent list failed", err);
    res.status(500).json({ ok: false, message: "دریافت درخواست‌های شارژ ناموفق بود." });
  }
}
async function create(req, res) {
  return limiter(req, res, async () => {
    try {
      if (!(await localOnly(req, res))) return;
      const amountRial = req.body?.amountRial;
      const key = req.body?.idempotencyKey;
      if (typeof amountRial !== "string" || !/^[1-9][0-9]*$/.test(amountRial) || BigInt(amountRial) > MAX_TOPUP ||
          typeof key !== "string" || !/^[a-f0-9-]{36}$/i.test(key)) {
        return res.status(400).json({ ok: false, message: "مبلغ یا شناسه درخواست نامعتبر است." });
      }
      const result = await createPendingIntent({ userId: req.user.id, amountRial, idempotencyKey: key });
      res.status(result.created ? 201 : 200).json({ ok: true, ...result, demo: true });
    } catch (err) {
      if (err.message === "IDEMPOTENCY_CONFLICT") return res.status(409).json({ ok: false, message: "شناسه درخواست با مبلغ دیگری ثبت شده است." });
      console.error("Wallet intent create failed", err);
      res.status(500).json({ ok: false, message: "ثبت درخواست شارژ ناموفق بود." });
    }
  });
}
module.exports = { list, create };
