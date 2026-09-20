const crypto = require("crypto");

const {
  query,
} = require("../db/pool");

const {
  createToken,
} = require("../utils/token");

const {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  sendOtpSms,
} = require("../services/otp.service");


const OTP_PURPOSE = "login";
const OTP_TTL_MINUTES = 2;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;


function normalizePhone(value = "") {
  let phone = String(value)
    .trim()
    .replace(/\D/g, "");

  if (phone.startsWith("0098")) {
    phone = `0${phone.slice(4)}`;
  }

  if (
    phone.startsWith("98") &&
    phone.length === 12
  ) {
    phone = `0${phone.slice(2)}`;
  }

  if (
    phone.startsWith("9") &&
    phone.length === 10
  ) {
    phone = `0${phone}`;
  }

  if (!/^09\d{9}$/.test(phone)) {
    return "";
  }

  return phone;
}


function safeUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    fullName: user.full_name,
    accountType: user.account_type,
    systemRole: user.system_role,
    agencyStatus: user.agency_status,
    isActive: user.is_active,
    createdAt: user.created_at,
  };
}


async function requestOtp(
  request,
  response
) {
  try {
    const normalizedPhone =
      normalizePhone(
        request.body?.phone
      );

    if (!normalizedPhone) {
      return response
        .status(400)
        .json({
          ok: false,
          message:
            "شماره موبایل معتبر نیست.",
        });
    }

    /*
     * در این مرحله OTP فقط برای کاربران
     * موجود فضاجو فعال است.
     */
    const userResult =
      await query(
        `
          SELECT
            id,
            is_active
          FROM users
          WHERE phone = $1
          LIMIT 1
        `,
        [normalizedPhone]
      );

    const user =
      userResult.rows[0];

    /*
     * برای کاهش امکان شناسایی شماره‌های
     * عضو سایت، پاسخ شماره ناشناخته را
     * عمومی نگه می‌داریم.
     */
    if (!user) {
      return response.json({
        ok: true,
        message:
          "اگر این شماره در فضاجو ثبت شده باشد، کد ورود برای آن ارسال می‌شود.",
        retryAfter: OTP_RESEND_SECONDS,
      });
    }

    if (!user.is_active) {
      /*
       * پاسخ حساب غیرفعال را نیز عمومی نگه می‌داریم
       * تا از روی endpoint درخواست OTP نتوان وضعیت
       * عضویت یک شماره موبایل را تشخیص داد.
       */
      return response.json({
        ok: true,
        message:
          "اگر این شماره در فضاجو ثبت شده باشد، کد ورود برای آن ارسال می‌شود.",
        retryAfter: OTP_RESEND_SECONDS,
      });
    }

    /*
     * جلوگیری از ارسال پشت‌سرهم.
     */
    const recentResult =
      await query(
        `
          SELECT created_at
          FROM auth_otp_codes
          WHERE phone = $1
            AND purpose = $2
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [
          normalizedPhone,
          OTP_PURPOSE,
        ]
      );

    const recent =
      recentResult.rows[0];

    if (recent) {
      const elapsedMs =
        Date.now() -
        new Date(
          recent.created_at
        ).getTime();

      const resendMs =
        OTP_RESEND_SECONDS * 1000;

      if (elapsedMs < resendMs) {
        const retryAfter =
          Math.ceil(
            (resendMs - elapsedMs) /
              1000
          );

        return response
          .status(429)
          .json({
            ok: false,
            code: "OTP_TOO_SOON",
            message:
              `لطفاً ${retryAfter} ثانیه دیگر دوباره تلاش کنید.`,
            retryAfter,
          });
      }
    }

    const code =
      generateOtpCode();

    const codeHash =
      hashOtpCode(code);

    const otpId =
      crypto.randomUUID();

    /*
     * OTPهای قبلی این شماره دیگر
     * قابل استفاده نباشند.
     */
    await query(
      `
        UPDATE auth_otp_codes
        SET consumed_at = NOW()
        WHERE phone = $1
          AND purpose = $2
          AND consumed_at IS NULL
      `,
      [
        normalizedPhone,
        OTP_PURPOSE,
      ]
    );

    await query(
      `
        INSERT INTO auth_otp_codes (
          id,
          phone,
          code_hash,
          purpose,
          expires_at,
          attempts,
          max_attempts
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          NOW() +
            ($5 * INTERVAL '1 minute'),
          0,
          $6
        )
      `,
      [
        otpId,
        normalizedPhone,
        codeHash,
        OTP_PURPOSE,
        OTP_TTL_MINUTES,
        OTP_MAX_ATTEMPTS,
      ]
    );

    try {
      await sendOtpSms(
        normalizedPhone,
        code
      );
    } catch (smsError) {
      /*
       * اگر ارسال پیامک شکست خورد،
       * همان OTP را باطل می‌کنیم.
       */
      await query(
        `
          UPDATE auth_otp_codes
          SET consumed_at = NOW()
          WHERE id = $1
            AND consumed_at IS NULL
        `,
        [otpId]
      );

      console.error(
        "OTP SMS delivery error:",
        smsError.status ||
          smsError.message
      );

      return response
        .status(502)
        .json({
          ok: false,
          code:
            "OTP_DELIVERY_FAILED",
          message:
            "ارسال کد ورود انجام نشد. لطفاً کمی بعد دوباره تلاش کنید.",
        });
    }

    return response.json({
      ok: true,
      message:
        "کد ورود فضاجو ارسال شد.",
      expiresIn:
        OTP_TTL_MINUTES * 60,
      retryAfter:
        OTP_RESEND_SECONDS,
    });

  } catch (error) {
    console.error(
      "Request OTP error:",
      error
    );

    return response
      .status(500)
      .json({
        ok: false,
        message:
          "درخواست کد ورود انجام نشد.",
      });
  }
}


async function verifyOtp(
  request,
  response
) {
  try {
    const normalizedPhone =
      normalizePhone(
        request.body?.phone
      );

    const code =
      String(
        request.body?.code || ""
      ).trim();

    if (
      !normalizedPhone ||
      !/^\d{6}$/.test(code)
    ) {
      return response
        .status(400)
        .json({
          ok: false,
          message:
            "شماره موبایل یا کد ورود معتبر نیست.",
        });
    }

    const otpResult =
      await query(
        `
          SELECT
            id,
            code_hash,
            expires_at,
            attempts,
            max_attempts,
            consumed_at
          FROM auth_otp_codes
          WHERE phone = $1
            AND purpose = $2
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [
          normalizedPhone,
          OTP_PURPOSE,
        ]
      );

    const otp =
      otpResult.rows[0];

    if (
      !otp ||
      otp.consumed_at ||
      new Date(
        otp.expires_at
      ).getTime() <= Date.now()
    ) {
      return response
        .status(401)
        .json({
          ok: false,
          code:
            "OTP_INVALID_OR_EXPIRED",
          message:
            "کد ورود نامعتبر یا منقضی شده است.",
        });
    }

    if (
      otp.attempts >=
      otp.max_attempts
    ) {
      return response
        .status(429)
        .json({
          ok: false,
          code:
            "OTP_ATTEMPTS_EXCEEDED",
          message:
            "تعداد تلاش‌های مجاز برای این کد تمام شده است. کد جدید دریافت کنید.",
        });
    }

    const matches =
      verifyOtpCode(
        otp.code_hash,
        code
      );

    if (!matches) {
      await query(
        `
          UPDATE auth_otp_codes
          SET attempts =
            attempts + 1
          WHERE id = $1
        `,
        [otp.id]
      );

      return response
        .status(401)
        .json({
          ok: false,
          code: "OTP_INVALID",
          message:
            "کد ورود صحیح نیست.",
        });
    }

    /*
     * قبل از صدور JWT، کاربر را
     * دوباره از دیتابیس می‌خوانیم.
     */
    const userResult =
      await query(
        `
          SELECT
            id,
            phone,
            full_name,
            account_type,
            system_role,
            agency_status,
            is_active,
            auth_version,
            created_at
          FROM users
          WHERE phone = $1
          LIMIT 1
        `,
        [normalizedPhone]
      );

    const user =
      userResult.rows[0];

    if (!user) {
      return response
        .status(401)
        .json({
          ok: false,
          message:
            "حساب کاربری معتبر نیست.",
        });
    }

    if (!user.is_active) {
      return response
        .status(423)
        .json({
          ok: false,
          code:
            "ACCOUNT_INACTIVE",
          message:
            "حساب کاربری شما در حال حاضر غیرفعال است.",
        });
    }

    /*
     * مصرف OTP و صدور توکن.
     */
    const consumed =
      await query(
        `
          UPDATE auth_otp_codes
          SET consumed_at = NOW()
          WHERE id = $1
            AND consumed_at IS NULL
            AND expires_at > NOW()
          RETURNING id
        `,
        [otp.id]
      );

    if (
      consumed.rowCount !== 1
    ) {
      return response
        .status(401)
        .json({
          ok: false,
          code:
            "OTP_ALREADY_USED",
          message:
            "این کد ورود دیگر قابل استفاده نیست.",
        });
    }

    const token =
      createToken(user);

    return response.json({
      ok: true,
      message:
        "ورود با کد پیامکی موفق بود.",
      token,
      user: safeUser(user),
    });

  } catch (error) {
    console.error(
      "Verify OTP error:",
      error
    );

    return response
      .status(500)
      .json({
        ok: false,
        message:
          "تأیید کد ورود انجام نشد.",
      });
  }
}


module.exports = {
  requestOtp,
  verifyOtp,
};