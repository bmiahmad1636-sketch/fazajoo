const crypto = require("crypto");
const { query } = require("../db/pool");

let schemaPromise = null;

function ensureTrustSafetySchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await query(`CREATE TABLE IF NOT EXISTS user_blocks (
        blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (blocker_id, blocked_id),
        CHECK (blocker_id <> blocked_id)
      )`);

      await query(`CREATE TABLE IF NOT EXISTS abuse_reports (
        id UUID PRIMARY KEY,
        reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_type VARCHAR(20) NOT NULL,
        target_id UUID NOT NULL,
        reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        reason VARCHAR(40) NOT NULL,
        details VARCHAR(1000),
        status VARCHAR(20) NOT NULL DEFAULT 'new',
        resolution_note VARCHAR(1000),
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);

      // اگر جدول از نسخه قبلی وجود داشته باشد، ستون‌های لازم بدون حذف داده‌ها تکمیل می‌شوند.
      await query(`ALTER TABLE abuse_reports ADD COLUMN IF NOT EXISTS resolution_note VARCHAR(1000)`);
      await query(`ALTER TABLE abuse_reports ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL`);
      await query(`ALTER TABLE abuse_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`);
      await query(`ALTER TABLE abuse_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

      // قیدهای قدیمی status می‌توانند مقدار reviewing را نپذیرند؛ این بخش آن‌ها را
      // به نسخه فعلی و سازگار تبدیل می‌کند، بدون اینکه گزارشی حذف شود.
      await query(`
        DO $$
        DECLARE c RECORD;
        BEGIN
          FOR c IN
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'abuse_reports'::regclass
              AND contype = 'c'
              AND pg_get_constraintdef(oid) ILIKE '%status%'
          LOOP
            EXECUTE format('ALTER TABLE abuse_reports DROP CONSTRAINT %I', c.conname);
          END LOOP;
        END $$;
      `);

      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid='abuse_reports'::regclass
              AND conname='abuse_reports_status_check'
          ) THEN
            ALTER TABLE abuse_reports
            ADD CONSTRAINT abuse_reports_status_check
            CHECK (status IN ('new','reviewing','resolved','dismissed'));
          END IF;
        END $$;
      `);

      await query(`CREATE INDEX IF NOT EXISTS idx_abuse_reports_status_created ON abuse_reports(status, created_at DESC)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_abuse_reports_reporter ON abuse_reports(reporter_id, created_at DESC)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id)`);
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function isEitherUserBlocked(userA, userB) {
  await ensureTrustSafetySchema();
  if (!userA || !userB || userA === userB) return false;
  const result = await query(
    `SELECT 1 FROM user_blocks
     WHERE (blocker_id=$1 AND blocked_id=$2)
        OR (blocker_id=$2 AND blocked_id=$1)
     LIMIT 1`,
    [userA, userB]
  );
  return result.rowCount > 0;
}

async function createReport({ reporterId, targetType, targetId, reportedUserId, reason, details }) {
  await ensureTrustSafetySchema();
  const allowedTargets = new Set(["listing", "user", "chat"]);
  const allowedReasons = new Set(["fake", "wrong_info", "harassment", "suspected_fraud", "spam", "inappropriate", "other"]);
  if (!allowedTargets.has(targetType) || !allowedReasons.has(reason) || !/^[0-9a-f-]{36}$/i.test(String(targetId || ""))) {
    const e = new Error("اطلاعات گزارش معتبر نیست."); e.status = 400; throw e;
  }
  if (reportedUserId === reporterId) {
    const e = new Error("امکان گزارش خودتان وجود ندارد."); e.status = 400; throw e;
  }
  const recent = await query(
    `SELECT COUNT(*)::int AS count
     FROM abuse_reports
     WHERE reporter_id=$1 AND target_type=$2 AND target_id=$3
       AND created_at > NOW() - INTERVAL '24 hours'`,
    [reporterId, targetType, targetId]
  );
  if (Number(recent.rows[0]?.count || 0) >= 2) {
    const e = new Error("گزارش شما برای این مورد قبلاً ثبت شده و در صف بررسی است."); e.status = 429; throw e;
  }
  const id = crypto.randomUUID();
  const result = await query(
    `INSERT INTO abuse_reports
      (id,reporter_id,target_type,target_id,reported_user_id,reason,details)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id,status,created_at`,
    [id, reporterId, targetType, targetId, reportedUserId || null, reason, String(details || "").trim().slice(0, 1000) || null]
  );
  return result.rows[0];
}

async function blockUser(blockerId, blockedId) {
  await ensureTrustSafetySchema();
  if (!blockedId || blockerId === blockedId) {
    const e = new Error("کاربر انتخاب‌شده قابل مسدودسازی نیست."); e.status = 400; throw e;
  }
  const exists = await query(`SELECT id FROM users WHERE id=$1 AND is_active=TRUE LIMIT 1`, [blockedId]);
  if (!exists.rowCount) {
    const e = new Error("کاربر پیدا نشد."); e.status = 404; throw e;
  }
  await query(
    `INSERT INTO user_blocks (blocker_id,blocked_id)
     VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [blockerId, blockedId]
  );
}

async function unblockUser(blockerId, blockedId) {
  await ensureTrustSafetySchema();
  await query(`DELETE FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2`, [blockerId, blockedId]);
}

async function getBlockStatus(currentUserId, otherUserId) {
  await ensureTrustSafetySchema();
  const r = await query(
    `SELECT blocker_id,blocked_id FROM user_blocks
     WHERE (blocker_id=$1 AND blocked_id=$2)
        OR (blocker_id=$2 AND blocked_id=$1)`,
    [currentUserId, otherUserId]
  );
  return {
    blockedByMe: r.rows.some((x) => x.blocker_id === currentUserId),
    blockedMe: r.rows.some((x) => x.blocker_id === otherUserId),
    blocked: r.rowCount > 0,
  };
}

