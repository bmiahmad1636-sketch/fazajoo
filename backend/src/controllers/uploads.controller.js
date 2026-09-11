const storage = require("../services/storage.service");

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function detectRealImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP:
  // RIFF....WEBP
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function validateImage(file) {
  if (!file) {
    throw createValidationError(
      "فایل ارسال نشده است."
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    throw createValidationError(
      "فرمت تصویر باید JPG، PNG یا WebP باشد."
    );
  }

  if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
    throw createValidationError(
      "محتوای فایل تصویر قابل بررسی نیست."
    );
  }

  const realMimeType = detectRealImageType(file.buffer);

  if (!realMimeType) {
    throw createValidationError(
      "فایل ارسال‌شده تصویر معتبر JPG، PNG یا WebP نیست."
    );
  }

  if (realMimeType !== file.mimetype) {
    throw createValidationError(
      "نوع واقعی فایل با فرمت اعلام‌شده تصویر مطابقت ندارد."
    );
  }

  return realMimeType;
}

function adImageUrl(request, key) {
  const parts = key.split("/");
  const userId = parts[1];
  const filename = parts[2];
  const base = `${request.protocol}://${request.get("host")}`;

  return `${base}/api/uploads/ad-image/${encodeURIComponent(
    userId
  )}/${encodeURIComponent(filename)}`;
}

async function uploadAdImage(request, response) {
  try {
    const realMimeType = validateImage(request.file);

    const result = await storage.uploadAdImage({
      buffer: request.file.buffer,
      mimeType: realMimeType,
      originalName: request.file.originalname,
      userId: request.user.id,
    });

    return response.status(201).json({
      ok: true,
      image: {
        ...result,
        url: adImageUrl(request, result.key),
      },
    });
  } catch (error) {
    console.error("Upload ad image error:", error);

    return response.status(error.statusCode || 500).json({
      ok: false,
      message: error.statusCode
        ? error.message
        : "آپلود تصویر آگهی انجام نشد.",
    });
  }
}

async function getAdImage(request, response) {
  try {
    const result = await storage.getAdImage({
      userId: request.params.userId,
      filename: request.params.filename,
    });

    response.setHeader(
      "Content-Type",
      result.ContentType || "image/jpeg"
    );

    // Helmet defaults Cross-Origin-Resource-Policy to same-origin.
    // The frontend runs on a different local origin (for example localhost:5173),
    // so public ad images must explicitly allow cross-origin embedding.
    response.setHeader(
      "Cross-Origin-Resource-Policy",
      "cross-origin"
    );

    response.setHeader(
      "Cache-Control",
      result.CacheControl ||
        "public, max-age=31536000, immutable"
    );

    if (result.ContentLength != null) {
      response.setHeader(
        "Content-Length",
        String(result.ContentLength)
      );
    }

    if (!result.Body) {
      return response.status(404).end();
    }

    result.Body.on("error", (error) => {
      console.error(
        "Ad image stream error:",
        error
      );

      if (!response.headersSent) {
        response.status(500).end();
      } else {
        response.destroy(error);
      }
    });

    return result.Body.pipe(response);
  } catch (error) {
    console.error("Get ad image error:", error);

    return response.status(error.statusCode || 500).json({
      ok: false,
      message: error.statusCode
        ? error.message
        : "نمایش تصویر آگهی انجام نشد.",
    });
  }
}

async function deleteAdImage(request, response) {
  try {
    const url = request.body?.url;

    if (!url || typeof url !== "string") {
      return response.status(400).json({
        ok: false,
        message: "آدرس تصویر ارسال نشده است.",
      });
    }

    const result = await storage.deleteAdImage({
      url,
      userId: request.user.id,
    });

    return response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Delete ad image error:",
      error
    );

    return response.status(error.statusCode || 500).json({
      ok: false,
      message: error.statusCode
        ? error.message
        : "حذف تصویر آگهی انجام نشد.",
    });
  }
}

async function uploadAgencyDocument(request, response) {
  try {
    const realMimeType = validateImage(request.file);

    const result = await storage.uploadAgencyDocument({
      buffer: request.file.buffer,
      mimeType: realMimeType,
      originalName: request.file.originalname,
      userId: request.user.id,
      documentType: request.body.documentType,
    });

    return response.status(201).json({
      ok: true,
      document: result,
    });
  } catch (error) {
    console.error(
      "Upload agency document error:",
      error
    );

    return response.status(error.statusCode || 500).json({
      ok: false,
      message: error.statusCode
        ? error.message
        : "آپلود مدرک انجام نشد.",
    });
  }
}

module.exports = {
  uploadAdImage,
  getAdImage,
  deleteAdImage,
  uploadAgencyDocument,
};