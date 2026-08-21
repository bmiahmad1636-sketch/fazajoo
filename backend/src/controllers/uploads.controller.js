const storage = require("../services/storage.service");

async function uploadAdImage(request, response) {
  try {
    if (!request.file) return response.status(400).json({ ok: false, message: "فایل تصویر ارسال نشده است." });
    const result = await storage.uploadAdImage({
      buffer: request.file.buffer,
      mimeType: request.file.mimetype,
      originalName: request.file.originalname,
      userId: request.user.id,
    });
    return response.status(201).json({ ok: true, image: result });
  } catch (error) {
    console.error("Upload image error:", error);
    return response.status(500).json({ ok: false, message: "آپلود تصویر در فضای ذخیره‌سازی فضاجو انجام نشد." });
  }
}

async function deleteAdImage(request, response) {
  try {
    const url = String(request.body?.url || "").trim();
    if (!url) return response.status(400).json({ ok: false, message: "آدرس تصویر ارسال نشده است." });
    const result = await storage.deleteByPublicUrl(url, request.user.id);
    return response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Delete image error:", error);
    return response.status(400).json({ ok: false, message: "حذف تصویر انجام نشد." });
  }
}

module.exports = { uploadAdImage, deleteAdImage };
