const rateLimit = require("express-rate-limit");

const contactRevealLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
  handler: (req, res) => {
    return res.status(429).json({
      ok: false,
      message: "تعداد درخواست‌های مشاهده شماره تماس بیش از حد مجاز است. لطفاً چند دقیقه دیگر دوباره تلاش کنید.",
    });
  },
});

module.exports = {
  contactRevealLimiter,
};
