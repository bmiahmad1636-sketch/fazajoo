const { query, pool } = require('../db/pool');

const KEYS = ['smart', 'moderation', 'smartRetention', 'moderationRetention'];
const days = (v, fallback) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 3650 ? n : fallback; };
function defaults() {
  return { smart: days(process.env.NOTICE_SMART_ARCHIVE_DAYS, 30), moderation: days(process.env.NOTICE_MODERATION_ARCHIVE_DAYS, 90), smartRetention: 90, moderationRetention: 365 };
}
function invalid(message, status = 400) { const e = new Error(message); e.status = status; return e; }
function validate(body) {
  if (!body || !KEYS.every(k => Number.isSafeInteger(body[k]) && body[k] >= 1 && body[k] <= 3650) || !Number.isSafeInteger(body.version) || body.version < 1) throw invalid('مدت‌ها باید عدد صحیح بین ۱ تا ۳۶۵۰ روز باشند.');
  return Object.fromEntries(KEYS.map(k => [k, body[k]]));
}
let schemaPromise;
async function ensurePolicy() {
  if (!schemaPromise) schemaPromise = (async () => {
    await query(`CREATE TABLE IF NOT EXISTS notification_policy_nt03 (
      id INTEGER PRIMARY KEY CHECK (id=1), smart INTEGER NOT NULL CHECK (smart BETWEEN 1 AND 3650), moderation INTEGER NOT NULL CHECK (moderation BETWEEN 1 AND 3650),
      smart_retention INTEGER NOT NULL CHECK (smart_retention BETWEEN 1 AND 3650), moderation_retention INTEGER NOT NULL CHECK (moderation_retention BETWEEN 1 AND 3650),
      version INTEGER NOT NULL DEFAULT 1, rollout_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`CREATE TABLE IF NOT EXISTS notification_policy_audit_nt03 (
      id BIGSERIAL PRIMARY KEY, actor_id UUID REFERENCES users(id) ON DELETE SET NULL, old_policy JSONB NOT NULL, new_policy JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    const d = defaults();
    await query(`INSERT INTO notification_policy_nt03(id,smart,moderation,smart_retention,moderation_retention) VALUES(1,$1,$2,$3,$4) ON CONFLICT(id) DO NOTHING`, KEYS.map(k=>d[k]));
  })().catch(e => { schemaPromise = null; throw e; });
  return schemaPromise;
}
function map(row) { return { smart: row.smart, moderation: row.moderation, smartRetention: row.smart_retention, moderationRetention: row.moderation_retention, version: row.version, rolloutAt: row.rollout_at, updatedAt: row.updated_at }; }
async function getPolicy() { await ensurePolicy(); const r = await query('SELECT * FROM notification_policy_nt03 WHERE id=1'); return map(r.rows[0]); }
async function savePolicy(actor, body) {
  const next = validate(body);
  await ensurePolicy();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const old = map((await client.query('SELECT * FROM notification_policy_nt03 WHERE id=1 FOR UPDATE')).rows[0]);
    if (old.version !== body.version) throw invalid('تنظیمات تغییر کرده‌اند؛ دوباره بارگذاری کنید.', 409);
    if (KEYS.every(k=>old[k]===next[k])) { await client.query('COMMIT'); return old; }
    const updated = map((await client.query(`UPDATE notification_policy_nt03 SET smart=$1, moderation=$2, smart_retention=$3, moderation_retention=$4, version=version+1, updated_at=NOW() WHERE id=1 RETURNING *`,KEYS.map(k=>next[k]))).rows[0]);
    await client.query('INSERT INTO notification_policy_audit_nt03(actor_id,old_policy,new_policy) VALUES($1,$2::jsonb,$3::jsonb)',[actor,JSON.stringify(old),JSON.stringify(updated)]);
    await client.query('COMMIT'); return updated;
  } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}
async function audit() { await ensurePolicy(); return (await query('SELECT id,old_policy,new_policy,created_at FROM notification_policy_audit_nt03 ORDER BY id DESC LIMIT 20')).rows; }
// SQL fragment only accepts internal constant identifiers. Archive duration starts at actual manual archive or the later of scheduled archive/read/rollout dates.
function lifecycle(kind, alias='n', p='p') {
  if (!['smart','moderation'].includes(kind) || alias!=='n' || p!=='p') throw Error('Invalid internal lifecycle identifier');
  const read = kind==='smart' ? 'n.is_read' : 'n.read_at IS NOT NULL';
  const readAt = kind==='smart' ? 'n.nt03_read_at' : 'n.read_at';
  const archived = `(${read} AND COALESCE(n.archive_override, n.created_at <= NOW() - (p.${kind} * INTERVAL '1 day')))`;
  const start = `GREATEST(p.rollout_at, COALESCE(${readAt},p.rollout_at), CASE WHEN n.archive_override IS TRUE THEN COALESCE(n.nt03_archived_at,p.rollout_at) ELSE n.created_at + (p.${kind} * INTERVAL '1 day') END)`;
  const expires = `(${start} + (p.${kind}_retention * INTERVAL '1 day'))`;
  return { archived, expires, expired: `(${archived} AND ${expires} <= NOW())` };
}
module.exports={defaults,validate,getPolicy,savePolicy,audit,ensurePolicy,lifecycle};
