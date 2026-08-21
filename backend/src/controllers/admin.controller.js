const {
  query,
} = require("../db/pool");

function safeAdminUser(user) {
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

async function listUsers(
  request,
  response
) {
  try {
    const result =
      await query(`
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
        ORDER BY created_at DESC
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
          "دریافت کاربران انجام نشد.",
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

    const result =
      await query(
        `
          UPDATE users
          SET
            account_type = 'agent',
            agency_status = 'approved'
          WHERE id = $1
          RETURNING
            id,
            phone,
            full_name,
            account_type,
            system_role,
            agency_status,
            is_active,
            created_at
        `,
        [id]
      );

    if (
      result.rowCount === 0
    ) {
      return response
        .status(404)
        .json({
          ok: false,
          message:
            "کاربر پیدا نشد.",
        });
    }

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

    const result =
      await query(
        `
          UPDATE users
          SET
            account_type = 'user',
            agency_status = 'rejected'
          WHERE id = $1
          RETURNING
            id,
            phone,
            full_name,
            account_type,
            system_role,
            agency_status,
            is_active,
            created_at
        `,
        [id]
      );

    if (
      result.rowCount === 0
    ) {
      return response
        .status(404)
        .json({
          ok: false,
          message:
            "کاربر پیدا نشد.",
        });
    }

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
  listUsers,
  approveAgent,
  rejectAgent,
};
