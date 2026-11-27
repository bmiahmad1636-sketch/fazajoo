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
  String(env.DB_NAME),
];

console.log(`[backup] Creating PostgreSQL backup for database "${env.DB_NAME}"...`);

// Let Node open the Unicode Windows path. pg_dump writes its binary
// custom-format archive to the inherited file handle, not a path argument.
let result;
let outputFd;
let created = false;
try {
  outputFd = fs.openSync(outputPath, "wx");
  created = true;
  result = spawnSync("pg_dump", args, {
    stdio: ["ignore", outputFd, "inherit"],
    env: {
      ...process.env,
      PGPASSWORD: env.DB_PASSWORD || "",
    },
    windowsHide: true,
  });
} catch (error) {
  result = { error };
} finally {
  if (outputFd !== undefined) fs.closeSync(outputFd);
}

function removeFailedArchive() {
  if (created) {
    try { fs.rmSync(outputPath, { force: true }); } catch {}
  }
}

if (result.error) {
  removeFailedArchive();
  if (result.error.code === "ENOENT") {
    fail("pg_dump was not found. Install PostgreSQL client tools or add PostgreSQL bin to PATH.");
  }
  fail(result.error.message);
}

if (result.status !== 0) {
  removeFailedArchive();
  fail(`pg_dump failed with exit code ${result.status}.`);
}

if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
  removeFailedArchive();
  fail("Backup file was not created correctly.");
}

// Check the archive table of contents without passing a Unicode path.
// This is a structural check, not a full restore test.
let archiveFd;
let check;
try {
  archiveFd = fs.openSync(outputPath, "r");
  check = spawnSync("pg_restore", ["--list"], {
    stdio: [archiveFd, "ignore", "inherit"],
    windowsHide: true,
  });
} catch (error) {
  check = { error };
} finally {
  if (archiveFd !== undefined) fs.closeSync(archiveFd);
}
if (check.error || check.status !== 0) {
  removeFailedArchive();
  fail("Archive verification failed (pg_restore --list). Check PostgreSQL client tools.");
}
console.log("[backup] Archive table of contents verified.");

const sizeMb = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`\n[backup] OK`);
console.log(`[backup] File: ${outputPath}`);
console.log(`[backup] Size: ${sizeMb} MB\n`);
