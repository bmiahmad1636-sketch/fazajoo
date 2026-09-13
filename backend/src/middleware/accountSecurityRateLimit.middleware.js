const rateLimit = require("express-rate-limit");

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
  handler: (req, res) => {
    return res.status(429).json({
      ok: false,
      message: "تعداد تلاش‌های تغییر رمز بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
    });
  },
});

module.exports = {
  changePasswordLimiter,
};
