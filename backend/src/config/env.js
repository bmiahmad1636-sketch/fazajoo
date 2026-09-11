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

module.exports =
  env;