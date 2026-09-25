const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

async function run() {
  const sqlPath = path.join(
    __dirname,
    "../src/db/otp-migration.sql"
  );

  const sql = fs.readFileSync(
    sqlPath,
    "utf8"
  );

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(
      process.env.DB_PORT || 5432
    ),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl:
      process.env.DB_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : false,
  });

  try {
    console.log(
      "Connecting to PostgreSQL..."
    );

    await client.connect();

    console.log(
      "Running OTP migration..."
    );

    await client.query("BEGIN");

    await client.query(sql);

    await client.query("COMMIT");

    console.log(
      "OTP migration completed successfully."
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // اتصال ممکن است قبل از BEGIN قطع شده باشد.
    }

    console.error(
      "OTP migration failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

run();