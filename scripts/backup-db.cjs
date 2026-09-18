const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const env = require("../backend/src/config/env");

function fail(message) {
  console.error(`\n[backup] ${message}\n`);
  process.exit(1);
}

if (!env.DB_NAME || !env.DB_USER || !env.DB_HOST || !env.DB_PORT) {
  fail("Database settings are incomplete. Check backend/.env.");
}

const backupDir = path.resolve(__dirname, "../backend/backups");
fs.mkdirSync(backupDir, { recursive: true });

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, "-");
const safeDbName = String(env.DB_NAME).replace(/[^a-zA-Z0-9_-]/g, "_");
const outputPath = path.join(backupDir, `${safeDbName}-${stamp}.dump`);

const args = [
  "--format=custom",
  "--no-owner",
  "--no-privileges",
  "--host", String(env.DB_HOST),
  "--port", String(env.DB_PORT),
  "--username", String(env.DB_USER),
  "--file", outputPath,
  String(env.DB_NAME),
];

console.log(`[backup] Creating PostgreSQL backup for database "${env.DB_NAME}"...`);

const result = spawnSync("pg_dump", args, {
  stdio: "inherit",
  env: {
    ...process.env,
    PGPASSWORD: env.DB_PASSWORD || "",
  },
  windowsHide: true,
});

if (result.error) {
  try { fs.rmSync(outputPath, { force: true }); } catch {}
  if (result.error.code === "ENOENT") {
    fail("pg_dump was not found. Install PostgreSQL client tools or add PostgreSQL bin to PATH.");
  }
  fail(result.error.message);
}

if (result.status !== 0) {
  try { fs.rmSync(outputPath, { force: true }); } catch {}
  fail(`pg_dump failed with exit code ${result.status}.`);
}

if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
  try { fs.rmSync(outputPath, { force: true }); } catch {}
  fail("Backup file was not created correctly.");
}

const sizeMb = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`\n[backup] OK`);
console.log(`[backup] File: ${outputPath}`);
console.log(`[backup] Size: ${sizeMb} MB\n`);
