const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
});

const sqlPath = path.resolve(
  __dirname,
  "..",
  "src",
  "db",
  "otp-hash-varchar128-migration.sql"
);

async function main() {
  const connectionString = process.env.DATABASE_URL;

  const pool = connectionString
    ? new Pool({ connectionString })
    : new Pool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl:
          process.env.DB_SSL === "true"
            ? { rejectUnauthorized: false }
            : false,
      });

  try {
    const sql = fs.readFileSync(sqlPath, "utf8");
    await pool.query(sql);

    const result = await pool.query(`
      SELECT character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'auth_otp_codes'
        AND column_name = 'code_hash'
    `);

    const size = result.rows[0]?.character_maximum_length;

    if (size !== 128) {
      throw new Error(
        `Unexpected auth_otp_codes.code_hash size after migration: ${size}`
      );
    }

    console.log(
      `OTP code_hash column updated successfully. Current size: ${size}`
    );
  } catch (error) {
    console.error("OTP hash migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
