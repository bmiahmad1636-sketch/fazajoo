const {
  query,
} = require("../db/pool");

const storage = require("../services/storage.service");

const DOCUMENT_COLUMNS = {
  nationalCardFront: "national_card_front",
  nationalCardBack: "national_card_back",
  businessLicense: "business_license",
};

function parseDocument(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // اگر فقط URL ذخیره شده باشد
  }

  return {
    url: String(value),
  };
}

function safeAdminUser(row) {
  const nationalCardFront =
    parseDocument(
      row.national_card_front
    );

  const nationalCardBack =
    parseDocument(
      row.national_card_back
    );

  const businessLicense =
    parseDocument(
      row.business_license
    );

  const hasAllDocuments =
    Boolean(
      nationalCardFront &&
      nationalCardBack &&
      businessLicense
    );

  return {
    id: row.id,
    phone: row.phone,
    fullName: row.full_name,
    accountType: row.account_type,
    systemRole: row.system_role,
    agencyStatus:
      row.request_status ||
      row.agency_status ||
      "none",
    isActive: row.is_active,
    createdAt: row.created_at,

    agencyRequestId:
      row.agency_request_id ||
      null,

    agencyName:
      row.agency_name ||
      "",

    agentName:
      row.responsible_name ||
      "",

    agencyCity:
      row.agency_city ||
      "",

    agencyAddress:
      row.agency_address ||
      "",

    agencyNationalId:
      row.national_code ||
      "",

    agencyLicenseNumber:
      row.license_number ||
      "",

    agencyRequestedAt:
      row.agency_requested_at ||
      null,

    agencyDocuments: {
      nationalCardFront,
      nationalCardBack,
      businessLicense,
    },

    agencyDocumentsStatus:
      hasAllDocuments
        ? "uploaded"
        : "incomplete",
  };
}

const ADMIN_USERS_SELECT = `
  u.id,
  u.phone,
  u.full_name,
  u.account_type,
  u.system_role,
  u.agency_status,
  u.is_active,
  u.created_at,

  avr.id AS agency_request_id,
  avr.agency_name,
  avr.responsible_name,
  avr.city AS agency_city,
  avr.address AS agency_address,
  avr.national_code,
  avr.license_number,
  avr.national_card_front,
  avr.national_card_back,
  avr.business_license,
  avr.status AS request_status,
  avr.created_at AS agency_requested_at
`;

async function listUsers(
  request,
  response
) {
  try {
    const result =
      await query(`
        SELECT
          ${ADMIN_USERS_SELECT}
        FROM users u
        LEFT JOIN LATERAL (
          SELECT *
          FROM agency_verification_requests
          WHERE user_id = u.id
          ORDER BY created_at DESC
          LIMIT 1
        ) avr ON TRUE
        ORDER BY
          CASE
            WHEN avr.status = 'pending'
              THEN 0
            ELSE 1
          END,
          COALESCE(
            avr.created_at,
            u.created_at
          ) DESC
      `);

    return response.json({
      ok: true,
      users:
        result.rows.map(
          safeAdminUser
        ),
    });
  } catch (error) {
    console.error(
      "Admin list users error:",
      error
    );

    return response
      .status(500)
      .json({
        ok: false,
        message:
          "دریافت اطلاعات کاربران انجام نشد.",
      });
  }
}

