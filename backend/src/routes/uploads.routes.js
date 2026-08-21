const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controllers/uploads.controller");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

router.post(
  "/agency-document",
  requireAuth,
  upload.single("file"),
  controller.uploadAgencyDocument
);

module.exports = router;
