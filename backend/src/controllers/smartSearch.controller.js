const crypto = require("crypto");
const { query } = require("../db/pool");
const {
  ensureSmartSearchSchema,
  withInferredCategory,
  inferCityFromRawText,
  reconcileSmartSearchNotificationsForUser,
} = require("../services/smartSearch.service");

function cleanCriteria(value, rawText = "") {
  const criteria = value && typeof value === "object" ? value : {};
  const bedrooms = Math.max(
    0,
    Number(criteria?.villaDetails?.bedrooms || criteria?.residentialDetails?.bedrooms || 0) || 0
  );

  const cleaned = {
    listingType: "wanted",
    category: ["parking", "residential", "villa", "storage", "warehouse", "shop", "land", "other"].includes(criteria.category)
      ? criteria.category
      : "other",
    categoryLabel: String(criteria.categoryLabel || "").trim().slice(0, 80),
    customCategory: String(criteria.customCategory || "").trim().slice(0, 160),
    title: String(criteria.title || "").trim().slice(0, 500),
    description: String(criteria.description || "").trim().slice(0, 1000),
    city: String(criteria.city || inferCityFromRawText(rawText) || "").trim().slice(0, 100),
    area: Math.max(0, Number(criteria.area) || 0),
    price: String(criteria.price || "").trim().slice(0, 100),
    residentialDetails: bedrooms ? { bedrooms } : {},
    villaDetails: bedrooms ? { bedrooms } : {},
  };

  return withInferredCategory(cleaned, rawText);
}

function mapSearch(row) {
  return {
    id: row.id,
    rawText: row.raw_text,
    criteria: row.criteria || {},
    threshold: Number(row.threshold || 70),
    isActive: Boolean(row.is_active),
    bestSeenScore: Number(row.best_seen_score || 0),
    lastNotifiedAt: row.last_notified_at,
    createdAt: row.created_at,
  };
}

function mapNotification(row) {
  return {
    id: row.id,
    smartSearchId: row.smart_search_id,
    spaceId: row.space_id,
    matchScore: Number(row.match_score || 0),
    reasons: Array.isArray(row.reasons) ? row.reasons : [],
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
    space: row.space_id
      ? {
          id: row.space_id,
          title: row.space_title,
          city: row.space_city,
          category: row.space_category,
          price: row.space_price,
          imageUrl: row.space_image_url || "",
        }
      : null,
  };
}

async function list(req, res) {
  try {
    await ensureSmartSearchSchema();
    await reconcileSmartSearchNotificationsForUser(req.user.id);
    const result = await query(
      `SELECT * FROM smart_searches WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ ok: true, searches: result.rows.map(mapSearch) });
  } catch (error) {
    console.error("List smart searches error:", error);
    return res.status(500).json({ ok: false, message: "دریافت پیگیری‌های هوشمند انجام نشد." });
  }
}

async function create(req, res) {
  try {
    await ensureSmartSearchSchema();
    const rawText = String(req.body?.rawText || "").trim().slice(0, 1000);
    const criteria = cleanCriteria(req.body?.criteria, rawText);
    const threshold = Math.max(70, Math.min(100, Number(req.body?.threshold) || 70));

    if (rawText.length < 4) {
      return res.status(400).json({ ok: false, message: "درخواست جستجو خیلی کوتاه است." });
    }

    const duplicate = await query(
      `SELECT * FROM smart_searches
       WHERE user_id=$1 AND is_active=TRUE AND raw_text=$2
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, rawText]
    );

    if (duplicate.rows[0]) {
      return res.json({ ok: true, message: "این پیگیری از قبل فعال است.", search: mapSearch(duplicate.rows[0]) });
    }

    const id = crypto.randomUUID();
    const result = await query(
      `INSERT INTO smart_searches
        (id,user_id,raw_text,criteria,threshold,is_active,best_seen_score)
       VALUES ($1,$2,$3,$4::jsonb,$5,TRUE,$6)
       RETURNING *`,
      [
        id,
        req.user.id,
        rawText,
        JSON.stringify(criteria),
        threshold,
        Math.max(0, Math.min(100, Number(req.body?.bestSeenScore) || 0)),
      ]
    );

    return res.status(201).json({
      ok: true,
      message: `از این به بعد آگهی‌های جدید با حداقل ${threshold}٪ تطابق را بهت خبر می‌دهیم.`,
      search: mapSearch(result.rows[0]),
    });
  } catch (error) {
    console.error("Create smart search error:", error);
    return res.status(500).json({ ok: false, message: "فعال‌کردن پیگیری هوشمند انجام نشد." });
  }
}

async function toggle(req, res) {
  try {
    await ensureSmartSearchSchema();
    const isActive = Boolean(req.body?.isActive);
    const result = await query(
      `UPDATE smart_searches SET is_active=$3, updated_at=NOW()
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id, req.user.id, isActive]
    );
    if (!result.rows[0]) return res.status(404).json({ ok: false, message: "پیگیری پیدا نشد." });
    return res.json({ ok: true, search: mapSearch(result.rows[0]) });
  } catch (error) {
    console.error("Toggle smart search error:", error);
    return res.status(500).json({ ok: false, message: "تغییر وضعیت پیگیری انجام نشد." });
  }
}

async function remove(req, res) {
  try {
    await ensureSmartSearchSchema();
    const result = await query(`DELETE FROM smart_searches WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ ok: false, message: "پیگیری پیدا نشد." });
    return res.json({ ok: true, message: "پیگیری حذف شد." });
  } catch (error) {
    console.error("Remove smart search error:", error);
    return res.status(500).json({ ok: false, message: "حذف پیگیری انجام نشد." });
  }
}

async function notifications(req, res) {
  try {
    await ensureSmartSearchSchema();
    await reconcileSmartSearchNotificationsForUser(req.user.id);
    const result = await query(
      `SELECT n.*,
              s.title AS space_title,
              s.city AS space_city,
              s.category AS space_category,
              s.price AS space_price,
              s.image_url AS space_image_url
       FROM smart_search_notifications n
       LEFT JOIN spaces s ON s.id=n.space_id
       WHERE n.user_id=$1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const unreadCount = result.rows.filter((row) => !row.is_read).length;
    return res.json({ ok: true, unreadCount, notifications: result.rows.map(mapNotification) });
  } catch (error) {
    console.error("Smart notifications error:", error);
    return res.status(500).json({ ok: false, message: "دریافت اعلان‌های هوشمند انجام نشد." });
  }
}

async function markRead(req, res) {
  try {
    await ensureSmartSearchSchema();
    await query(
      `UPDATE smart_search_notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error("Mark smart notification read error:", error);
    return res.status(500).json({ ok: false, message: "ثبت مشاهده اعلان انجام نشد." });
  }
}

async function markAllRead(req, res) {
  try {
    await ensureSmartSearchSchema();
    await query(`UPDATE smart_search_notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE`, [req.user.id]);
    return res.json({ ok: true });
  } catch (error) {
    console.error("Mark all smart notifications read error:", error);
    return res.status(500).json({ ok: false, message: "ثبت مشاهده اعلان‌ها انجام نشد." });
  }
}

module.exports = { list, create, toggle, remove, notifications, markRead, markAllRead };
