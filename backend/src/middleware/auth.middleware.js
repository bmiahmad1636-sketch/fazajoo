const {
  query,
} = require(
  "../db/pool"
);

const {
  verifyToken,
} = require(
  "../utils/token"
);

async function requireAuth(
  request,
  response,
  next
) {
  try {
    const authorization =
      request.headers
        .authorization ||
      "";

    const [
      type,
      token,
    ] =
      authorization.split(
        " "
      );

    if (
      type !== "Bearer" ||
      !token
    ) {
      return response
        .status(401)
        .json({
          ok: false,

          message:
            "برای ادامه باید وارد حساب شوید.",
        });
    }

    const payload =
      verifyToken(
        token
      );

    const result =
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
          WHERE id = $1
          LIMIT 1
        `,
        [
          payload.sub,
        ]
      );

    const user =
      result.rows[0];

    if (
      !user ||
      !user.is_active
    ) {
      return response
        .status(401)
        .json({
          ok: false,

          message:
            "حساب کاربری معتبر نیست.",
        });
    }

    const tokenAuthVersion =
      Number(
        payload.authVersion
      );

    const currentAuthVersion =
      Number(
        user.auth_version
      );

    if (
      !Number.isInteger(
        tokenAuthVersion
      ) ||
      tokenAuthVersion !==
        currentAuthVersion
    ) {
      return response
        .status(401)
        .json({
          ok: false,

          code:
            "SESSION_REVOKED",

          message:
            "نشست کاربری منقضی یا باطل شده است. لطفاً دوباره وارد شوید.",
        });
    }

    request.user =
      user;

    request.authToken =
      token;

    next();

  } catch (error) {
    console.error(
      "Authentication error:",
      error.message
    );

    return response
      .status(401)
      .json({
        ok: false,

        message:
          "نشست کاربری معتبر نیست یا منقضی شده است.",
      });
  }
}

function requireAdmin(
  request,
  response,
  next
) {
  if (
    request.user
      ?.system_role !==
    "admin"
  ) {
    return response
      .status(403)
      .json({
        ok: false,

        message:
          "دسترسی مدیر لازم است.",
      });
  }

  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};