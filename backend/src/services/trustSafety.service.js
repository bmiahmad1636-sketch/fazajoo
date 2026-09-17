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

      await query(`ALTER TABLE abuse_reports ADD COLUMN IF NOT EXISTS resolution_note VARCHAR(1000)`);
      await query(`ALTER TABLE abuse_reports ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL`);
      await query(`ALTER TABLE abuse_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`);
      await query(`ALTER TABLE abuse_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

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

      await query(`CREATE TABLE IF NOT EXISTS moderation_pair_blocks (
        user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_id UUID REFERENCES abuse_reports(id) ON DELETE SET NULL,
        reason VARCHAR(1000),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_a, user_b),
        CHECK (user_a <> user_b)
      )`);

      await query(`CREATE TABLE IF NOT EXISTS moderation_notices (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_id UUID REFERENCES abuse_reports(id) ON DELETE SET NULL,
        notice_type VARCHAR(30) NOT NULL DEFAULT 'warning',
        message VARCHAR(1000) NOT NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        read_at TIMESTAMPTZ
      )`);

      await query(`CREATE TABLE IF NOT EXISTS moderation_actions (
        id UUID PRIMARY KEY,
        report_id UUID NOT NULL REFERENCES abuse_reports(id) ON DELETE CASCADE,
        admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action_type VARCHAR(40) NOT NULL,
        target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        target_chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
        note VARCHAR(1000),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);

      await query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS moderation_mode VARCHAR(20) NOT NULL DEFAULT 'active'`);

      await query(`CREATE INDEX IF NOT EXISTS idx_abuse_reports_status_created ON abuse_reports(status, created_at DESC)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_abuse_reports_reporter ON abuse_reports(reporter_id, created_at DESC)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_moderation_actions_report ON moderation_actions(report_id, created_at DESC)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_moderation_notices_user ON moderation_notices(user_id, created_at DESC)`);
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function orderedPair(a, b) {
  return String(a) < String(b) ? [a, b] : [b, a];
}

async function isEitherUserBlocked(userA, userB) {
  await ensureTrustSafetySchema();
  if (!userA || !userB || userA === userB) return false;
  const [a, b] = orderedPair(userA, userB);
  const result = await query(
    `SELECT 1
     WHERE EXISTS (
       SELECT 1 FROM user_blocks
       WHERE (blocker_id=$1 AND blocked_id=$2)
          OR (blocker_id=$2 AND blocked_id=$1)
     )
     OR EXISTS (
       SELECT 1 FROM moderation_pair_blocks
       WHERE user_a=$3 AND user_b=$4
     )
     LIMIT 1`,
    [userA, userB, a, b]
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

async function listMyBlockedUsers(blockerId) {
  await ensureTrustSafetySchema();
  const result = await query(
    `SELECT
       u.id,
       u.full_name,
       u.phone,
       ub.created_at AS blocked_at
     FROM user_blocks ub
     JOIN users u ON u.id = ub.blocked_id
     WHERE ub.blocker_id = $1
     ORDER BY ub.created_at DESC`,
    [blockerId]
  );

  return result.rows.map((u) => {
    const phone = String(u.phone || "");
    const maskedPhone = phone.length >= 8
      ? `${phone.slice(0, 4)}***${phone.slice(-4)}`
      : "";
    return {
      id: u.id,
      fullName: u.full_name || "کاربر فضاجو",
      maskedPhone,
      blockedAt: u.blocked_at,
    };
  });
}

async function getBlockStatus(currentUserId, otherUserId) {
  await ensureTrustSafetySchema();
  const [a, b] = orderedPair(currentUserId, otherUserId);
  const r = await query(
    `SELECT blocker_id,blocked_id FROM user_blocks
     WHERE (blocker_id=$1 AND blocked_id=$2)
        OR (blocker_id=$2 AND blocked_id=$1)`,
    [currentUserId, otherUserId]
  );
  const moderation = await query(
    `SELECT 1 FROM moderation_pair_blocks WHERE user_a=$1 AND user_b=$2 LIMIT 1`,
    [a, b]
  );
  return {
    blockedByMe: r.rows.some((x) => x.blocker_id === currentUserId),
    blockedMe: r.rows.some((x) => x.blocker_id === otherUserId),
    blockedByModeration: moderation.rowCount > 0,
    blocked: r.rowCount > 0 || moderation.rowCount > 0,
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
       r.id,r.reporter_id,r.reported_user_id,r.target_type,r.target_id,r.reason,r.details,r.status,
       r.resolution_note,r.created_at,r.updated_at,
       reporter.full_name AS reporter_name,
       reporter.phone AS reporter_phone,
       reported.full_name AS reported_name,
       reported.is_active AS reported_is_active,
       reported.system_role AS reported_system_role,
       CASE WHEN r.target_type='chat'
         THEN EXISTS(SELECT 1 FROM chats c WHERE c.id=r.target_id)
         ELSE FALSE
       END AS chat_exists,
       CASE WHEN r.target_type='chat'
         THEN COALESCE((SELECT c.moderation_mode FROM chats c WHERE c.id=r.target_id LIMIT 1),'active')
         ELSE NULL
       END AS chat_moderation_mode,
       COALESCE((
         SELECT json_agg(json_build_object(
           'id',a.id,
           'actionType',a.action_type,
           'note',a.note,
           'createdAt',a.created_at,
           'adminName',au.full_name
         ) ORDER BY a.created_at DESC)
         FROM moderation_actions a
         LEFT JOIN users au ON au.id=a.admin_id
         WHERE a.report_id=r.id
       ), '[]'::json) AS actions
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
       c.id,c.space_id,c.owner_id,c.requester_id,c.chat_type,c.moderation_mode,c.created_at,
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
      moderationMode: chat.moderation_mode || "active",
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

async function applyAdminAction(reportId, { action, note, adminId }) {
  await ensureTrustSafetySchema();
  const allowed = new Set([
    "warning",
    "chat_restrict",
    "chat_restore",
    "pair_block",
    "pair_unblock",
    "user_suspend",
    "user_restore",
    "listing_disable",
    "listing_enable",
    "refer_legal",
  ]);
  if (!allowed.has(action)) {
    const e = new Error("اقدام مدیریتی معتبر نیست."); e.status = 400; throw e;
  }
  const cleanNote = String(note || "").trim().slice(0, 1000);
  if (cleanNote.length < 3) {
    const e = new Error("برای ثبت اقدام، توضیح کوتاهی وارد کنید."); e.status = 400; throw e;
  }

  const rr = await query(
    `SELECT r.*, u.system_role AS reported_system_role
     FROM abuse_reports r
     LEFT JOIN users u ON u.id=r.reported_user_id
     WHERE r.id=$1 LIMIT 1`,
    [reportId]
  );
  const report = rr.rows[0];
  if (!report) {
    const e = new Error("گزارش پیدا نشد."); e.status = 404; throw e;
  }

  const targetUserId = report.reported_user_id || null;
  const targetChatId = report.target_type === "chat" ? report.target_id : null;

  if (["warning", "user_suspend", "user_restore"].includes(action) && !targetUserId) {
    const e = new Error("کاربر گزارش‌شده برای این اقدام مشخص نیست."); e.status = 400; throw e;
  }
  if (["chat_restrict", "chat_restore"].includes(action) && report.target_type !== "chat") {
    const e = new Error("این اقدام فقط برای گزارش گفتگو قابل استفاده است."); e.status = 400; throw e;
  }
  if (["listing_disable", "listing_enable"].includes(action) && report.target_type !== "listing") {
    const e = new Error("این اقدام فقط برای گزارش آگهی قابل استفاده است."); e.status = 400; throw e;
  }
  if (["pair_block", "pair_unblock"].includes(action) && (!targetUserId || !report.reporter_id)) {
    const e = new Error("دو کاربر لازم برای محدودکردن ارتباط مشخص نیستند."); e.status = 400; throw e;
  }
  if (["user_suspend", "user_restore"].includes(action) && report.reported_system_role === "admin") {
    const e = new Error("تعلیق حساب مدیر از مرکز گزارش‌ها مجاز نیست."); e.status = 403; throw e;
  }

  async function addSystemNotice(userId, noticeType, message) {
    if (!userId) return;
    await query(
      `INSERT INTO moderation_notices (id,user_id,report_id,notice_type,message,created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [crypto.randomUUID(), userId, reportId, noticeType, message, adminId]
    );
  }

  function maskPhone(phone) {
    const value = String(phone || "").trim();
    if (/^09\d{9}$/.test(value)) {
      return `${value.slice(-4)}***${value.slice(0, 4)}`;
    }
    return "کاربر فضاجو";
  }

  async function getMaskedUserLabel(userId) {
    if (!userId) return "کاربر فضاجو";
    const result = await query(`SELECT phone FROM users WHERE id=$1 LIMIT 1`, [userId]);
    const masked = maskPhone(result.rows[0]?.phone);
    return masked === "کاربر فضاجو" ? masked : `کاربر \u2066${masked}\u2069`;
  }

  if (action === "warning") {
    // یادداشت مدیر داخلی است و هرگز عیناً به کاربر نمایش داده نمی‌شود.
    await addSystemNotice(
      targetUserId,
      "warning",
      "یک اخطار مدیریتی برای حساب شما در فضاجو ثبت شده است. لطفاً قوانین و شیوه ارتباط محترمانه در فضاجو را رعایت کنید."
    );
  }

  if (action === "chat_restrict" || action === "chat_restore") {
    const mode = action === "chat_restrict" ? "blocked" : "active";
    const changed = await query(
      `UPDATE chats
       SET moderation_mode=$2, updated_at=NOW()
       WHERE id=$1
       RETURNING id, owner_id, requester_id`,
      [targetChatId, mode]
    );
    if (!changed.rowCount) {
      const e = new Error("گفتگوی گزارش‌شده پیدا نشد."); e.status = 404; throw e;
    }

    const changedChat = changed.rows[0];
    const noticeType = action === "chat_restrict" ? "chat_restricted" : "chat_restored";
    const ownerOtherLabel = await getMaskedUserLabel(changedChat.requester_id);
    const requesterOtherLabel = await getMaskedUserLabel(changedChat.owner_id);

    const ownerMessage = action === "chat_restrict"
      ? `ارسال پیام در گفتگوی شما با ${ownerOtherLabel} توسط مدیریت فضاجو موقتاً محدود شد. این محدودیت فقط همین گفتگو را شامل می‌شود.`
      : `محدودیت مدیریتی گفتگوی شما با ${ownerOtherLabel} برداشته شد و امکان ارسال پیام در این گفتگو دوباره فعال است.`;

    const requesterMessage = action === "chat_restrict"
      ? `ارسال پیام در گفتگوی شما با ${requesterOtherLabel} توسط مدیریت فضاجو موقتاً محدود شد. این محدودیت فقط همین گفتگو را شامل می‌شود.`
      : `محدودیت مدیریتی گفتگوی شما با ${requesterOtherLabel} برداشته شد و امکان ارسال پیام در این گفتگو دوباره فعال است.`;

    await addSystemNotice(changedChat.owner_id, noticeType, ownerMessage);
    await addSystemNotice(changedChat.requester_id, noticeType, requesterMessage);
  }

  if (action === "pair_block" || action === "pair_unblock") {
    const [a, b] = orderedPair(report.reporter_id, targetUserId);
    if (action === "pair_block") {
      await query(
        `INSERT INTO moderation_pair_blocks (user_a,user_b,report_id,reason,created_by)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (user_a,user_b)
         DO UPDATE SET report_id=EXCLUDED.report_id,reason=EXCLUDED.reason,created_by=EXCLUDED.created_by,created_at=NOW()`,
        [a, b, reportId, cleanNote, adminId]
      );
      const reporterOtherLabel = await getMaskedUserLabel(targetUserId);
      const targetOtherLabel = await getMaskedUserLabel(report.reporter_id);
      await addSystemNotice(
        report.reporter_id,
        "pair_blocked",
        `ارتباط حساب شما با ${reporterOtherLabel} به تصمیم مدیریت فضاجو موقتاً محدود شد. در حال حاضر امکان شروع یا ادامه گفتگو بین این دو حساب وجود ندارد.`
      );
      await addSystemNotice(
        targetUserId,
        "pair_blocked",
        `ارتباط حساب شما با ${targetOtherLabel} به تصمیم مدیریت فضاجو موقتاً محدود شد. در حال حاضر امکان شروع یا ادامه گفتگو بین این دو حساب وجود ندارد.`
      );
    } else {
      await query(`DELETE FROM moderation_pair_blocks WHERE user_a=$1 AND user_b=$2`, [a, b]);
      const reporterOtherLabel = await getMaskedUserLabel(targetUserId);
      const targetOtherLabel = await getMaskedUserLabel(report.reporter_id);
      await addSystemNotice(
        report.reporter_id,
        "pair_unblocked",
        `محدودیت ارتباط مدیریتی حساب شما با ${reporterOtherLabel} برداشته شد و امکان گفتگو دوباره فعال است.`
      );
      await addSystemNotice(
        targetUserId,
        "pair_unblocked",
        `محدودیت ارتباط مدیریتی حساب شما با ${targetOtherLabel} برداشته شد و امکان گفتگو دوباره فعال است.`
      );
    }
  }

  if (action === "user_suspend") {
    await query(`UPDATE users SET is_active=FALSE, auth_version=COALESCE(auth_version,1)+1 WHERE id=$1`, [targetUserId]);
  }
  if (action === "user_restore") {
    await query(`UPDATE users SET is_active=TRUE, auth_version=COALESCE(auth_version,1)+1 WHERE id=$1`, [targetUserId]);
  }

  if (action === "listing_disable" || action === "listing_enable") {
    const status = action === "listing_disable" ? "inactive" : "active";
    const changed = await query(`UPDATE spaces SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING id`, [report.target_id, status]);
    if (!changed.rowCount) {
      const e = new Error("آگهی گزارش‌شده پیدا نشد."); e.status = 404; throw e;
    }
  }

  const actionId = crypto.randomUUID();
  await query(
    `INSERT INTO moderation_actions
      (id,report_id,admin_id,action_type,target_user_id,target_chat_id,note,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [
      actionId,
      reportId,
      adminId,
      action,
      targetUserId,
      targetChatId,
      cleanNote,
      JSON.stringify({ targetType: report.target_type, targetId: report.target_id }),
    ]
  );

  await query(
    `UPDATE abuse_reports
     SET status='resolved', resolution_note=$2, reviewed_by=$3,
         reviewed_at=COALESCE(reviewed_at,NOW()), updated_at=NOW()
     WHERE id=$1`,
    [reportId, cleanNote, adminId]
  );

  return {
    id: actionId,
    actionType: action,
    reportId,
    targetUserId,
    targetChatId,
    note: cleanNote,
  };
}

async function getMyNotices(userId) {
  await ensureTrustSafetySchema();
  const r = await query(
    `SELECT id,notice_type,message,created_at,read_at
     FROM moderation_notices
     WHERE user_id=$1
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );
  return r.rows.map((x) => ({
    id: x.id,
    type: x.notice_type,
    message: x.message,
    createdAt: x.created_at,
    readAt: x.read_at,
  }));
}

async function markNoticeRead(userId, noticeId) {
  await ensureTrustSafetySchema();
  const r = await query(
    `UPDATE moderation_notices SET read_at=COALESCE(read_at,NOW())
     WHERE id=$1 AND user_id=$2 RETURNING id,read_at`,
    [noticeId, userId]
  );
  if (!r.rowCount) {
    const e = new Error("هشدار پیدا نشد."); e.status = 404; throw e;
  }
  return r.rows[0];
}

module.exports = {
  ensureTrustSafetySchema,
  isEitherUserBlocked,
  createReport,
  blockUser,
  unblockUser,
  getBlockStatus,
  listMyBlockedUsers,
  listReports,
  updateReport,
  getAdminReportChat,
  applyAdminAction,
  getMyNotices,
  markNoticeRead,
};
