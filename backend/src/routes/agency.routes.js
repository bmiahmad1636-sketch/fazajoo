const express = require("express");
const router = express.Router();

const { pool } = require("../db/pool");
const { requireAuth } = require("../middleware/auth.middleware");
const { getNetworkQuota, unlockNetworkOpportunity } = require("../services/networkOpportunity.service");

router.use(requireAuth);

// سهمیه فرصت‌های شبکه مشاور تأییدشده
router.get("/network/quota", async (req, res) => {
  try {
    const data = await getNetworkQuota(req.user.id);
    return res.json({ ok: true, ...data });
  } catch (error) {
    console.error("agency network quota error:", error);
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || "دریافت سهمیه فرصت‌های شبکه انجام نشد.",
    });
  }
});

// باز کردن یک فرصت شبکه؛ فقط این عملیات یک سهمیه مصرف می‌کند
router.post("/network/unlock", async (req, res) => {
  try {
    const requestSpaceId = clean(req.body?.requestSpaceId);
    const offerSpaceId = clean(req.body?.offerSpaceId);

    if (!requestSpaceId || !offerSpaceId) {
      return res.status(400).json({
        ok: false,
        message: "شناسه فایل و متقاضی برای دریافت فرصت لازم است.",
      });
    }

    const result = await unlockNetworkOpportunity(
      req.user.id,
      requestSpaceId,
      offerSpaceId
    );

    const quota = await getNetworkQuota(req.user.id);

    return res.json({
      ok: true,
      ...result,
      quota,
    });
  } catch (error) {
    console.error("agency network unlock error:", error);
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || "دریافت فرصت شبکه انجام نشد.",
    });
  }
});


function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function pickDocument(documents, keys) {
  if (!documents) return null;

  let found = null;

  if (Array.isArray(documents)) {
    for (const item of documents) {
      if (!item) continue;
      const type = String(item.type || item.name || item.key || "").toLowerCase();
      if (keys.some((key) => type.includes(key.toLowerCase()))) {
        found = item;
        break;
      }
    }
  } else if (typeof documents === "object") {
    for (const key of keys) {
      if (documents[key]) {
        found = documents[key];
        break;
      }
    }
  }

  if (!found) return null;
  if (typeof found === "string") return found.trim() || null;

  if (typeof found === "object") {
    const safeRecord = {
      key: found.key || "",
      url: found.url || found.path || found.value || found.secure_url || "",
      originalFilename: found.originalFilename || found.originalName || "",
      mimeType: found.mimeType || found.mimetype || "",
    };

    if (!safeRecord.key && !safeRecord.url) return null;
    return JSON.stringify(safeRecord);
  }

  return null;
}

