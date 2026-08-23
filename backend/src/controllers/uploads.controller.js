const storage = require("../services/storage.service");

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function validateImage(file) {
  if (!file) {
    const error = new Error("فایل ارسال نشده است.");
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    const error = new Error("فرمت تصویر باید JPG، PNG یا WebP باشد.");
    error.statusCode = 400;
    throw error;
  }
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
    validateImage(request.file);

    const result = await storage.uploadAdImage({
      buffer: request.file.buffer,
      mimeType: request.file.mimetype,
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

    response.setHeader("Content-Type", result.ContentType || "image/jpeg");
    // Helmet defaults Cross-Origin-Resource-Policy to same-origin.
    // The frontend runs on a different local origin (for example localhost:5173),
    // so public ad images must explicitly allow cross-origin embedding.
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    response.setHeader(
      "Cache-Control",
      result.CacheControl || "public, max-age=31536000, immutable"
    );

    if (result.ContentLength != null) {
      response.setHeader("Content-Length", String(result.ContentLength));
    }

    if (!result.Body) {
      return response.status(404).end();
    }

    result.Body.on("error", (error) => {
      console.error("Ad image stream error:", error);
      if (!response.headersSent) response.status(500).end();
      else response.destroy(error);
    });

    return result.Body.pipe(response);
  } catch (error) {
    console.error("Get ad image error:", error);
    return response.status(error.statusCode || 500).json({
      ok: false,
      message: error.statusCode ? error.message : "نمایش تصویر آگهی انجام نشد.",
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
    console.error("Delete ad image error:", error);
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
    validateImage(request.file);

    const result = await storage.uploadAgencyDocument({
      buffer: request.file.buffer,
      mimeType: request.file.mimetype,
      originalName: request.file.originalname,
      userId: request.user.id,
      documentType: request.body.documentType,
    });

    return response.status(201).json({
      ok: true,
      document: result,
    });
  } catch (error) {
    console.error("Upload agency document error:", error);
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
