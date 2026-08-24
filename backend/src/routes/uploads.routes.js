const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controllers/uploads.controller");

const router = express.Router();

const adImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

const agencyDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

// Public ad image delivery. Only files inside the dedicated ad-images folder
// can be fetched through this route. Agency documents are never exposed here.
router.get(
  "/ad-image/:userId/:filename",
  controller.getAdImage
);

router.post(
  "/ad-image",
  requireAuth,
  adImageUpload.single("file"),
  controller.uploadAdImage
);

router.delete(
  "/ad-image",
  requireAuth,
  controller.deleteAdImage
);

router.post(
  "/agency-document",
  requireAuth,
  agencyDocumentUpload.single("file"),
  controller.uploadAgencyDocument
);

module.exports = router;
