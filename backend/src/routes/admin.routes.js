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

const router =
  express.Router();

router.use(
  requireAuth,
  requireAdmin
);

router.get(
  "/users",
  listUsers
);

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
