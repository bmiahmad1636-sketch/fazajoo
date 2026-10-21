"use strict";
const router = require("express").Router();
const { requireAuth } = require("../middleware/auth.middleware");
const walletController = require("../controllers/wallet.controller");

router.use(requireAuth);
router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/balance", walletController.balance);
router.get("/history", walletController.history);
// Stage 09: local test database ONLY. Never expose these operations on production.
const intentController = require("../controllers/walletIntent.controller");
router.get("/topup-requests", intentController.list);
router.post("/topup-requests", intentController.create);
// Test-database-only purchase; authorization derives from authenticated session.
const { pool } = require("../db/pool");
const networkPurchase = require("../services/networkCreditPurchase.service");
async function verifiedDemoConfig(req, res, next) {
  try {
    const config = networkPurchase.getConfig();
    if (!config.enabled) return res.status(403).json({ ok: false, message: "خرید آزمایشی غیرفعال است." });
    const db = await pool.query("SELECT current_database() AS name");
    if (db.rows[0]?.name !== "fazajoo_restore_test") {
      return res.status(403).json({ ok: false, message: "دیتابیس آزمایشی تأیید نشد." });
    }
    res.locals.networkPurchaseConfig = config;
    next();
  } catch (error) {
    console.error("Network purchase database check failed:", error);
    return res.status(503).json({ ok: false, message: "بررسی محیط آزمایشی انجام نشد." });
  }
}
router.get("/network-purchase/config", async (req, res) => {
  const config = networkPurchase.getConfig();
  if (!config.enabled) return res.json({ ok: true, enabled: false, demo: true });
  try {
    const db = await pool.query("SELECT current_database() AS name");
    return res.json({
      ok: true, enabled: db.rows[0]?.name === "fazajoo_restore_test",
      unitPriceRial: config.unitPriceRial, demo: true
    });
  } catch {
    return res.json({ ok: true, enabled: false, demo: true });
  }
});
router.post("/network-purchase", verifiedDemoConfig, async (req, res) => {
  try {
    const { quantity, idempotencyKey } = req.body || {};
    const result = await networkPurchase.purchaseNetworkCredits({
      userId: req.user.id, quantity, idempotencyKey
    });
    return res.json({ ok: true, ...result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ ok: false, message: error.message });
    if (["INVALID_USER", "INVALID_QUANTITY", "INVALID_IDEMPOTENCY_KEY"].includes(error.message))
      return res.status(400).json({ ok: false, message: "اطلاعات خرید معتبر نیست." });
    console.error("Network purchase failed:", error);
    return res.status(500).json({ ok: false, message: "ثبت خرید آزمایشی انجام نشد." });
  }
});
// Explicitly opted-in DEMO credit. NEVER use this endpoint for real funds.
// A browser request can only credit the named, authenticated user's TEST wallet.
const { rateLimit: demoRateLimit } = require("express-rate-limit");
const demoCreditLimiter = demoRateLimit({
  windowMs: 60 * 1000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false,
  message: { ok: false, message: "برای شارژ آزمایشی کمی صبر کنید." }
});
async function demoCreditGuard(req, res, next) {
  if (process.env.NODE_ENV === "production" ||
      process.env.DB_NAME !== "fazajoo_restore_test" ||
      process.env.WALLET_DEMO_CREDIT_ENABLED !== "true") {
    return res.status(404).json({ ok: false, message: "شارژ آزمایشی غیرفعال است." });
  }
  try {
    const db = await pool.query("SELECT current_database() AS name");
    if (db.rows[0]?.name !== "fazajoo_restore_test") {
      return res.status(404).json({ ok: false, message: "دیتابیس آزمایشی تأیید نشد." });
    }
    return next();
  } catch (error) {
    console.error("Demo credit guard failed:", error);
    return res.status(503).json({ ok: false, message: "بررسی دیتابیس آزمایشی ناموفق بود." });
  }
}
router.get("/demo-credit/config", demoCreditGuard, (_req, res) =>
  res.json({ ok: true, enabled: true, demo: true, maxAmountRial: "100000" })
);
router.post("/demo-credit", demoCreditGuard, demoCreditLimiter, async (req, res) => {
  const { amountRial, idempotencyKey } = req.body || {};
  if (typeof amountRial !== "string" || !/^[1-9][0-9]*$/.test(amountRial) ||
      BigInt(amountRial) > 100000n ||
      typeof idempotencyKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(idempotencyKey)) {
    return res.status(400).json({ ok: false, message: "مبلغ (حداکثر ۱۰۰٬۰۰۰ ریال) یا شناسه درخواست نامعتبر است." });
  }
  try {
    const result = await require("../services/walletLedger.service").recordMovement({
      userId: req.user.id, amountRial, kind: "topup", direction: "credit",
      idempotencyKey: "demo-topup:" + idempotencyKey,
      referenceType: "local_demo_credit", referenceId: idempotencyKey,
      note: "اعتبار نمایشی فقط در دیتابیس تست؛ بدون دریافت وجه"
    });
    return res.json({ ok: true, demo: true, ...result });
  } catch (error) {
    if (error.message === "IDEMPOTENCY_CONFLICT")
      return res.status(409).json({ ok: false, message: "این شناسه قبلاً با مشخصات دیگری استفاده شده است." });
    console.error("Demo wallet credit failed:", error);
    return res.status(500).json({ ok: false, message: "شارژ آزمایشی انجام نشد." });
  }
});

module.exports = router;
