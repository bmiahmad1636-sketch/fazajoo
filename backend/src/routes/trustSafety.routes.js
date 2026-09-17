const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");
const { trustActionLimiter } = require("../middleware/trustSafetyRateLimit.middleware");
const s = require("../services/trustSafety.service");

const router = express.Router();
router.use(requireAuth);

router.post("/reports", trustActionLimiter, async (req, res) => {
  try {
    const report = await s.createReport({
      reporterId: req.user.id,
      targetType: req.body?.targetType,
      targetId: req.body?.targetId,
      reportedUserId: req.body?.reportedUserId,
      reason: req.body?.reason,
      details: req.body?.details,
    });
    return res.status(201).json({
      ok: true,
      message: "گزارش شما ثبت شد و توسط مدیریت فضاجو بررسی می‌شود.",
      report,
    });
  } catch (e) {
    console.error("Create abuse report error:", e);
    return res.status(e.status || 500).json({ ok: false, message: e.status ? e.message : "ثبت گزارش انجام نشد." });
  }
});

router.get("/blocks", async (req, res) => {
  try {
    return res.json({ ok: true, users: await s.listMyBlockedUsers(req.user.id) });
  } catch (e) {
    console.error("List blocked users error:", e);
    return res.status(500).json({ ok: false, message: "دریافت فهرست کاربران مسدودشده انجام نشد." });
  }
});

router.get("/blocks/:userId", async (req, res) => {
  try {
    return res.json({ ok: true, ...(await s.getBlockStatus(req.user.id, req.params.userId)) });
  } catch (e) {
    console.error("Get block status error:", e);
    return res.status(500).json({ ok: false, message: "دریافت وضعیت مسدودسازی انجام نشد." });
  }
});

router.post("/blocks", trustActionLimiter, async (req, res) => {
  try {
    await s.blockUser(req.user.id, req.body?.userId);
    return res.json({ ok: true, message: "این کاربر مسدود شد. از این پس امکان ارسال پیام بین شما وجود ندارد." });
  } catch (e) {
    console.error("Block user error:", e);
    return res.status(e.status || 500).json({ ok: false, message: e.status ? e.message : "مسدودسازی انجام نشد." });
  }
});

router.delete("/blocks/:userId", trustActionLimiter, async (req, res) => {
  try {
    await s.unblockUser(req.user.id, req.params.userId);
    return res.json({ ok: true, message: "مسدودسازی کاربر برداشته شد." });
  } catch (e) {
    console.error("Unblock user error:", e);
    return res.status(500).json({ ok: false, message: "رفع مسدودسازی انجام نشد." });
  }
});

router.get("/notices", async (req, res) => {
  try {
    return res.json({ ok: true, notices: await s.getMyNotices(req.user.id) });
  } catch (e) {
    console.error("Get moderation notices error:", e);
    return res.status(500).json({ ok: false, message: "دریافت هشدارهای مدیریتی انجام نشد." });
  }
});

router.patch("/notices/:id/read", async (req, res) => {
  try {
    const notice = await s.markNoticeRead(req.user.id, req.params.id);
    return res.json({ ok: true, notice });
  } catch (e) {
    console.error("Read moderation notice error:", e);
    return res.status(e.status || 500).json({ ok: false, message: e.status ? e.message : "ثبت مشاهده هشدار انجام نشد." });
  }
});

router.get("/admin/reports", requireAdmin, async (req, res) => {
  try {
    return res.json({ ok: true, reports: await s.listReports(req.query?.status) });
  } catch (e) {
    console.error("Admin reports list error:", e);
    return res.status(500).json({ ok: false, message: "دریافت گزارش‌ها انجام نشد." });
  }
});

router.get("/admin/reports/:id/chat", requireAdmin, async (req, res) => {
  try {
    const data = await s.getAdminReportChat(req.params.id);
    return res.json({ ok: true, ...data });
  } catch (e) {
    console.error("Admin report chat preview error:", e);
    return res.status(e.status || 500).json({ ok: false, message: e.status ? e.message : "دریافت گفتگوی گزارش‌شده انجام نشد." });
  }
});

router.patch("/admin/reports/:id", requireAdmin, async (req, res) => {
  try {
    const report = await s.updateReport(req.params.id, {
      status: req.body?.status,
      note: req.body?.note,
      adminId: req.user.id,
    });
    return res.json({ ok: true, report });
  } catch (e) {
    console.error("Admin report update error:", e);
    return res.status(e.status || 500).json({ ok: false, message: e.status ? e.message : "بروزرسانی گزارش انجام نشد." });
  }
});

router.post("/admin/reports/:id/actions", requireAdmin, async (req, res) => {
  try {
    const action = await s.applyAdminAction(req.params.id, {
      action: req.body?.action,
      note: req.body?.note,
      adminId: req.user.id,
    });
    return res.json({ ok: true, message: "اقدام مدیریتی ثبت و اجرا شد.", action });
  } catch (e) {
    console.error("Admin moderation action error:", e);
    return res.status(e.status || 500).json({ ok: false, message: e.status ? e.message : "اجرای اقدام مدیریتی انجام نشد." });
  }
});

module.exports = router;
