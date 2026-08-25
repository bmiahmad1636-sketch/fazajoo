const crypto = require("crypto");
const { query } = require("../db/pool");

let chatSchemaPromise = null;

function ensureChatSchema() {
  if (!chatSchemaPromise) {
    chatSchemaPromise = (async () => {
      await query(`
        ALTER TABLE chats
        ADD COLUMN IF NOT EXISTS chat_type VARCHAR(20) NOT NULL DEFAULT 'personal'
      `);

      await query(`
        ALTER TABLE chats
        DROP CONSTRAINT IF EXISTS chats_space_requester_unique
      `);

      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'chats_space_requester_type_unique'
          ) THEN
            ALTER TABLE chats
            ADD CONSTRAINT chats_space_requester_type_unique
            UNIQUE (space_id, requester_id, chat_type);
          END IF;
        END
        $$;
      `);
    })().catch((error) => {
      chatSchemaPromise = null;
      throw error;
    });
  }

  return chatSchemaPromise;
}

function normalizeChatType(value) {
  return value === "agency" ? "agency" : "personal";
}

function userLabel(row, prefix) {
  return row[`${prefix}_name`] || row[`${prefix}_phone`] || "کاربر فضاجو";
}

function mapChat(row, currentUserId) {
  const isOwner = row.owner_id === currentUserId;
  return {
    id: row.id,
    parkingId: row.space_id,
    parkingTitle: row.space_title || "آگهی فضاجو",
    parkingCity: row.space_city || "",
    parkingImageUrl: row.space_image_url || "",
    ownerId: row.owner_id,
    requesterId: row.requester_id,
    chatType: row.chat_type || "personal",
    otherUserId: isOwner ? row.requester_id : row.owner_id,
    otherUserName: isOwner ? userLabel(row, "requester") : userLabel(row, "owner"),
    otherUserRole:
      (row.chat_type || "personal") === "agency"
        ? isOwner
          ? "مشاور املاک"
          : row.space_listing_type === "wanted"
            ? "متقاضی فضا"
            : "آگهی‌دهنده"
        : isOwner
          ? "متقاضی آگهی"
          : "آگهی‌دهنده",
    lastMessage: row.last_message || "",
    lastMessageSenderId: row.last_message_sender_id || "",
    unreadCount: Number(row.unread_count || 0),
    updatedAt: row.last_message_at || row.updated_at || row.created_at,
    createdAt: row.created_at,
  };
}

const CHAT_SELECT = `
  SELECT
    c.id, c.space_id, c.owner_id, c.requester_id, c.chat_type, c.created_at, c.updated_at,
    s.title AS space_title, s.city AS space_city, s.image_url AS space_image_url,
    s.listing_type AS space_listing_type,
    ou.full_name AS owner_name, ou.phone AS owner_phone,
    ru.full_name AS requester_name, ru.phone AS requester_phone,
    lm.text AS last_message,
    lm.sender_id AS last_message_sender_id,
    lm.created_at AS last_message_at,
    COALESCE(uc.unread_count, 0) AS unread_count
  FROM chats c
  JOIN spaces s ON s.id = c.space_id
  JOIN users ou ON ou.id = c.owner_id
  JOIN users ru ON ru.id = c.requester_id
  LEFT JOIN LATERAL (
    SELECT m.text, m.sender_id, m.created_at
    FROM messages m
    WHERE m.chat_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS unread_count
    FROM messages m
    WHERE m.chat_id = c.id
      AND m.sender_id <> $1
      AND m.read_at IS NULL
  ) uc ON TRUE
`;

async function getChatRow(chatId, userId) {
  await ensureChatSchema();

  const result = await query(
    `${CHAT_SELECT}
     WHERE c.id = $2
       AND (c.owner_id = $1 OR c.requester_id = $1)
     LIMIT 1`,
    [userId, chatId]
  );
  return result.rows[0] || null;
}

async function list(req, res) {
  try {
    await ensureChatSchema();

    const chatType = normalizeChatType(req.query?.type);
    const currentUserId = String(req.user.id);

    const isApprovedAgent =
      req.user.account_type === "agent" &&
      req.user.agency_status === "approved";

    let typeCondition;

    if (chatType === "agency") {
      if (!isApprovedAgent) {
        return res.status(403).json({
          ok: false,
          message: "دسترسی مشاور تأییدشده لازم است.",
        });
      }

      // برای مشاور تأییدشده فقط یک صندوق پیام وجود دارد:
      // همه گفتگوهای واقعی او، چه قدیمی چه جدید، گفتگوی کاری محسوب می‌شوند.
      typeCondition = `c.chat_type IN ('personal', 'agency')`;
    } else {
      // صندوق شخصی فقط متعلق به کاربران عادی است.
      if (isApprovedAgent) {
        return res.json({
          ok: true,
          chatType: "personal",
          chats: [],
        });
      }

      typeCondition = `c.chat_type = 'personal'`;
    }

    const result = await query(
      `${CHAT_SELECT}
       WHERE (c.owner_id = $1 OR c.requester_id = $1)
         AND ${typeCondition}
         AND EXISTS (
           SELECT 1
           FROM messages visible_message
           WHERE visible_message.chat_id = c.id
         )
       ORDER BY COALESCE(lm.created_at, c.updated_at, c.created_at) DESC`,
      [currentUserId]
    );

    const safeRows = result.rows.filter((row) => {
      return (
        String(row.owner_id || "") === currentUserId ||
        String(row.requester_id || "") === currentUserId
      );
    });

    return res.json({
      ok: true,
      chatType,
      chats: safeRows.map((row) => mapChat(row, currentUserId)),
    });
  } catch (error) {
    console.error("Inbox load error:", error);
    return res.status(500).json({
      ok: false,
      message: "دریافت گفتگوها انجام نشد.",
    });
  }
}

async function getOne(req, res) {
  try {
    const row = await getChatRow(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ ok: false, message: "گفتگو پیدا نشد." });
    return res.json({ ok: true, chat: mapChat(row, req.user.id) });
  } catch (error) {
    console.error("Chat load error:", error);
    return res.status(500).json({ ok: false, message: "دریافت گفتگو انجام نشد." });
  }
}

async function createOrGet(req, res) {
  try {
    await ensureChatSchema();

    const spaceId = String(req.body?.spaceId || "").trim();
    const chatType = normalizeChatType(req.body?.chatType);

    if (!spaceId) {
      return res.status(400).json({ ok: false, message: "شناسه آگهی لازم است." });
    }

    if (
      chatType === "agency" &&
      !(
        req.user.account_type === "agent" &&
        req.user.agency_status === "approved"
      )
    ) {
      return res.status(403).json({
        ok: false,
        message: "فقط مشاور تأییدشده می‌تواند گفتگوی کاری ایجاد کند.",
      });
    }

    const spaceResult = await query(
      `SELECT id, owner_id FROM spaces WHERE id = $1 AND status <> 'inactive' LIMIT 1`,
      [spaceId]
    );

    const space = spaceResult.rows[0];

    if (!space) {
      return res.status(404).json({ ok: false, message: "آگهی پیدا نشد." });
    }

    if (space.owner_id === req.user.id) {
      return res.status(400).json({
        ok: false,
        message: "نمی‌توانید با آگهی خودتان گفتگو ایجاد کنید.",
      });
    }

    const id = crypto.randomUUID();

    const result = await query(
      `INSERT INTO chats (id, space_id, owner_id, requester_id, chat_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (space_id, requester_id, chat_type)
       DO UPDATE SET updated_at = chats.updated_at
       RETURNING id`,
      [id, space.id, space.owner_id, req.user.id, chatType]
    );

    const row = await getChatRow(result.rows[0].id, req.user.id);

    return res.status(201).json({
      ok: true,
      chat: mapChat(row, req.user.id),
    });
  } catch (error) {
    console.error("Prepare chat error:", error);
    return res.status(500).json({ ok: false, message: "آماده‌سازی گفتگو انجام نشد." });
  }
}

async function messages(req, res) {
  try {
    const chat = await getChatRow(req.params.id, req.user.id);
    if (!chat) return res.status(404).json({ ok: false, message: "گفتگو پیدا نشد." });

    const result = await query(
      `SELECT id, chat_id, sender_id, text, created_at, read_at
       FROM messages
       WHERE chat_id = $1
       ORDER BY created_at ASC`,
      [req.params.id]
    );

    return res.json({
      ok: true,
      messages: result.rows.map((row) => ({
        id: row.id,
        chatId: row.chat_id,
        senderId: row.sender_id,
        text: row.text,
        createdAt: row.created_at,
        readAt: row.read_at,
      })),
    });
  } catch (error) {
    console.error("Messages load error:", error);
    return res.status(500).json({ ok: false, message: "دریافت پیام‌ها انجام نشد." });
  }
}

async function send(req, res) {
  try {
    const text = String(req.body?.text || "").trim().slice(0, 2000);
    if (!text) return res.status(400).json({ ok: false, message: "متن پیام خالی است." });

    const chat = await getChatRow(req.params.id, req.user.id);
    if (!chat) return res.status(404).json({ ok: false, message: "گفتگو پیدا نشد." });

    const id = crypto.randomUUID();
    const result = await query(
      `INSERT INTO messages (id, chat_id, sender_id, text)
       VALUES ($1, $2, $3, $4)
       RETURNING id, chat_id, sender_id, text, created_at, read_at`,
      [id, req.params.id, req.user.id, text]
    );
    await query(`UPDATE chats SET updated_at = NOW() WHERE id = $1`, [req.params.id]);

    const row = result.rows[0];
    const message = {
      id: row.id,
      chatId: row.chat_id,
      senderId: row.sender_id,
      text: row.text,
      createdAt: row.created_at,
      readAt: row.read_at,
    };

    const io = req.app.get("io");
    if (io) {
      io.to(`chat:${req.params.id}`).emit("chat:message", message);
      io.to(`user:${chat.owner_id}`).emit("inbox:changed", { chatId: req.params.id });
      io.to(`user:${chat.requester_id}`).emit("inbox:changed", { chatId: req.params.id });
    }

    return res.status(201).json({ ok: true, message });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({ ok: false, message: "ارسال پیام انجام نشد." });
  }
}

async function markRead(req, res) {
  try {
    const chat = await getChatRow(req.params.id, req.user.id);
    if (!chat) return res.status(404).json({ ok: false, message: "گفتگو پیدا نشد." });

    const readAt = new Date();
    const result = await query(
      `UPDATE messages
       SET read_at = $3
       WHERE chat_id = $1
         AND sender_id <> $2
         AND read_at IS NULL
       RETURNING id`,
      [req.params.id, req.user.id, readAt]
    );

    const io = req.app.get("io");
    if (io && result.rowCount > 0) {
      io.to(`chat:${req.params.id}`).emit("chat:read", {
        chatId: req.params.id,
        readerId: req.user.id,
        readAt,
      });
      io.to(`user:${chat.owner_id}`).emit("inbox:changed", { chatId: req.params.id });
      io.to(`user:${chat.requester_id}`).emit("inbox:changed", { chatId: req.params.id });
    }

    return res.json({ ok: true, readCount: result.rowCount, readAt });
  } catch (error) {
    console.error("Mark read error:", error);
    return res.status(500).json({ ok: false, message: "ثبت وضعیت خوانده‌شدن انجام نشد." });
  }
}

async function unreadCount(req, res) {
  try {
    await ensureChatSchema();

    const chatType = normalizeChatType(req.query?.type);
    const isApprovedAgent =
      req.user.account_type === "agent" &&
      req.user.agency_status === "approved";

    let typeCondition;

    if (chatType === "agency") {
      if (!isApprovedAgent) {
        return res.status(403).json({
          ok: false,
          message: "دسترسی مشاور تأییدشده لازم است.",
        });
      }

      typeCondition = `c.chat_type IN ('personal', 'agency')`;
    } else {
      if (isApprovedAgent) {
        return res.json({
          ok: true,
          chatType: "personal",
          unreadCount: 0,
        });
      }

      typeCondition = `c.chat_type = 'personal'`;
    }

    const result = await query(
      `SELECT COUNT(*)::int AS count
       FROM messages m
       JOIN chats c ON c.id = m.chat_id
       WHERE (c.owner_id = $1 OR c.requester_id = $1)
         AND ${typeCondition}
         AND m.sender_id <> $1
         AND m.read_at IS NULL`,
      [req.user.id]
    );

    return res.json({
      ok: true,
      chatType,
      unreadCount: Number(result.rows[0]?.count || 0),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "دریافت تعداد پیام‌های خوانده‌نشده انجام نشد.",
    });
  }
}

module.exports = { list, getOne, createOrGet, messages, send, markRead, unreadCount };
