const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(
    __dirname,
    "../../.env"
  ),
});

function parseNumber(
  value,
  fallback
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function parseBoolean(
  value,
  fallback = false
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  return String(value)
    .trim()
    .toLowerCase() === "true";
}

/*
|--------------------------------------------------------------------------
| Trust Proxy
|--------------------------------------------------------------------------
|
| حالت پیش‌فرض false است.
| یعنی در محیط توسعه یا زمانی که Backend مستقیماً در دسترس است،
| به X-Forwarded-For اعتماد نمی‌کنیم.
|
| در Production، اگر Backend فقط پشت یک Reverse Proxy مطمئن
| مثل Nginx قرار داشته باشد، می‌توان در .env نوشت:
|
| TRUST_PROXY=1
|
| عدد 1 یعنی فقط یک Proxy قابل اعتماد بین کاربر و Express وجود دارد.
|
*/

function parseTrustProxy(
  value
) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return false;
  }

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "off" ||
    normalized === "no"
  ) {
    return false;
  }

  if (
    normalized === "true"
  ) {
    return true;
  }

  const numericValue =
    Number(normalized);

  if (
    Number.isInteger(
      numericValue
    ) &&
    numericValue >= 0
  ) {
    return numericValue;
  }

  /*
   * امکان استفاده از subnetهای معتبر Express:
   *
   * TRUST_PROXY=loopback
   *
   * یا:
   *
   * TRUST_PROXY=loopback,linklocal,uniquelocal
   */
  const values =
    String(value)
      .split(",")
      .map(
        (item) =>
          item.trim()
      )
      .filter(Boolean);

  return values.length
    ? values
    : false;
}

const env = {
  NODE_ENV:
    process.env.NODE_ENV ||
    "development",

  HOST:
    process.env.HOST ||
    "127.0.0.1",

  PORT:
    parseNumber(
      process.env.PORT,
      6060
    ),

  /*
  |--------------------------------------------------------------------------
  | Reverse Proxy
  |--------------------------------------------------------------------------
  */

  TRUST_PROXY:
    parseTrustProxy(
      process.env.TRUST_PROXY
    ),

  /*
  |--------------------------------------------------------------------------
  | CORS
  |--------------------------------------------------------------------------
  */

  CORS_ORIGINS:
    (
      process.env.CORS_ORIGINS ||
      [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
      ].join(",")
    )
      .split(",")
      .map(
        (item) =>
          item.trim()
      )
      .filter(Boolean),

  /*
  |--------------------------------------------------------------------------
  | PostgreSQL
  |--------------------------------------------------------------------------
  */

  DB_HOST:
    process.env.DB_HOST ||
    "127.0.0.1",

  DB_PORT:
    parseNumber(
      process.env.DB_PORT,
      5432
    ),

  DB_NAME:
    process.env.DB_NAME ||
    "fazajoo",

  DB_USER:
    process.env.DB_USER ||
    "postgres",

  DB_PASSWORD:
    process.env.DB_PASSWORD ||
    "",

  DB_SSL:
    parseBoolean(
      process.env.DB_SSL,
      false
    ),

  /*
  |--------------------------------------------------------------------------
  | Authentication
  |--------------------------------------------------------------------------
  */

  JWT_SECRET:
    process.env.JWT_SECRET ||
    "",

  JWT_EXPIRES_IN:
    process.env.JWT_EXPIRES_IN ||
    "7d",

  /*
  |--------------------------------------------------------------------------
  | Object Storage
  |--------------------------------------------------------------------------
  */

  STORAGE_ENDPOINT:
    process.env.STORAGE_ENDPOINT ||
    "",

  STORAGE_REGION:
    process.env.STORAGE_REGION ||
    "us-east-1",

  STORAGE_BUCKET:
    process.env.STORAGE_BUCKET ||
    "",

  STORAGE_ACCESS_KEY:
    process.env.STORAGE_ACCESS_KEY ||
    "",

  STORAGE_SECRET_KEY:
    process.env.STORAGE_SECRET_KEY ||
    "",

  STORAGE_PUBLIC_BASE_URL:
    process.env.STORAGE_PUBLIC_BASE_URL ||
    "",

  STORAGE_FORCE_PATH_STYLE:
    parseBoolean(
      process.env.STORAGE_FORCE_PATH_STYLE,
      false
    ),
};


/*
|--------------------------------------------------------------------------
| Production startup validation (fail fast)
|--------------------------------------------------------------------------
|
| Development keeps its convenient local defaults. In production, however,
| the backend must not start with missing secrets, local CORS origins, or
| incomplete storage/database configuration.
|
*/
function validateProductionEnv(
  config
) {
  if (
    config.NODE_ENV !==
    "production"
  ) {
    return;
  }

  const errors = [];

  function requireText(
    key,
    value
  ) {
    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      errors.push(
        `${key} is required.`
      );
    }
  }

  requireText(
    "DB_HOST",
    config.DB_HOST
  );
  requireText(
    "DB_NAME",
    config.DB_NAME
  );
  requireText(
    "DB_USER",
    config.DB_USER
  );
  requireText(
    "DB_PASSWORD",
    config.DB_PASSWORD
  );

  requireText(
    "JWT_SECRET",
    config.JWT_SECRET
  );

  if (
    typeof config.JWT_SECRET ===
      "string" &&
    config.JWT_SECRET.length < 32
  ) {
    errors.push(
      "JWT_SECRET must be at least 32 characters."
    );
  }

  requireText(
    "STORAGE_ENDPOINT",
    config.STORAGE_ENDPOINT
  );
  requireText(
    "STORAGE_BUCKET",
    config.STORAGE_BUCKET
  );
  requireText(
    "STORAGE_ACCESS_KEY",
    config.STORAGE_ACCESS_KEY
  );
  requireText(
    "STORAGE_SECRET_KEY",
    config.STORAGE_SECRET_KEY
  );
  requireText(
    "STORAGE_PUBLIC_BASE_URL",
    config.STORAGE_PUBLIC_BASE_URL
  );

  if (
    !Array.isArray(
      config.CORS_ORIGINS
    ) ||
    config.CORS_ORIGINS.length === 0
  ) {
    errors.push(
      "CORS_ORIGINS must contain at least one production origin."
    );
  } else {
    for (
      const origin of
      config.CORS_ORIGINS
    ) {
      let parsedOrigin;

      try {
        parsedOrigin =
          new URL(
            origin
          );
      } catch {
        errors.push(
          `CORS_ORIGINS contains an invalid origin: ${origin}`
        );
        continue;
      }

      const hostname =
        parsedOrigin.hostname
          .toLowerCase();

      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1"
      ) {
        errors.push(
          "CORS_ORIGINS must not contain localhost origins in production."
        );
      }
    }
  }

  for (
    const [key, value] of [
      [
        "STORAGE_ENDPOINT",
        config.STORAGE_ENDPOINT,
      ],
      [
        "STORAGE_PUBLIC_BASE_URL",
        config.STORAGE_PUBLIC_BASE_URL,
      ],
    ]
  ) {
    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      continue;
    }

    try {
      new URL(
        value
      );
    } catch {
      errors.push(
        `${key} must be a valid URL.`
      );
    }
  }

  if (
    errors.length > 0
  ) {
    const uniqueErrors =
      [
        ...new Set(
          errors
        ),
      ];

    throw new Error(
      [
        "Unsafe or incomplete production environment configuration:",
        ...uniqueErrors.map(
          (message) =>
            `- ${message}`
        ),
      ].join(
        "\n"
      )
    );
  }
}

validateProductionEnv(
  env
);

module.exports =
  env;