// وضعیت احراز مشاور برای حساب لاگین‌شده
router.get("/status", async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT id, phone, account_type, system_role, agency_status
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.user.id]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "حساب کاربری پیدا نشد.",
      });
    }

    const requestResult = await pool.query(
      `SELECT id, agency_name, responsible_name, city, address,
              phone, license_number, status, rejection_reason,
              created_at, updated_at
       FROM agency_verification_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );

    return res.json({
      ok: true,
      agencyStatus: user.agency_status || "none",
      accountType: user.account_type || "user",
      systemRole: user.system_role || "user",
      request: requestResult.rows[0] || null,
    });
  } catch (error) {
    console.error("agency status error:", error);
    return res.status(500).json({
      ok: false,
      message: "دریافت وضعیت درخواست مشاور انجام نشد.",
    });
  }
});

// ثبت درخواست احراز مشاور املاک در PostgreSQL
router.post("/request", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      agencyName,
      agentName,
      responsibleName,
      city,
      address,
      phone,
      nationalId,
      nationalCode,
      licenseNumber,
      documents,
      nationalCardFront,
      nationalCardBack,
      businessLicense,
    } = req.body || {};

    const normalized = {
      agencyName: clean(agencyName),
      responsibleName: clean(responsibleName || agentName),
      city: clean(city),
      address: clean(address),
      phone: clean(req.user?.phone || phone),
      nationalCode: clean(nationalCode || nationalId),
      licenseNumber: clean(licenseNumber),
    };

    if (
      !normalized.agencyName ||
      !normalized.responsibleName ||
      !normalized.city ||
      !normalized.address ||
      !normalized.phone ||
      !normalized.nationalCode ||
      !normalized.licenseNumber
    ) {
      return res.status(400).json({
        ok: false,
        message: "اطلاعات ضروری درخواست احراز کامل نیست.",
      });
    }

    const frontDoc =
      clean(nationalCardFront) ||
      pickDocument(documents, [
        "nationalCardFront",
        "national_card_front",
        "cardFront",
        "front",
      ]);

    const backDoc =
      clean(nationalCardBack) ||
      pickDocument(documents, [
        "nationalCardBack",
        "national_card_back",
        "cardBack",
        "back",
      ]);

    const licenseDoc =
      clean(businessLicense) ||
      pickDocument(documents, [
        "businessLicense",
        "business_license",
        "license",
        "permit",
      ]);

    await client.query("BEGIN");

    // درخواست فقط برای همان حساب لاگین‌شده ثبت می‌شود.
    const userResult = await client.query(
      `SELECT id, phone, account_type, system_role, agency_status
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.user.id]
    );

    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        ok: false,
        message: "حساب کاربری پیدا نشد.",
      });
    }

    const user = userResult.rows[0];

    if (user.system_role === "admin") {
      await client.query("ROLLBACK");
      return res.status(403).json({
        ok: false,
        message: "حساب مدیر نمی‌تواند برای خودش درخواست مشاور املاک ثبت کند.",
      });
    }

    // شماره تماس درخواست از حساب احراز‌شده گرفته می‌شود، نه از ورودی قابل تغییر فرم.
    normalized.phone = user.phone;

    // اگر قبلاً درخواست ثبت شده، همان درخواست را به‌روز می‌کنیم تا رکورد تکراری نسازیم.
    const existingResult = await client.query(
      `SELECT id
       FROM agency_verification_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );

    let requestResult;

    if (existingResult.rowCount > 0) {
      requestResult = await client.query(
        `UPDATE agency_verification_requests
         SET agency_name = $1,
             responsible_name = $2,
             city = $3,
             phone = $4,
             address = $5,
             national_code = $6,
             license_number = $7,
             national_card_front = $8,
             national_card_back = $9,
             business_license = $10,
             status = 'pending',
             rejection_reason = NULL,
             updated_at = NOW()
         WHERE id = $11
         RETURNING *`,
        [
          normalized.agencyName,
          normalized.responsibleName,
          normalized.city,
          normalized.phone,
          normalized.address,
          normalized.nationalCode,
          normalized.licenseNumber,
          frontDoc,
          backDoc,
          licenseDoc,
          existingResult.rows[0].id,
        ]
      );
    } else {
      requestResult = await client.query(
        `INSERT INTO agency_verification_requests (
           user_id,
           agency_name,
           responsible_name,
           city,
           phone,
           address,
           national_code,
           license_number,
           national_card_front,
           national_card_back,
           business_license,
           status
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')
         RETURNING *`,
        [
          user.id,
          normalized.agencyName,
          normalized.responsibleName,
          normalized.city,
          normalized.phone,
          normalized.address,
          normalized.nationalCode,
          normalized.licenseNumber,
          frontDoc,
          backDoc,
          licenseDoc,
        ]
      );
    }

    await client.query(
      `UPDATE users
       SET agency_status = 'pending',
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      ok: true,
      message: "درخواست احراز مشاور با موفقیت ثبت شد و در انتظار بررسی مدیریت فضاجو است.",
      request: requestResult.rows[0],
      agencyStatus: "pending",
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("agency request rollback error:", rollbackError);
    }

    console.error("agency request error:", error);

    return res.status(500).json({
      ok: false,
      message: "خطای داخلی سرور هنگام ثبت درخواست احراز مشاور.",
    });
  } finally {
    client.release();
  }
});

module.exports = router;
