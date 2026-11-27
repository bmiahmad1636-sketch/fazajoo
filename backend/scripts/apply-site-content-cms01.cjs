'use strict';
const fs = require('node:fs');
const path = require('node:path');
const env = require('../src/config/env');
const { pool } = require('../src/db/pool');
(async () => {
  if (env.NODE_ENV === 'production' || !['localhost','127.0.0.1','::1'].includes(String(env.DB_HOST).toLowerCase())) {
    console.error('CMS01 migration refused: local development database required.');
    process.exitCode = 1; return;
  }
  const sql = fs.readFileSync(path.join(__dirname, '../src/db/site-content-cms01.sql'), 'utf8');
  await pool.query(sql);
  const result = await pool.query('SELECT version FROM site_content_cms01 WHERE id=1');
  if (result.rowCount !== 1) throw new Error('CMS01 row missing');
  console.log('CMS01 DATABASE MIGRATION VERIFIED');
})().catch(error => { console.error('CMS01 migration failed:', error.code || 'MIGRATION_FAILED'); process.exitCode = 1; }).finally(() => pool.end());
