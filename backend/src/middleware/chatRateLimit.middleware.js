const rateLimit = require("express-rate-limit");

const sendMessageRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,

  // این middleware بعد از requireAuth اجرا می‌شود؛ بنابراین محدودیت
  // برای هر حساب کاربری مستقل اعمال می‌شود و کاربران پشت یک IP مشترک
  // بی‌دلیل روی یکدیگر اثر نمی‌گذارند.
  keyGenerator: (request) => String(request.user.id),

  handler: (request, response) => {
    return response.status(429).json({
      ok: false,
      code: "CHAT_RATE_LIMITED",
      message:
        "تعداد پیام‌های ارسالی شما در مدت کوتاه بیش از حد مجاز شده است. لطفاً کمی صبر کنید و دوباره تلاش کنید.",
    });
  },
});

module.exports = {
  sendMessageRateLimit,
};
