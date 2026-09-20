const rateLimit = require("express-rate-limit");

function normalizePhone(value) {
  let phone = String(value || "").trim().replace(/\D/g, "");
  if (phone.startsWith("0098")) phone = "0" + phone.slice(4);
  else if (phone.startsWith("98")) phone = "0" + phone.slice(2);
  else if (phone.startsWith("9") && phone.length === 10) phone = "0" + phone;
  return /^09\d{9}$/.test(phone) ? phone : "";
}

function phoneAndIpKey(req) {
  const phone = normalizePhone(req.body?.phone);
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  return phone ? `ip:${ip}|phone:${phone}` : `ip:${ip}`;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: phoneAndIpKey,
  message: {
    ok: false,
    code: "LOGIN_RATE_LIMITED",
    message: "تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
  },
});

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: phoneAndIpKey,
  message: {
    ok: false,
    code: "PASSWORD_RESET_RATE_LIMITED",
    message: "تعداد درخواست‌های بازیابی رمز بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
  },
});

const passwordResetConfirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: phoneAndIpKey,
  message: {
    ok: false,
    code: "PASSWORD_RESET_VERIFY_RATE_LIMITED",
    message: "تعداد تلاش‌های بازیابی رمز بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
  },
});

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
  loginLimiter,
  passwordResetRequestLimiter,
  passwordResetConfirmLimiter,
  changePasswordLimiter,
};
