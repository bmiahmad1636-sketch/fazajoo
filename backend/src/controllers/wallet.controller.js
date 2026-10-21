"use strict";
const ledger = require("../services/walletLedger.service");

async function balance(req, res) {
  try {
    const balanceRial = await ledger.getBalance(req.user.id);
    return res.json({ ok: true, balanceRial });
  } catch (err) {
    console.error("Wallet balance read failed:", err);
    return res.status(500).json({ ok: false, message: "خطا در دریافت موجودی کیف پول." });
  }
}

async function history(req, res) {
  const rawLimit = req.query.limit;
  // Avoid ambiguous query parameters, decimals, negative values, and large requests.
  if (rawLimit !== undefined &&
      (typeof rawLimit !== "string" || !/^[1-9][0-9]?$/.test(rawLimit) || Number(rawLimit) > 50)) {
    return res.status(400).json({ ok: false, message: "تعداد تراکنش‌های درخواستی نامعتبر است (۱ تا ۵۰)." });
  }
  const limit = rawLimit === undefined ? 20 : Number(rawLimit);
  try {
    const transactions = await ledger.getHistory(req.user.id, limit);
    return res.json({ ok: true, transactions, limit });
  } catch (err) {
    console.error("Wallet history read failed:", err);
    return res.status(500).json({ ok: false, message: "خطا در دریافت سوابق کیف پول." });
  }
}

module.exports = { balance, history };
