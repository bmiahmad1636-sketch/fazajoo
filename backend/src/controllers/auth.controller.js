const crypto =
  require(
    "crypto"
  );

const bcrypt =
  require(
    "bcryptjs"
  );

const {
  query,
} = require(
  "../db/pool"
);

const {
  createToken,
} = require(
  "../utils/token"
);


function normalizePhone(
  value = ""
) {
  let phone =
    String(value)
      .trim()
      .replace(
        /\D/g,
        ""
      );

  if (
    phone.startsWith(
      "0098"
    )
  ) {
    phone =
      `0${phone.slice(4)}`;
  }

  if (
    phone.startsWith(
      "98"
    ) &&
    phone.length === 12
  ) {
    phone =
      `0${phone.slice(2)}`;
  }

  if (
    phone.startsWith(
      "9"
    ) &&
    phone.length === 10
  ) {
    phone =
      `0${phone}`;
  }

  if (
    !/^09\d{9}$/.test(
      phone
    )
  ) {
    return "";
  }

  return phone;
}


function validatePassword(
  password
) {
  if (
    typeof password !==
    "string"
  ) {
    return false;
  }

  const length =
    Buffer.byteLength(
      password,
      "utf8"
    );

  return (
    length >= 8 &&
    length <= 72
  );
}


function safeUser(
  user
) {
  return {
    id:
      user.id,

    phone:
      user.phone,

    fullName:
      user.full_name,

    accountType:
      user.account_type,

    systemRole:
      user.system_role,

    agencyStatus:
      user.agency_status,

    isActive:
      user.is_active,

    createdAt:
      user.created_at,
  };
}


async function register(
  request,
  response
) {
  try {
    const {
      phone,
      password,
      fullName,
    } =
      request.body || {};

    const normalizedPhone =
      normalizePhone(
        phone
      );

    if (
      !normalizedPhone
    ) {
      return response
        .status(400)
        .json({
          ok: false,

          message:
            "شماره موبایل معتبر نیست.",
        });
    }

    if (
      !validatePassword(
        password
      )
    ) {
      return response
        .status(400)
        .json({
          ok: false,

          message:
            "رمز عبور باید حداقل 8 کاراکتر و حداکثر 72 بایت باشد.",
        });
    }

    const cleanName =
      String(
        fullName ||
        ""
      )
        .trim()
        .slice(
          0,
          120
        );

    const existing =
      await query(
        `
          SELECT id
          FROM users
          WHERE phone = $1
          LIMIT 1
        `,
        [
          normalizedPhone,
        ]
      );

    if (
      existing.rowCount > 0
    ) {
      return response
        .status(409)
        .json({
          ok: false,

          message:
            "این شماره موبایل قبلاً ثبت شده است.",
        });
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    const userId =
      crypto.randomUUID();

    const result =
      await query(
        `
          INSERT INTO users (
            id,
            phone,
            password_hash,
            full_name,
            account_type,
            system_role,
            agency_status,
            is_active,
            auth_version
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            'user',
            'user',
            'none',
            TRUE,
            1
          )
          RETURNING
            id,
            phone,
            full_name,
            account_type,
            system_role,
            agency_status,
            is_active,
            auth_version,
            created_at
        `,
        [
          userId,
          normalizedPhone,
          passwordHash,
          cleanName ||
            null,
        ]
      );

    const user =
      result.rows[0];

    const token =
      createToken(
        user
      );

    return response
      .status(201)
      .json({
        ok: true,

        message:
          "حساب کاربری فضاجو ساخته شد.",

        token,

        user:
          safeUser(
            user
          ),
      });

  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    if (
      error.code ===
      "23505"
    ) {
      return response
        .status(409)
        .json({
          ok: false,

          message:
            "این شماره موبایل قبلاً ثبت شده است.",
        });
    }

    return response
      .status(500)
      .json({
        ok: false,

        message:
          "ساخت حساب انجام نشد.",
      });
  }
}


async function login(
  request,
  response
) {
  try {
    const {
      phone,
      password,
    } =
      request.body || {};

    const normalizedPhone =
      normalizePhone(
        phone
      );

    if (
      !normalizedPhone ||
      typeof password !==
        "string"
    ) {
      return response
        .status(400)
        .json({
          ok: false,

          message:
            "شماره موبایل یا رمز عبور معتبر نیست.",
        });
    }

    const result =
      await query(
        `
          SELECT
            id,
            phone,
            password_hash,
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
        [
          normalizedPhone,
        ]
      );

    const user =
      result.rows[0];

    if (!user) {
      return response
        .status(401)
        .json({
          ok: false,

          message:
            "شماره موبایل یا رمز عبور اشتباه است.",
        });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!passwordMatches) {
      return response
        .status(401)
        .json({
          ok: false,

          message:
            "شماره موبایل یا رمز عبور اشتباه است.",
        });
    }

    if (!user.is_active) {
      try {
        const suspension =
          await query(
            `
              SELECT
                l.action
              FROM legal_audit_log l
              WHERE l.target_type = 'user'
                AND l.target_id = $1
                AND l.action IN (
                  'user_suspend',
                  'user_restore'
                )
              ORDER BY l.created_at DESC
              LIMIT 1
            `,
            [
              user.id,
            ]
          );

        if (
          suspension.rows[0]
            ?.action ===
          "user_suspend"
        ) {
          return response
            .status(423)
            .json({
              ok: false,

              code:
                "JUDICIAL_SUSPENSION",

              message:
                "حساب شما به موجب دستور مقام قضایی تعلیق شده است. برای پیگیری، با پشتیبانی فضاجو تماس بگیرید.",
            });
        }
      } catch (
        legalError
      ) {
        console.warn(
          "Judicial suspension lookup unavailable:",
          legalError?.message ||
            legalError
        );
      }

      return response
        .status(401)
        .json({
          ok: false,

          message:
            "شماره موبایل یا رمز عبور اشتباه است.",
        });
    }

    const token =
      createToken(
        user
      );

    return response.json({
      ok: true,

      message:
        "ورود موفق بود.",

      token,

      user:
        safeUser(
          user
        ),
    });

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return response
      .status(500)
      .json({
        ok: false,

        message:
          "ورود به حساب انجام نشد.",
      });
  }
}


async function me(
  request,
  response
) {
  return response.json({
    ok: true,

    user:
      safeUser(
        request.user
      ),
  });
}


async function logout(
  request,
  response
) {
  try {
    const result =
      await query(
        `
          UPDATE users
          SET
            auth_version =
              auth_version + 1,
            updated_at =
              NOW()
          WHERE id = $1
          RETURNING
            auth_version
        `,
        [
          request.user.id,
        ]
      );

    if (
      result.rowCount !== 1
    ) {
      return response
        .status(401)
        .json({
          ok: false,

          message:
            "حساب کاربری معتبر نیست.",
        });
    }

    return response.json({
      ok: true,

      message:
        "خروج از حساب با موفقیت انجام شد.",
    });

  } catch (error) {
    console.error(
      "Logout error:",
      error
    );

    return response
      .status(500)
      .json({
        ok: false,

        message:
          "خروج امن از حساب انجام نشد.",
      });
  }
}


module.exports = {
  register,
  login,
  me,
  logout,
};