async function listReports(status) {
  await ensureTrustSafetySchema();
  const params = [];
  let where = "";
  if (status && ["new", "reviewing", "resolved", "dismissed"].includes(status)) {
    params.push(status);
    where = "WHERE r.status=$1";
  }

  const result = await query(
    `SELECT
       r.id,r.target_type,r.target_id,r.reason,r.details,r.status,
       r.resolution_note,r.created_at,r.updated_at,
       reporter.full_name AS reporter_name,
       reporter.phone AS reporter_phone,
       reported.full_name AS reported_name,
       CASE WHEN r.target_type='chat'
         THEN EXISTS(SELECT 1 FROM chats c WHERE c.id=r.target_id)
         ELSE FALSE
       END AS chat_exists
     FROM abuse_reports r
     JOIN users reporter ON reporter.id=r.reporter_id
     LEFT JOIN users reported ON reported.id=r.reported_user_id
     ${where}
     ORDER BY CASE r.status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,
              r.created_at DESC
     LIMIT 300`,
    params
  );
  return result.rows;
}

async function updateReport(id, { status, note, adminId }) {
  await ensureTrustSafetySchema();
  if (!["new", "reviewing", "resolved", "dismissed"].includes(status)) {
    const e = new Error("وضعیت گزارش معتبر نیست."); e.status = 400; throw e;
  }

  // مرحله اصلی را عمداً حداقلی نگه می‌داریم تا تغییر وضعیت به ستون‌های جانبی
  // یا Foreign Key مدیر وابسته نباشد.
  const core = await query(
    `UPDATE abuse_reports
     SET status=$2,
         updated_at=NOW()
     WHERE id=$1
     RETURNING id,status,resolution_note,reviewed_at,updated_at`,
    [id, status]
  );

  if (!core.rowCount) {
    const e = new Error("گزارش پیدا نشد."); e.status = 404; throw e;
  }

  // ثبت اطلاعات تکمیلی مدیر best-effort است و شکست آن نباید تغییر وضعیت را خراب کند.
  try {
    let reviewerId = null;
    if (adminId) {
      const admin = await query(`SELECT id FROM users WHERE id=$1 LIMIT 1`, [adminId]);
      reviewerId = admin.rows[0]?.id || null;
    }

    await query(
      `UPDATE abuse_reports
       SET resolution_note=$2,
           reviewed_by=$3,
           reviewed_at=CASE
             WHEN $4='new' THEN NULL
             ELSE COALESCE(reviewed_at, NOW())
           END,
           updated_at=NOW()
       WHERE id=$1`,
      [id, String(note || "").trim().slice(0, 1000) || null, reviewerId, status]
    );
  } catch (metadataError) {
    console.warn("Admin report metadata update warning:", metadataError.message);
  }

  const final = await query(
    `SELECT id,status,resolution_note,reviewed_at,updated_at
     FROM abuse_reports WHERE id=$1 LIMIT 1`,
    [id]
  );
  return final.rows[0] || core.rows[0];
}

async function getAdminReportChat(reportId) {
  await ensureTrustSafetySchema();

  const reportResult = await query(
    `SELECT id,target_type,target_id FROM abuse_reports WHERE id=$1 LIMIT 1`,
    [reportId]
  );
  const report = reportResult.rows[0];
  if (!report) {
    const e = new Error("گزارش پیدا نشد."); e.status = 404; throw e;
  }
  if (report.target_type !== "chat") {
    const e = new Error("این گزارش مربوط به گفتگو نیست."); e.status = 400; throw e;
  }

  const chatResult = await query(
    `SELECT
       c.id,c.space_id,c.owner_id,c.requester_id,c.chat_type,c.created_at,
       s.title AS space_title,
       ou.full_name AS owner_name,
       ru.full_name AS requester_name
     FROM chats c
     LEFT JOIN spaces s ON s.id=c.space_id
     LEFT JOIN users ou ON ou.id=c.owner_id
     LEFT JOIN users ru ON ru.id=c.requester_id
     WHERE c.id=$1
     LIMIT 1`,
    [report.target_id]
  );

  const chat = chatResult.rows[0];
  if (!chat) {
    return { exists: false, chat: null, messages: [] };
  }

  const messagesResult = await query(
    `SELECT m.id,m.sender_id,m.text,m.created_at,m.read_at,
            u.full_name AS sender_name
     FROM messages m
     LEFT JOIN users u ON u.id=m.sender_id
     WHERE m.chat_id=$1
     ORDER BY m.created_at ASC
     LIMIT 300`,
    [chat.id]
  );

  return {
    exists: true,
    chat: {
      id: chat.id,
      spaceId: chat.space_id,
      spaceTitle: chat.space_title || "آگهی فضاجو",
      ownerId: chat.owner_id,
      ownerName: chat.owner_name || "آگهی‌دهنده",
      requesterId: chat.requester_id,
      requesterName: chat.requester_name || "متقاضی",
      chatType: chat.chat_type || "personal",
      createdAt: chat.created_at,
    },
    messages: messagesResult.rows.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_name || "کاربر فضاجو",
      text: m.text,
      createdAt: m.created_at,
      readAt: m.read_at,
    })),
  };
}

module.exports = {
  ensureTrustSafetySchema,
  isEitherUserBlocked,
  createReport,
  blockUser,
  unblockUser,
  getBlockStatus,
  listReports,
  updateReport,
  getAdminReportChat,
};
