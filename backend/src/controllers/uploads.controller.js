const storage = require("../services/storage.service");

async function uploadAgencyDocument(request, response) {
  try {
    if (!request.file) {
      return response.status(400).json({
        ok: false,
        message: "فایل ارسال نشده است."
      });
    }

    const result = await storage.uploadAgencyDocument({
      buffer: request.file.buffer,
      mimeType: request.file.mimetype,
      originalName: request.file.originalname,
      userId: request.user.id,
      documentType: request.body.documentType,
    });

    return response.status(201).json({
      ok: true,
      document: result
    });

  } catch (error) {
    console.error("Upload agency document error:", error);
    return response.status(500).json({
      ok: false,
      message: "آپلود مدرک انجام نشد."
    });
  }
}

module.exports = {
  uploadAgencyDocument
};
