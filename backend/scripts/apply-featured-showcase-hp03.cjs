"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { pool } = require("../src/db/pool");
(async () => {
  // Never print environment values, passwords, or connection strings.
  const sql = fs.readFileSync(path.join(__dirname,"../src/db/featured-showcase-hp03.sql"),"utf8");
  await pool.query(sql);
  console.log("HP03 FEATURED DATABASE MIGRATION VERIFIED");
})().catch(error => { console.error("HP03 migration failed:",error.code || error.message); process.exitCode=1; })
  .finally(() => pool.end());
