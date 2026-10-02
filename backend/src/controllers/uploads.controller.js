const fs = require("fs");
const { query } = require("../db/pool");
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


function detectRealVideoType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return "video/webm";
  // ISO Base Media / QuickTime: size(4) + "ftyp" + brand
  if (buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();
    if (brand.includes("qt")) return "video/quicktime";
    return "video/mp4";
  }
  return null;
}

function adVideoUrl(request, key) {
  const parts = key.split("/");
  const userId = parts[1];
  const filename = parts[2];
  const base = `${request.protocol}://${request.get("host")}`;
  return `${base}/api/uploads/ad-video/${encodeURIComponent(userId)}/${encodeURIComponent(filename)}`;
}

async function uploadAdVideo(request, response) {
  const filePath = request.file?.path;
  try {
    if (!request.file || !filePath) throw createValidationError("فایل ویدئو ارسال نشده است.");
    const allowed = new Set(["video/mp4", "video/quicktime", "video/webm"]);
    if (!allowed.has(request.file.mimetype)) throw createValidationError("فرمت ویدئو باید MP4، MOV یا WebM باشد.");
    if (request.file.size > 100 * 1024 * 1024) throw createValidationError("حجم ویدئو نباید بیشتر از ۱۰۰ مگابایت باشد.");

    const duration = Number(request.body?.duration || 0);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 120.5) {
      throw createValidationError("مدت ویدئو باید حداکثر ۲ دقیقه باشد.");
    }

    const handle = await fs.promises.open(filePath, "r");
    const header = Buffer.alloc(32);
    await handle.read(header, 0, 32, 0);
    await handle.close();
    const realType = detectRealVideoType(header);
    if (!realType) throw createValidationError("ساختار فایل ویدئو معتبر نیست.");
    // Some browsers report MOV/MP4 differently. Both are ISO media; WebM must match exactly.
    if (realType === "video/webm" && request.file.mimetype !== "video/webm") {
      throw createValidationError("نوع واقعی ویدئو با فرمت اعلام‌شده مطابقت ندارد.");
    }

    const result = await storage.uploadAdVideo({
      body: fs.createReadStream(filePath),
      mimeType: request.file.mimetype,
      originalName: request.file.originalname,
      userId: request.user.id,
      size: request.file.size,
    });

    return response.status(201).json({
      ok: true,
      video: {
        url: adVideoUrl(request, result.key),
        key: result.key,
        mimeType: request.file.mimetype,
        size: request.file.size,
        duration: Math.round(duration * 10) / 10,
        status: "ready",
      },
    });
  } catch (error) {
    console.error("Upload ad video error:", error);
    return response.status(error.statusCode || 500).json({
      ok: false,
      message: error.statusCode ? error.message : "آپلود ویدئوی آگهی انجام نشد.",
    });
  } finally {
    if (filePath) fs.promises.unlink(filePath).catch(() => {});
  }
}

async function getAdVideo(request, response) {
  try {
    const key = `ad-videos/${request.params.userId}/${request.params.filename}`;
    const linked = await query(
      `SELECT s.status AS space_status, item->>'status' AS video_status
       FROM spaces s, jsonb_array_elements(COALESCE(s.media_items,'[]'::jsonb)) item
       WHERE item->>'type'='video' AND item->>'key'=$1
       LIMIT 1`,
      [key]
    );
    const link = linked.rows[0];
    if (link && (link.space_status === "inactive" || link.video_status === "blocked")) {
      return response.status(404).json({ ok: false, message: "ویدئو در دسترس نیست." });
    }
    const result = await storage.getAdVideo({
      userId: request.params.userId,
      filename: request.params.filename,
      range: request.headers.range,
    });
    response.setHeader("Content-Type", result.ContentType || "video/mp4");
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    response.setHeader("Accept-Ranges", "bytes");
    response.setHeader("Cache-Control", result.CacheControl || "public, max-age=31536000, immutable");
    if (result.ContentRange) {
      response.status(206);
      response.setHeader("Content-Range", result.ContentRange);
    }
    if (result.ContentLength != null) response.setHeader("Content-Length", String(result.ContentLength));
    if (!result.Body) return response.status(404).end();
    result.Body.on("error", (error) => response.headersSent ? response.destroy(error) : response.status(500).end());
    return result.Body.pipe(response);
  } catch (error) {
    console.error("Get ad video error:", error);
    return response.status(error.statusCode || 500).json({ ok: false, message: error.statusCode ? error.message : "نمایش ویدئو انجام نشد." });
  }
}

async function deleteAdVideo(request, response) {
  try {
    const url = request.body?.url;
    if (!url || typeof url !== "string") return response.status(400).json({ ok: false, message: "آدرس ویدئو ارسال نشده است." });
    const protectedMedia = await query(
      `SELECT id FROM spaces
       WHERE owner_id=$1 AND (legal_hold=TRUE OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(media_items,'[]'::jsonb)) x WHERE x->>'type'='video' AND x->>'url'=$2 AND x->>'status'='blocked'))
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(COALESCE(media_items,'[]'::jsonb)) item
           WHERE item->>'type'='video' AND item->>'url'=$2
         )
       LIMIT 1`,
      [request.user.id, url]
    );
    if (protectedMedia.rowCount) {
      return response.status(423).json({ ok: false, message: "این ویدئو تحت حفاظت حقوقی است و قابل حذف نیست." });
    }
    const result = await storage.deleteAdVideo({ url, userId: request.user.id });
    return response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Delete ad video error:", error);
    return response.status(error.statusCode || 500).json({ ok: false, message: error.statusCode ? error.message : "حذف ویدئو انجام نشد." });
  }
}

module.exports = {
  uploadAdImage,
  getAdImage,
  deleteAdImage,
  uploadAdVideo,
  getAdVideo,
  deleteAdVideo,
  uploadAgencyDocument,
};