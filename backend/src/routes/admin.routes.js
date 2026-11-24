const express =
  require("express");

const {
  listUsers,
  getAgencyDocument,
  approveAgent,
  rejectAgent,
} = require(
  "../controllers/admin.controller"
);

const {
  requireAuth,
  requireAdmin,
} = require(
  "../middleware/auth.middleware"
);

const {
  getApprovedAgentNetworkCredits,
  grantPaidNetworkCredits,
} = require("../services/networkOpportunity.service");

const {
  listSecurityAlerts,
} = require("../services/securityMonitoring.service");

const router =
  express.Router();

router.use(
  requireAuth,
  requireAdmin
);

const noticePolicy = require("../services/notificationPolicyNT03.service");
router.get("/notification-policy", async (req,res) => {
  try { return res.json({ok:true,policy:await noticePolicy.getPolicy(),audit:await noticePolicy.audit()}); }
  catch(e) { console.error("Notification policy read failed",e.code); return res.status(500).json({ok:false,message:"دریافت تنظیمات اعلان‌ها انجام نشد."}); }
});
router.patch("/notification-policy", async (req,res) => {
  try { return res.json({ok:true,policy:await noticePolicy.savePolicy(req.user.id,req.body)}); }
  catch(e) { return res.status(e.status || 500).json({ok:false,message:e.status ? e.message : "ذخیره تنظیمات اعلان‌ها انجام نشد."}); }
});

router.get(
  "/users",
  listUsers
);

router.get("/security/alerts", async (req, res) => {
  try {
    const alerts = await listSecurityAlerts({
      limit: req.query?.limit,
    });

    return res.json({ ok: true, alerts });
  } catch (error) {
    console.error("Admin security alerts error:", error);
    return res.status(500).json({
      ok: false,
      message: "دریافت هشدارهای امنیتی انجام نشد.",
    });
  }
});

router.get("/network/agents", async (req, res) => {
  try {
    const agents = await getApprovedAgentNetworkCredits();
    return res.json({ ok: true, agents });
  } catch (error) {
    console.error("Admin network agents error:", error);
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || "دریافت سهمیه مشاوران انجام نشد.",
    });
  }
});

router.post("/network/agents/:id/grant", async (req, res) => {
  try {
    const quota = await grantPaidNetworkCredits(req.params.id, req.body?.amount);
    return res.json({
      ok: true,
      message: "سهمیه مشاور با موفقیت شارژ شد.",
      quota,
    });
  } catch (error) {
    console.error("Admin grant network credits error:", error);
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || "شارژ سهمیه انجام نشد.",
    });
  }
});

router.get(
  "/users/:id/documents/:documentType",
  getAgencyDocument
);

router.patch(
  "/users/:id/approve-agent",
  approveAgent
);

router.patch(
  "/users/:id/reject-agent",
  rejectAgent
);

module.exports =
  router;
