"use strict";
// Mount manually only after reviewing app.js. Never exposes payment settlement.
const router = require("express").Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { createCallbackHandler } = require("../controllers/walletCallback.controller");
router.use(requireAuth);
router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/callback-preview", createCallbackHandler());
module.exports = router;
