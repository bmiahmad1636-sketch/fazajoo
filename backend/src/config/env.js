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
    .toLowerCase() === "true";
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

  JWT_SECRET:
    process.env.JWT_SECRET ||
    "",

  JWT_EXPIRES_IN:
    process.env.JWT_EXPIRES_IN ||
    "7d",
};

module.exports =
  env;