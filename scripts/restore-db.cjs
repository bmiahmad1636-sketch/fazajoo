const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const env = require("../backend/src/config/env");

function fail(message) {
  console.error(`\n[restore] ${message}\n`);
  process.exit(1);
}

const rawArgs = process.argv.slice(2);
const confirmed = rawArgs.includes("--yes");
const fileArg = rawArgs.find((arg) => arg !== "--yes");

if (!fileArg) {
  fail('Usage: npm run db:restore -- "backups\\fazajoo-....dump" --yes');
}

if (!confirmed) {
  fail("Restore can overwrite current database objects. Re-run with --yes only after verifying the backup and target database.");
}

if (!env.DB_NAME || !env.DB_USER || !env.DB_HOST || !env.DB_PORT) {
  fail("Database settings are incomplete. Check backend/.env.");
}

const inputPath = path.resolve(process.cwd(), fileArg);
if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
  fail(`Backup file not found: ${inputPath}`);
}

const args = [
  "--clean",
  "--if-exists",
  "--no-owner",
  "--no-privileges",
  "--exit-on-error",
  "--host", String(env.DB_HOST),
  "--port", String(env.DB_PORT),
  "--username", String(env.DB_USER),
  "--dbname", String(env.DB_NAME),
  inputPath,
];

console.log(`[restore] Target database: "${env.DB_NAME}"`);
console.log(`[restore] Source file: ${inputPath}`);
console.log("[restore] Starting restore...");

const result = spawnSync("pg_restore", args, {
  stdio: "inherit",
  env: {
    ...process.env,
    PGPASSWORD: env.DB_PASSWORD || "",
  },
  windowsHide: true,
});

if (result.error) {
  if (result.error.code === "ENOENT") {
    fail("pg_restore was not found. Install PostgreSQL client tools or add PostgreSQL bin to PATH.");
  }
  fail(result.error.message);
}

if (result.status !== 0) {
  fail(`pg_restore failed with exit code ${result.status}.`);
}

console.log("\n[restore] OK - database restore completed.\n");
