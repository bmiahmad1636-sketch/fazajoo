const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const { query } = require("../db/pool");
const {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  sendOtpSms,
} = require("../services/otp.service");

const RESET_PURPOSE = "password_reset";
const OTP_TTL_MINUTES = 2;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

function normalizePhone(value = "") {
  let phone = String(value).trim().replace(/\D/g, "");
  if (phone.startsWith("0098")) phone = `0${phone.slice(4)}`;
  if (phone.startsWith("98") && phone.length === 12) phone = `0${phone.slice(2)}`;
  if (phone.startsWith("9") && phone.length === 10) phone = `0${phone}`;
  return /^09\d{9}$/.test(phone) ? phone : "";
}

function validPassword(password) {
  if (typeof password !== "string") return false;
  const length = Buffer.byteLength(password, "utf8");
  return length >= 8 && length <= 72;
}

function genericRequestResponse(response) {
  return response.json({
    ok: true,
    message: "اگر این شماره در فضاجو ثبت شده باشد، کد بازیابی رمز برای آن ارسال می‌شود.",
    expiresIn: OTP_TTL_MINUTES * 60,
    retryAfter: OTP_RESEND_SECONDS,
  });
}

async function requestPasswordReset(request, response) {
  try {
    const phone = normalizePhone(request.body?.phone);
    if (!phone) {
      return response.status(400).json({ ok: false, message: "شماره موبایل معتبر نیست." });
    }

    const userResult = await query(
      `SELECT id, is_active FROM users WHERE phone = $1 LIMIT 1`,
      [phone]
    );
    const user = userResult.rows[0];

    // پاسخ برای شماره ناشناخته یا حساب غیرفعال عمداً یکسان است.
    if (!user || !user.is_active) return genericRequestResponse(response);

    const recentResult = await query(
      `SELECT created_at FROM auth_otp_codes
       WHERE phone = $1 AND purpose = $2
       ORDER BY created_at DESC LIMIT 1`,
      [phone, RESET_PURPOSE]
    );
    const recent = recentResult.rows[0];
    if (recent) {
      const elapsedMs = Date.now() - new Date(recent.created_at).getTime();
      if (elapsedMs < OTP_RESEND_SECONDS * 1000) {
        // برای جلوگیری از شناسایی عضویت، پاسخ cooldown هم عمومی است.
        return genericRequestResponse(response);
      }
    }

    const code = generateOtpCode();
    const codeHash = hashOtpCode(code);
    const otpId = crypto.randomUUID();

    await query(
      `UPDATE auth_otp_codes SET consumed_at = NOW()
       WHERE phone = $1 AND purpose = $2 AND consumed_at IS NULL`,
      [phone, RESET_PURPOSE]
    );

    await query(
      `INSERT INTO auth_otp_codes
       (id, phone, code_hash, purpose, expires_at, attempts, max_attempts)
       VALUES ($1, $2, $3, $4, NOW() + ($5 * INTERVAL '1 minute'), 0, $6)`,
      [otpId, phone, codeHash, RESET_PURPOSE, OTP_TTL_MINUTES, OTP_MAX_ATTEMPTS]
    );

    try {
      await sendOtpSms(phone, code);
    } catch (smsError) {
      await query(
        `UPDATE auth_otp_codes SET consumed_at = NOW()
         WHERE id = $1 AND consumed_at IS NULL`,
        [otpId]
      );
      console.error("Password reset SMS delivery error:", smsError.status || smsError.message);
      // خطای سرویس پیامک به کاربر وضعیت عضویت شماره را لو نمی‌دهد.
    }

    return genericRequestResponse(response);
  } catch (error) {
    console.error("Password reset request error:", error);
    return response.status(500).json({ ok: false, message: "درخواست بازیابی رمز انجام نشد." });
  }
}

async function confirmPasswordReset(request, response) {
  try {
    const phone = normalizePhone(request.body?.phone);
    const code = String(request.body?.code || "").trim();
    const newPassword = request.body?.newPassword;

    if (!phone || !/^\d{6}$/.test(code)) {
      return response.status(400).json({ ok: false, message: "شماره موبایل یا کد بازیابی معتبر نیست." });
    }
    if (!validPassword(newPassword)) {
      return response.status(400).json({ ok: false, message: "رمز عبور جدید باید حداقل 8 کاراکتر و حداکثر 72 بایت باشد." });
    }

    const otpResult = await query(
      `SELECT id, code_hash, expires_at, attempts, max_attempts, consumed_at
       FROM auth_otp_codes
       WHERE phone = $1 AND purpose = $2
       ORDER BY created_at DESC LIMIT 1`,
      [phone, RESET_PURPOSE]
    );
    const otp = otpResult.rows[0];

    if (!otp || otp.consumed_at || new Date(otp.expires_at).getTime() <= Date.now()) {
      return response.status(401).json({
        ok: false,
        code: "RESET_OTP_INVALID_OR_EXPIRED",
        message: "کد بازیابی نامعتبر یا منقضی شده است.",
      });
    }
    if (otp.attempts >= otp.max_attempts) {
      return response.status(429).json({
        ok: false,
        code: "RESET_OTP_ATTEMPTS_EXCEEDED",
        message: "تعداد تلاش‌های مجاز برای این کد تمام شده است. کد جدید دریافت کنید.",
      });
    }

    if (!verifyOtpCode(otp.code_hash, code)) {
      await query(`UPDATE auth_otp_codes SET attempts = attempts + 1 WHERE id = $1`, [otp.id]);
      return response.status(401).json({ ok: false, code: "RESET_OTP_INVALID", message: "کد بازیابی صحیح نیست." });
    }

    const userResult = await query(
      `SELECT id, is_active FROM users WHERE phone = $1 LIMIT 1`,
      [phone]
    );
    const user = userResult.rows[0];
    if (!user || !user.is_active) {
      return response.status(401).json({ ok: false, message: "کد بازیابی نامعتبر یا منقضی شده است." });
    }

    // مصرف اتمیک کد، جلوی استفاده دوباره از همان OTP را می‌گیرد.
    const consumed = await query(
      `UPDATE auth_otp_codes SET consumed_at = NOW()
       WHERE id = $1 AND consumed_at IS NULL AND expires_at > NOW()
       RETURNING id`,
      [otp.id]
    );
    if (consumed.rowCount !== 1) {
      return response.status(401).json({ ok: false, message: "این کد بازیابی دیگر قابل استفاده نیست." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const updated = await query(
      `UPDATE users
       SET password_hash = $2, auth_version = auth_version + 1, updated_at = NOW()
       WHERE id = $1 AND is_active = TRUE
       RETURNING id`,
      [user.id, passwordHash]
    );
    if (updated.rowCount !== 1) {
      return response.status(401).json({ ok: false, message: "بازیابی رمز انجام نشد." });
    }

    return response.json({
      ok: true,
      message: "رمز عبور با موفقیت تغییر کرد. اکنون با رمز جدید وارد شوید.",
    });
  } catch (error) {
    console.error("Password reset confirm error:", error);
    return response.status(500).json({ ok: false, message: "بازیابی رمز انجام نشد." });
  }
}

module.exports = { requestPasswordReset, confirmPasswordReset };
