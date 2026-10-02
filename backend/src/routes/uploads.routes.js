const express = require("express");
const multer = require("multer");
const os = require("os");

const {
  requireAuth,
} = require("../middleware/auth.middleware");

const {
  adImageUploadLimiter,
  adVideoUploadLimiter,
  agencyDocumentUploadLimiter,
} = require("../middleware/uploadRateLimit.middleware");

const controller = require("../controllers/uploads.controller");

const router = express.Router();

const adImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

const adVideoUpload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => cb(null, `fazajoo-video-${Date.now()}-${Math.random().toString(16).slice(2)}`),
  }),
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 1,
  },
});

const agencyDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
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
  adImageUploadLimiter,
  adVideoUploadLimiter,
  adImageUpload.single("file"),
  controller.uploadAdImage
);

router.delete(
  "/ad-image",
  requireAuth,
  controller.deleteAdImage
);

router.get(
  "/ad-video/:userId/:filename",
  controller.getAdVideo
);

router.post(
  "/ad-video",
  requireAuth,
  adVideoUploadLimiter,
  adVideoUpload.single("file"),
  controller.uploadAdVideo
);

router.delete(
  "/ad-video",
  requireAuth,
  controller.deleteAdVideo
);

router.post(
  "/agency-document",
  requireAuth,
  agencyDocumentUploadLimiter,
  agencyDocumentUpload.single("file"),
  controller.uploadAgencyDocument
);

module.exports = router;
