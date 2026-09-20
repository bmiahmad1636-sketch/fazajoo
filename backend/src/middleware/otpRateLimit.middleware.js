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


function buildOtpIpPhoneRateLimitKey(
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

  return `ip:${ip}|phone:${phone}`;
}


function buildOtpPhoneRateLimitKey(
  request
) {
  const phone =
    normalizePhoneForRateLimit(
      request.body?.phone
    );

  const ip =
    getClientIp(request);

  /*
   * اگر شماره معتبر باشد، محدودیت مستقل روی خود شماره اعمال می‌شود.
   * بنابراین تغییر IP باعث دور زدن این لایه نمی‌شود.
   *
   * برای ورودی نامعتبر، به IP برمی‌گردیم تا همه ورودی‌های نامعتبر
   * زیر یک کلید مشترک قرار نگیرند.
   */
  if (!phone) {
    return `invalid-phone|ip:${ip}`;
  }

  return `phone:${phone}`;
}


const otpRequestLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 5,

    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator:
      buildOtpIpPhoneRateLimitKey,

    message: {
      ok: false,
      code:
        "OTP_RATE_LIMITED",

      message:
        "تعداد درخواست‌های کد ورود بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
    },
  });


/*
 * لایه دوم درخواست OTP:
 * محدودیت مستقل بر اساس شماره موبایل.
 * این لایه در کنار otpRequestLimiter اجرا می‌شود و جایگزین آن نیست.
 *
 * نکته:
 * MemoryStore پیش‌فرض express-rate-limit برای محیط توسعه مناسب است.
 * در استقرار چندسروری/Production باید Store مشترک (مثلاً Redis) استفاده شود.
 */
const otpPhoneRequestLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 5,

    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator:
      buildOtpPhoneRateLimitKey,

    message: {
      ok: false,
      code:
        "OTP_PHONE_RATE_LIMITED",

      message:
        "تعداد درخواست‌های کد ورود برای این شماره بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
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
      buildOtpIpPhoneRateLimitKey,

    message: {
      ok: false,
      code:
        "OTP_VERIFY_RATE_LIMITED",

      message:
        "تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
    },
  });


/*
 * لایه دوم بررسی OTP:
 * تلاش‌های تأیید برای یک شماره را مستقل از IP محدود می‌کند.
 */
const otpPhoneVerifyLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 15,

    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator:
      buildOtpPhoneRateLimitKey,

    message: {
      ok: false,
      code:
        "OTP_PHONE_VERIFY_RATE_LIMITED",

      message:
        "تعداد تلاش‌های ورود برای این شماره بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
    },
  });


module.exports = {
  otpRequestLimiter,
  otpPhoneRequestLimiter,
  otpVerifyLimiter,
  otpPhoneVerifyLimiter,
};
