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

    request.user =
      user;

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