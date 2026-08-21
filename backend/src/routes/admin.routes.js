const express =
  require("express");

const {
  listUsers,
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
