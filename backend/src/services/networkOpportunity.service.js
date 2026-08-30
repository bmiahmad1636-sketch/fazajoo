const { randomUUID } = require("crypto");
const { pool } = require("../db/pool");

let schemaReady = false;

async function ensureNetworkOpportunitySchema() {
  if (schemaReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agency_network_credits (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      free_remaining INTEGER NOT NULL DEFAULT 10 CHECK (free_remaining >= 0),
      paid_remaining INTEGER NOT NULL DEFAULT 0 CHECK (paid_remaining >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS agency_network_opportunities (
      request_space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      offer_space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      unlock_count INTEGER NOT NULL DEFAULT 0 CHECK (unlock_count BETWEEN 0 AND 3),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (request_space_id, offer_space_id),
      CHECK (request_space_id <> offer_space_id)
    );

    CREATE TABLE IF NOT EXISTS agency_network_unlocks (
      id UUID PRIMARY KEY,
      agent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      request_space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      offer_space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      credit_source VARCHAR(10) NOT NULL CHECK (credit_source IN ('free','paid')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (agent_user_id, request_space_id, offer_space_id)
    );

    CREATE INDEX IF NOT EXISTS idx_agency_network_unlocks_agent
      ON agency_network_unlocks(agent_user_id, created_at DESC);
  `);

  schemaReady = true;
}

async function assertApprovedAgent(client, userId) {
  const result = await client.query(
    `SELECT id, account_type, agency_status, is_active
     FROM users
     WHERE id=$1
     LIMIT 1`,
    [userId]
  );

  const user = result.rows[0];
  if (!user || !user.is_active || user.account_type !== "agent" || user.agency_status !== "approved") {
    const error = new Error("این بخش فقط برای مشاور تأییدشده فضاجو فعال است.");
    error.status = 403;
    throw error;
  }
}

async function ensureCreditRow(client, userId) {
  await client.query(
    `INSERT INTO agency_network_credits (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function getNetworkQuota(userId) {
  await ensureNetworkOpportunitySchema();
  const client = await pool.connect();

  try {
    await assertApprovedAgent(client, userId);
    await ensureCreditRow(client, userId);

    const quota = await client.query(
      `SELECT free_remaining, paid_remaining
       FROM agency_network_credits
       WHERE user_id=$1`,
      [userId]
    );

    const unlocked = await client.query(
      `SELECT request_space_id, offer_space_id, created_at
       FROM agency_network_unlocks
       WHERE agent_user_id=$1
       ORDER BY created_at DESC`,
      [userId]
    );

    const row = quota.rows[0];
    return {
      freeRemaining: Number(row.free_remaining || 0),
      paidRemaining: Number(row.paid_remaining || 0),
      totalRemaining: Number(row.free_remaining || 0) + Number(row.paid_remaining || 0),
      unlocked: unlocked.rows.map((item) => ({
        requestSpaceId: item.request_space_id,
        offerSpaceId: item.offer_space_id,
        createdAt: item.created_at,
      })),
    };
  } finally {
    client.release();
  }
}

async function unlockNetworkOpportunity(userId, requestSpaceId, offerSpaceId) {
  await ensureNetworkOpportunitySchema();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await assertApprovedAgent(client, userId);
    await ensureCreditRow(client, userId);

    const spaces = await client.query(
      `SELECT s.id, s.listing_type, s.status, s.owner_id, s.agency_network_consent,
              EXISTS (
                SELECT 1 FROM users u
                WHERE u.id = s.owner_id
                  AND u.is_active = TRUE
                  AND u.account_type = 'agent'
                  AND u.agency_status = 'approved'
              ) AS owner_is_approved_agent
       FROM spaces s
       WHERE s.id = ANY($1::uuid[])`,
      [[requestSpaceId, offerSpaceId]]
    );

    const requestSpace = spaces.rows.find((row) => row.id === requestSpaceId);
    const offerSpace = spaces.rows.find((row) => row.id === offerSpaceId);

    if (
      !requestSpace || !offerSpace ||
      requestSpace.listing_type !== "wanted" ||
      offerSpace.listing_type === "wanted" ||
      requestSpace.status !== "active" ||
      offerSpace.status !== "active"
    ) {
      const error = new Error("این فرصت شبکه دیگر فعال یا معتبر نیست.");
      error.status = 400;
      throw error;
    }

    if (!requestSpace.agency_network_consent || !offerSpace.agency_network_consent) {
      const error = new Error("صاحب آگهی یا متقاضی اجازه معرفی این فرصت به شبکه مشاوران را نداده است.");
      error.status = 403;
      throw error;
    }

    if (requestSpace.owner_id === userId || offerSpace.owner_id === userId) {
      const error = new Error("فرصت شبکه باید بین فایل‌ها و متقاضیان دیگر کاربران باشد.");
      error.status = 400;
      throw error;
    }

    if (requestSpace.owner_is_approved_agent || offerSpace.owner_is_approved_agent) {
      const error = new Error("این تطبیق متعلق به یک مشاور تأییدشده است و فرصت اختصاصی همان مشاور محسوب می‌شود.");
      error.status = 403;
      throw error;
    }

    const existing = await client.query(
      `SELECT credit_source
       FROM agency_network_unlocks
       WHERE agent_user_id=$1 AND request_space_id=$2 AND offer_space_id=$3
       LIMIT 1`,
      [userId, requestSpaceId, offerSpaceId]
    );

    if (existing.rowCount) {
      await client.query("COMMIT");
      return { alreadyUnlocked: true, creditSource: existing.rows[0].credit_source };
    }

    await client.query(
      `INSERT INTO agency_network_opportunities
        (request_space_id, offer_space_id, unlock_count)
       VALUES ($1,$2,0)
       ON CONFLICT (request_space_id, offer_space_id) DO NOTHING`,
      [requestSpaceId, offerSpaceId]
    );

    const opportunity = await client.query(
      `SELECT unlock_count
       FROM agency_network_opportunities
       WHERE request_space_id=$1 AND offer_space_id=$2
       FOR UPDATE`,
      [requestSpaceId, offerSpaceId]
    );

    if (Number(opportunity.rows[0]?.unlock_count || 0) >= 3) {
      const error = new Error("ظرفیت این فرصت تکمیل شده است.");
      error.status = 409;
      throw error;
    }

    const quota = await client.query(
      `SELECT free_remaining, paid_remaining
       FROM agency_network_credits
       WHERE user_id=$1
       FOR UPDATE`,
      [userId]
    );

    const credit = quota.rows[0];
    let source = null;

    if (Number(credit.free_remaining || 0) > 0) source = "free";
    else if (Number(credit.paid_remaining || 0) > 0) source = "paid";

    if (!source) {
      const error = new Error("سهمیه فرصت‌های شبکه شما تمام شده است.");
      error.status = 402;
      throw error;
    }

    await client.query(
      source === "free"
        ? `UPDATE agency_network_credits
           SET free_remaining=free_remaining-1, updated_at=NOW()
           WHERE user_id=$1`
        : `UPDATE agency_network_credits
           SET paid_remaining=paid_remaining-1, updated_at=NOW()
           WHERE user_id=$1`,
      [userId]
    );

    await client.query(
      `INSERT INTO agency_network_unlocks
        (id, agent_user_id, request_space_id, offer_space_id, credit_source)
       VALUES ($1,$2,$3,$4,$5)`,
      [randomUUID(), userId, requestSpaceId, offerSpaceId, source]
    );

    await client.query(
      `UPDATE agency_network_opportunities
       SET unlock_count=unlock_count+1, updated_at=NOW()
       WHERE request_space_id=$1 AND offer_space_id=$2`,
      [requestSpaceId, offerSpaceId]
    );

    await client.query("COMMIT");
    return { alreadyUnlocked: false, creditSource: source };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}


async function getApprovedAgentNetworkCredits() {
  await ensureNetworkOpportunitySchema();

  const result = await pool.query(`
    SELECT
      u.id AS user_id,
      COALESCE(c.free_remaining, 10) AS free_remaining,
      COALESCE(c.paid_remaining, 0) AS paid_remaining,
      COALESCE(x.unlock_count, 0) AS unlock_count
    FROM users u
    LEFT JOIN agency_network_credits c ON c.user_id = u.id
    LEFT JOIN (
      SELECT agent_user_id, COUNT(*)::int AS unlock_count
      FROM agency_network_unlocks
      GROUP BY agent_user_id
    ) x ON x.agent_user_id = u.id
    WHERE u.account_type='agent'
      AND u.agency_status='approved'
      AND u.is_active=TRUE
    ORDER BY u.created_at DESC
  `);

  return result.rows.map((row) => ({
    userId: row.user_id,
    freeRemaining: Number(row.free_remaining || 0),
    paidRemaining: Number(row.paid_remaining || 0),
    totalRemaining: Number(row.free_remaining || 0) + Number(row.paid_remaining || 0),
    unlockCount: Number(row.unlock_count || 0),
  }));
}

async function grantPaidNetworkCredits(userId, amount) {
  await ensureNetworkOpportunitySchema();

  const parsedAmount = Number(amount);
  if (!Number.isInteger(parsedAmount) || parsedAmount < 1 || parsedAmount > 10000) {
    const error = new Error("تعداد سهمیه باید عددی بین ۱ تا ۱۰۰۰۰ باشد.");
    error.status = 400;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertApprovedAgent(client, userId);
    await ensureCreditRow(client, userId);

    const result = await client.query(
      `UPDATE agency_network_credits
       SET paid_remaining=paid_remaining+$2, updated_at=NOW()
       WHERE user_id=$1
       RETURNING free_remaining, paid_remaining`,
      [userId, parsedAmount]
    );

    await client.query("COMMIT");
    const row = result.rows[0];
    return {
      freeRemaining: Number(row.free_remaining || 0),
      paidRemaining: Number(row.paid_remaining || 0),
      totalRemaining: Number(row.free_remaining || 0) + Number(row.paid_remaining || 0),
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getNetworkQuota,
  unlockNetworkOpportunity,
  getApprovedAgentNetworkCredits,
  grantPaidNetworkCredits,
};
