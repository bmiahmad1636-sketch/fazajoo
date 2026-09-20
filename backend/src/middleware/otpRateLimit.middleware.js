const rateLimit =
  require("express-rate-limit");


function normalizePhoneForRateLimit(
  value
) {
  let phone =
    String(value || "")
      .trim()
      .replace(/\D/g, "");

  if (phone.startsWith("0098")) {
    phone =
      "0" + phone.slice(4);
  } else if (phone.startsWith("98")) {
    phone =
      "0" + phone.slice(2);
  } else if (
    phone.startsWith("9") &&
    phone.length === 10
  ) {
    phone =
      "0" + phone;
  }

  if (!/^09\d{9}$/.test(phone)) {
    return "";
  }

  return phone;
}


function getClientIp(request) {
  return (
    request.ip ||
    request.socket?.remoteAddress ||
    "unknown"
  );
}


function buildOtpRateLimitKey(
  request
) {
  const phone =
    normalizePhoneForRateLimit(
      request.body?.phone
    );

  const ip =
    getClientIp(request);

  if (!phone) {
    return `ip:${ip}`;
  }

  /*
   * ترکیب IP و شماره موبایل:
   * - یک IP به‌تنهایی همه کاربران شبکه مشترک را قفل نمی‌کند.
   * - درخواست‌های تکراری همان IP برای همان شماره محدود می‌شوند.
   * - محدودیت 60 ثانیه‌ای و تلاش‌های OTP در controller نیز
   *   همچنان به‌صورت مستقل فعال هستند.
   */
  return `ip:${ip}|phone:${phone}`;
}


const otpRequestLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 5,

    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator:
      buildOtpRateLimitKey,

    message: {
      ok: false,
      code:
        "OTP_RATE_LIMITED",

      message:
        "تعداد درخواست‌های کد ورود بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
    },
  });


const otpVerifyLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 15,

    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator:
      buildOtpRateLimitKey,

    message: {
      ok: false,
      code:
        "OTP_VERIFY_RATE_LIMITED",

      message:
        "تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
    },
  });


module.exports = {
  otpRequestLimiter,
  otpVerifyLimiter,
};
