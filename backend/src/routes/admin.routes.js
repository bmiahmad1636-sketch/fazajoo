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