async function getAgencyDocument(
  request,
  response
) {
  try {
    const { id, documentType } = request.params;
    const column = DOCUMENT_COLUMNS[documentType];

    if (!column) {
      return response.status(400).json({
        ok: false,
        message: "نوع مدرک معتبر نیست.",
      });
    }

    const result = await query(
      `
        SELECT ${column} AS document_record
        FROM agency_verification_requests
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [id]
    );

    if (result.rowCount === 0 || !result.rows[0].document_record) {
      return response.status(404).json({
        ok: false,
        message: "مدرک موردنظر پیدا نشد.",
      });
    }

    const documentRecord = parseDocument(result.rows[0].document_record);
    const file = await storage.getAgencyDocument({
      documentRecord,
      userId: id,
    });

    const requestedDownload = request.query.download === "1";
    const extension = file.key.includes(".")
      ? file.key.slice(file.key.lastIndexOf("."))
      : "";
    const fallbackName = `${documentType}${extension}`;
    const originalName =
      documentRecord?.originalFilename || fallbackName;
    const encodedFilename = encodeURIComponent(String(originalName));

    response.setHeader("Content-Type", file.contentType);
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("X-Content-Type-Options", "nosniff");

    if (file.contentLength !== undefined) {
      response.setHeader("Content-Length", String(file.contentLength));
    }

    response.setHeader(
      "Content-Disposition",
      `${requestedDownload ? "attachment" : "inline"}; filename="${fallbackName}"; filename*=UTF-8''${encodedFilename}`
    );

    if (!file.body || typeof file.body.pipe !== "function") {
      throw new Error("Storage response body is not streamable.");
    }

    file.body.on("error", (streamError) => {
      console.error("Admin document stream error:", streamError);
      if (!response.headersSent) {
        response.status(500).end();
      } else {
        response.destroy(streamError);
      }
    });

    return file.body.pipe(response);
  } catch (error) {
    console.error("Admin get agency document error:", error);

    if (response.headersSent) {
      return response.end();
    }

    const status =
      error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404
        ? 404
        : 500;

    return response.status(status).json({
      ok: false,
      message:
        status === 404
          ? "فایل مدرک در فضای ذخیره‌سازی پیدا نشد."
          : "دریافت امن مدرک انجام نشد.",
    });
  }
}

async function approveAgent(
  request,
  response
) {
  try {
    const {
      id,
    } = request.params;

    const userResult =
      await query(
        `
          UPDATE users
          SET
            account_type = 'agent',
            agency_status = 'approved',
            updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `,
        [id]
      );

    if (
      userResult.rowCount === 0
    ) {
      return response
        .status(404)
        .json({
          ok: false,
          message:
            "کاربر پیدا نشد.",
        });
    }

    await query(
      `
        UPDATE agency_verification_requests
        SET
          status = 'approved',
          updated_at = NOW()
        WHERE id = (
          SELECT id
          FROM agency_verification_requests
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        )
      `,
      [id]
    );

    const result =
      await query(
        `
          SELECT
            ${ADMIN_USERS_SELECT}
          FROM users u
          LEFT JOIN LATERAL (
            SELECT *
            FROM agency_verification_requests
            WHERE user_id = u.id
            ORDER BY created_at DESC
            LIMIT 1
          ) avr ON TRUE
          WHERE u.id = $1
        `,
        [id]
      );

    return response.json({
      ok: true,
      message:
        "مشاور با موفقیت تأیید شد.",
      user:
        safeAdminUser(
          result.rows[0]
        ),
    });
  } catch (error) {
    console.error(
      "Admin approve agent error:",
      error
    );

    return response
      .status(500)
      .json({
        ok: false,
        message:
          "تأیید مشاور انجام نشد.",
      });
  }
}

async function rejectAgent(
  request,
  response
) {
  try {
    const {
      id,
    } = request.params;

    const userResult =
      await query(
        `
          UPDATE users
          SET
            account_type = 'user',
            agency_status = 'rejected',
            updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `,
        [id]
      );

    if (
      userResult.rowCount === 0
    ) {
      return response
        .status(404)
        .json({
          ok: false,
          message:
            "کاربر پیدا نشد.",
        });
    }

    await query(
      `
        UPDATE agency_verification_requests
        SET
          status = 'rejected',
          updated_at = NOW()
        WHERE id = (
          SELECT id
          FROM agency_verification_requests
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        )
      `,
      [id]
    );

    const result =
      await query(
        `
          SELECT
            ${ADMIN_USERS_SELECT}
          FROM users u
          LEFT JOIN LATERAL (
            SELECT *
            FROM agency_verification_requests
            WHERE user_id = u.id
            ORDER BY created_at DESC
            LIMIT 1
          ) avr ON TRUE
          WHERE u.id = $1
        `,
        [id]
      );

    return response.json({
      ok: true,
      message:
        "درخواست مشاور رد شد.",
      user:
        safeAdminUser(
          result.rows[0]
        ),
    });
  } catch (error) {
    console.error(
      "Admin reject agent error:",
      error
    );

    return response
      .status(500)
      .json({
        ok: false,
        message:
          "رد درخواست انجام نشد.",
      });
  }
}

module.exports = {
  getAgencyDocument,
  listUsers,
  approveAgent,
  rejectAgent,
};
