const crypto = require("crypto");
const { query } = require("../db/pool");

const CONTACT_WINDOW_MINUTES = 10;
const CONTACT_SUSPICIOUS_DISTINCT_TARGETS = 15;
const CONTACT_HIGH_DISTINCT_TARGETS = 25;

let schemaPromise = null;

function ensureSecurityMonitoringSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS security_contact_reveals (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
          ip_hash VARCHAR(64),
          user_agent VARCHAR(300),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_security_contact_reveals_user_created
        ON security_contact_reveals(user_id, created_at DESC)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_security_contact_reveals_user_space_created
        ON security_contact_reveals(user_id, space_id, created_at DESC)
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS security_alerts (
          id UUID PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          alert_type VARCHAR(80) NOT NULL,
          severity VARCHAR(20) NOT NULL DEFAULT 'medium',
          window_minutes INTEGER NOT NULL DEFAULT 10,
          event_count INTEGER NOT NULL DEFAULT 0,
          distinct_target_count INTEGER NOT NULL DEFAULT 0,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_security_alerts_created
        ON security_alerts(created_at DESC)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_security_alerts_user_type_created
        ON security_alerts(user_id, alert_type, created_at DESC)
      `);
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  return schemaPromise;
}

function hashIp(ip) {
  const value = String(ip || "").trim();
  if (!value) return null;
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cleanUserAgent(value) {
  return String(value || "").trim().slice(0, 300) || null;
}

async function recordContactReveal({ userId, spaceId, ip, userAgent }) {
  await ensureSecurityMonitoringSchema();

  await query(
    `
      INSERT INTO security_contact_reveals
        (id, user_id, space_id, ip_hash, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      crypto.randomUUID(),
      userId,
      spaceId,
      hashIp(ip),
      cleanUserAgent(userAgent),
    ]
  );

  const statsResult = await query(
    `
      SELECT
        COUNT(*)::int AS event_count,
        COUNT(DISTINCT space_id)::int AS distinct_target_count
      FROM security_contact_reveals
      WHERE user_id = $1
        AND created_at >= NOW() - ($2::text || ' minutes')::interval
    `,
    [userId, CONTACT_WINDOW_MINUTES]
  );

  const stats = statsResult.rows[0] || {};
  const eventCount = Number(stats.event_count || 0);
  const distinctTargetCount = Number(stats.distinct_target_count || 0);

  if (distinctTargetCount < CONTACT_SUSPICIOUS_DISTINCT_TARGETS) {
    return {
      suspicious: false,
      eventCount,
      distinctTargetCount,
    };
  }

  const severity =
    distinctTargetCount >= CONTACT_HIGH_DISTINCT_TARGETS ? "high" : "medium";

  const recentAlert = await query(
    `
      SELECT id
      FROM security_alerts
      WHERE user_id = $1
        AND alert_type = 'contact_harvesting_pattern'
        AND created_at >= NOW() - ($2::text || ' minutes')::interval
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId, CONTACT_WINDOW_MINUTES]
  );

  const metadata = {
    reason: "many_distinct_contact_reveals",
    threshold: CONTACT_SUSPICIOUS_DISTINCT_TARGETS,
  };

  if (recentAlert.rows[0]) {
    await query(
      `
        UPDATE security_alerts
        SET
          severity = $2,
          event_count = $3,
          distinct_target_count = $4,
          metadata = $5::jsonb,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        recentAlert.rows[0].id,
        severity,
        eventCount,
        distinctTargetCount,
        JSON.stringify(metadata),
      ]
    );
  } else {
    await query(
      `
        INSERT INTO security_alerts
          (id, user_id, alert_type, severity, window_minutes, event_count, distinct_target_count, metadata)
        VALUES ($1, $2, 'contact_harvesting_pattern', $3, $4, $5, $6, $7::jsonb)
      `,
      [
        crypto.randomUUID(),
        userId,
        severity,
        CONTACT_WINDOW_MINUTES,
        eventCount,
        distinctTargetCount,
        JSON.stringify(metadata),
      ]
    );
  }

  return {
    suspicious: true,
    severity,
    eventCount,
    distinctTargetCount,
  };
}

async function listSecurityAlerts({ limit = 100 } = {}) {
  await ensureSecurityMonitoringSchema();

  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 100));

  const result = await query(
    `
      SELECT
        a.id,
        a.user_id,
        a.alert_type,
        a.severity,
        a.window_minutes,
        a.event_count,
        a.distinct_target_count,
        a.metadata,
        a.created_at,
        a.updated_at,
        u.full_name AS user_full_name,
        u.phone AS user_phone,
        u.account_type,
        u.system_role
      FROM security_alerts a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.updated_at DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    alertType: row.alert_type,
    severity: row.severity,
    windowMinutes: Number(row.window_minutes || 0),
    eventCount: Number(row.event_count || 0),
    distinctTargetCount: Number(row.distinct_target_count || 0),
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user_id
      ? {
          id: row.user_id,
          fullName: row.user_full_name || "",
          phone: row.user_phone || "",
          accountType: row.account_type || "user",
          systemRole: row.system_role || "user",
        }
      : null,
  }));
}

module.exports = {
  ensureSecurityMonitoringSchema,
  recordContactReveal,
  listSecurityAlerts,
};
