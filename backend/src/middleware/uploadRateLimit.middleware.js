const rateLimit = require("express-rate-limit");

function createUploadLimiter({
  windowMs,
  limit,
  message,
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (request, response) => {
      return response.status(429).json({
        ok: false,
        message,
      });
    },
  });
}

const adImageUploadLimiter = createUploadLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  message:
    "تعداد آپلود تصاویر در مدت کوتاه بیش از حد مجاز است. لطفاً چند دقیقه دیگر دوباره تلاش کنید.",
});

const agencyDocumentUploadLimiter = createUploadLimiter({
  windowMs: 30 * 60 * 1000,
  limit: 10,
  message:
    "تعداد آپلود مدارک در مدت کوتاه بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
});

module.exports = {
  adImageUploadLimiter,
  agencyDocumentUploadLimiter,
};
