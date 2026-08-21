const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controllers/uploads.controller");

const router = express.Router();
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(request, file, callback) {
    if (!allowedTypes.has(file.mimetype)) return callback(new Error("INVALID_IMAGE_TYPE"));
    callback(null, true);
  },
});

router.post("/ad-image", requireAuth, upload.single("file"), controller.uploadAdImage);
router.delete("/ad-image", requireAuth, controller.deleteAdImage);

module.exports = router;
