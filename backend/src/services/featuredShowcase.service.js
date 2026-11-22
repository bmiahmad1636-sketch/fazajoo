"use strict";
const { randomUUID } = require("node:crypto");
const { pool } = require("../db/pool");

const HOURS = 72;
const uuidPattern = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const { rotationIndex } = require("./featuredShowcaseRotation");
const { normalizeIranMobile, normalizeOwnerSearch, escapeSqlLike } = require("./featuredOwnerLookupHP04");

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

async function withLockedState(operation) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serializes admin creations, public reads and promotions across Node workers.
    await client.query("SELECT pg_advisory_xact_lock(5731, 3003)");
    const settingsResult = await client.query("SELECT * FROM featured_showcase_settings WHERE singleton=1 FOR UPDATE");
    const settings = settingsResult.rows[0];
    if (!settings) fail("ابتدا ساختار پایگاه داده ویترین ویژه را نصب کنید.", 503);

    const expired = await client.query("UPDATE featured_showcase_bookings SET status='expired',updated_at=NOW() WHERE status='active' AND expires_at <= NOW() RETURNING id");
    for (const row of expired.rows) {
      await client.query("INSERT INTO featured_showcase_audit(id,booking_id,action) VALUES($1,$2,'auto_expired')", [randomUUID(),row.id]);
    }
    // A deactivated/deleted/legally held ad may never occupy a premium slot.
    const unavailable = await client.query(`UPDATE featured_showcase_bookings b SET status='cancelled',updated_at=NOW()
      WHERE b.status IN ('queued','active') AND NOT EXISTS (
      SELECT 1 FROM spaces s JOIN users u ON u.id=s.owner_id
      WHERE s.id=b.space_id AND s.status='active' AND s.listing_type='offer' AND COALESCE(s.legal_hold,false)=false AND u.is_active=true
      ) RETURNING b.id`);
    for (const row of unavailable.rows) {
      await client.query("INSERT INTO featured_showcase_audit(id,booking_id,action) VALUES($1,$2,'auto_unavailable')", [randomUUID(),row.id]);
    }
    const active = await client.query("SELECT count(*)::integer AS count FROM featured_showcase_bookings WHERE status='active'");
    let available = Math.max(0, settings.capacity - active.rows[0].count);
    // No clock job required: the next public/admin request executes expiration and FIFO promotion.
    if (available && settings.enabled) {
      const queue = await client.query(`SELECT id FROM featured_showcase_bookings
        WHERE status='queued' ORDER BY created_at ASC,id ASC LIMIT $1 FOR UPDATE`, [available]);
      for (const booking of queue.rows) {
        await client.query(`UPDATE featured_showcase_bookings SET status='active',activated_at=NOW(),
          expires_at=NOW()+INTERVAL '72 hours',updated_at=NOW() WHERE id=$1 AND status='queued'`, [booking.id]);
        await client.query("INSERT INTO featured_showcase_audit(id,booking_id,action) VALUES($1,$2,'auto_activated')", [randomUUID(),booking.id]);
        available--;
      }
    }
    const result = await operation(client, settings);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

const publicFields = `b.id AS booking_id,s.id AS space_id,s.title,s.city,s.category,
  COALESCE(NULLIF(s.image_url,''),NULLIF(s.image_urls->>0,''),'') AS image_url,
  b.activated_at,b.expires_at`;

async function current() {
  return withLockedState(async (client, settings) => {
    const rows = await client.query(`SELECT ${publicFields} FROM featured_showcase_bookings b
      JOIN spaces s ON s.id=b.space_id JOIN users u ON u.id=s.owner_id
      WHERE b.status='active' AND b.expires_at > NOW() AND s.status='active'
      AND s.listing_type='offer' AND COALESCE(s.legal_hold,false)=false AND u.is_active=true
      ORDER BY b.activated_at ASC,b.id ASC`);
    const list = rows.rows;
    const now = Date.now();
    const ix = settings.enabled ? rotationIndex(now, settings.rotation_minutes, list.length) : -1;
    const chosen = ix >= 0 ? list[ix] : null;
    return {
      ok: true,
      enabled: settings.enabled,
      activeCount: list.length,
      capacity: settings.capacity,
      rotationMinutes: settings.rotation_minutes,
      serverTime: new Date(now).toISOString(),
      // Ask browsers to refresh exactly when their display allocation may change.
      refreshAfterMs: chosen ? Math.max(1000, Math.min(
        (Math.floor(now / (settings.rotation_minutes * 60000)) + 1) * settings.rotation_minutes * 60000 - now,
        Math.max(1000, new Date(chosen.expires_at).getTime() - now)
      )) : 60000,
      placement: chosen ? {
        bookingId: chosen.booking_id,
        spaceId: chosen.space_id,
        title: chosen.title,
        city: chosen.city,
        category: chosen.category,
        imageUrl: chosen.image_url,
        expiresAt: chosen.expires_at,
      } : null,
    };
  });
}

async function dashboard() {
  return withLockedState(async (client, settings) => {
    const bookings = await client.query(`SELECT b.id,b.space_id AS "spaceId",s.title,s.city,b.status,
      b.payment_mode AS "paymentMode",b.payment_reference AS "paymentReference",
      b.amount_rials AS "amountRials",b.note,b.created_at AS "createdAt",
      b.activated_at AS "activatedAt",b.expires_at AS "expiresAt"
      FROM featured_showcase_bookings b LEFT JOIN spaces s ON s.id=b.space_id
      ORDER BY CASE b.status WHEN 'active' THEN 0 WHEN 'queued' THEN 1 ELSE 2 END,
      b.created_at DESC LIMIT 200`);
    const revenue = await client.query("SELECT COALESCE(SUM(amount_rials),0)::text AS total FROM featured_showcase_bookings WHERE payment_mode='manual_verified'");
    const activeCount = bookings.rows.filter(row => row.status === "active").length;
    const queueCount = bookings.rows.filter(row => row.status === "queued").length;
    return { ok: true, settings: { enabled: settings.enabled, capacity: settings.capacity,
      rotationMinutes: settings.rotation_minutes, packagePriceRials: String(settings.package_price_rials) },
      activeCount, queueCount, manualRecordedTotalRials: revenue.rows[0].total,
      availableSlots: Math.max(0, settings.capacity - activeCount), bookings: bookings.rows };
  });
}

async function updateSettings(input, actorId) {
  if (typeof input.enabled !== "boolean" || !Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 100 ||
    !Number.isInteger(input.rotationMinutes) || input.rotationMinutes < 1 || input.rotationMinutes > 60 ||
    !/^\d{1,15}$/.test(String(input.packagePriceRials ?? ""))) fail("مقادیر تنظیمات ویترین معتبر نیست.");
  return withLockedState(async (client) => {
    const live = await client.query("SELECT count(*)::integer AS count FROM featured_showcase_bookings WHERE status='active'");
    if (input.capacity < live.rows[0].count) fail("ظرفیت جدید از تعداد آگهی‌های فعال کمتر است.",409);
    const result = await client.query(`UPDATE featured_showcase_settings SET enabled=$1,capacity=$2,
      rotation_minutes=$3,package_price_rials=$4,updated_at=NOW(),updated_by=$5 WHERE singleton=1 RETURNING *`,
      [input.enabled,input.capacity,input.rotationMinutes,String(input.packagePriceRials),actorId]);
    await client.query("INSERT INTO featured_showcase_audit(id,actor_id,action,metadata) VALUES($1,$2,'settings_updated',$3::jsonb)",
      [randomUUID(),actorId,JSON.stringify({enabled:input.enabled,capacity:input.capacity,rotationMinutes:input.rotationMinutes,packagePriceRials:input.packagePriceRials})]);
    return {ok:true,settings:result.rows[0]};
  });
}

// Admin-only lookup by the verified account mobile, NEVER spaces.phone.
// Paging avoids transferring the entire marketplace to the browser.
async function lookupOwnerSpaces(input) {
  const phone = normalizeIranMobile(input.phone);
  if (!phone) fail("شماره موبایل صاحب حساب معتبر نیست.");
  const term = normalizeOwnerSearch(input.search);
  const offset = Number(input.offset ?? 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 10000) fail("صفحه نتایج معتبر نیست.");
  const limit = 20;
  const client = await pool.connect();
  try {
    const owner = await client.query(`SELECT id,COALESCE(full_name,'') AS full_name
      FROM users WHERE phone=$1 AND is_active=true LIMIT 1`, [phone]);
    if (!owner.rowCount) return {ok:true,ownerFound:false,ownerName:"",spaces:[],hasMore:false};
    const like = `%${escapeSqlLike(term)}%`;
    const results = await client.query(`SELECT s.id,s.title,s.city,s.category,s.category_label,
       COALESCE(NULLIF(s.image_url,''),NULLIF(s.image_urls->>0,''),'') AS image_url,
       GREATEST(jsonb_array_length(COALESCE(s.image_urls,'[]'::jsonb)),
         CASE WHEN NULLIF(s.image_url,'') IS NOT NULL THEN 1 ELSE 0 END) AS image_count
      FROM spaces s
      WHERE s.owner_id=$1 AND s.listing_type='offer' AND s.status='active'
        AND COALESCE(s.legal_hold,false)=false
        AND NOT EXISTS (SELECT 1 FROM featured_showcase_bookings b
          WHERE b.space_id=s.id AND b.status IN ('active','queued'))
        AND ($2='' OR s.title ILIKE $3 OR s.city ILIKE $3
          OR s.id::text ILIKE $3 OR COALESCE(s.category_label,'') ILIKE $3)
      ORDER BY s.created_at DESC,s.id DESC LIMIT $4 OFFSET $5`,
      [owner.rows[0].id,term,like,limit + 1,offset]);
    return {ok:true,ownerFound:true,ownerName:owner.rows[0].full_name,
      spaces:results.rows.slice(0,limit).map(row => ({
        id:row.id,title:row.title,city:row.city,category:row.category,
        categoryLabel:row.category_label || "",imageUrl:row.image_url || "",
        imageCount:Number(row.image_count || 0),
      })),hasMore:results.rows.length > limit};
  } finally { client.release(); }
}

async function addBooking(input, actorId) {
  const spaceId = String(input.spaceId || "");
  const ownerPhone = normalizeIranMobile(input.ownerPhone);
  if (!ownerPhone) fail("شماره حساب صاحب آگهی معتبر نیست.");
  const mode = input.paymentMode;
  const ref = String(input.paymentReference || "").trim().slice(0,140);
  const note = String(input.note || "").trim().slice(0,500);
  const amount = String(input.amountRials ?? "0");
  if (!uuidPattern.test(spaceId)) fail("شناسه آگهی معتبر نیست.");
  if (!["manual_verified", "complimentary"].includes(mode)) fail("روش ثبت جایگاه معتبر نیست.");
  if (!/^\d{1,15}$/.test(amount)) fail("مبلغ ریالی نامعتبر است.");
  if (mode === "manual_verified" && (!ref || BigInt(amount) <= 0n)) fail("برای پرداخت تأییدشده، شماره رسید و مبلغ لازم است.");
  if (mode === "complimentary" && (BigInt(amount) !== 0n || ref)) fail("جایگاه رایگان نباید شماره رسید یا مبلغ داشته باشد.");
  return withLockedState(async (client, settings) => {
    if (!settings.enabled) fail("ویترین ویژه غیرفعال است؛ ابتدا آن را از پنل مدیریت فعال کنید.",409);
    if (mode === "manual_verified" && BigInt(amount) < BigInt(settings.package_price_rials)) fail("مبلغ ثبت‌شده از نرخ مصوب جایگاه کمتر است.",409);
    const space = await client.query(`SELECT s.id,s.title FROM spaces s JOIN users u ON u.id=s.owner_id
      WHERE s.id=$1 AND u.phone=$2 AND s.status='active' AND s.listing_type='offer' AND COALESCE(s.legal_hold,false)=false AND u.is_active=true`,[spaceId,ownerPhone]);
    if (!space.rowCount) fail("فقط آگهی عرضه فعال متعلق به کاربر فعال قابل انتخاب است.",409);
    const exists = await client.query("SELECT 1 FROM featured_showcase_bookings WHERE space_id=$1 AND status IN ('active','queued')",[spaceId]);
    if (exists.rowCount) fail("این آگهی هم‌اکنون در ویترین یا صف آن است.",409);
    const live = await client.query("SELECT count(*)::integer AS count FROM featured_showcase_bookings WHERE status='active'");
    const waiting = await client.query("SELECT count(*)::integer AS count FROM featured_showcase_bookings WHERE status='queued'");
    const shouldQueue = live.rows[0].count >= settings.capacity || waiting.rows[0].count > 0;
    const id = randomUUID();
    await client.query(`INSERT INTO featured_showcase_bookings
      (id,space_id,status,payment_mode,payment_reference,amount_rials,note,created_by,activated_at,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,
      CASE WHEN $3='active' THEN NOW() ELSE NULL END,
      CASE WHEN $3='active' THEN NOW()+INTERVAL '72 hours' ELSE NULL END)`,
      [id,spaceId,shouldQueue ? "queued":"active",mode,ref || null,amount,note,actorId]);
    await client.query("INSERT INTO featured_showcase_audit(id,actor_id,booking_id,action,metadata) VALUES($1,$2,$3,'booking_created',$4::jsonb)",
      [randomUUID(),actorId,id,JSON.stringify({paymentMode:mode,amountRials:amount,reference:ref,status:shouldQueue?"queued":"active"})]);
    return {ok:true,id,status:shouldQueue?"queued":"active",durationHours:HOURS};
  });
}

async function cancelBooking(id, actorId) {
  if (!uuidPattern.test(id)) fail("شناسه جایگاه معتبر نیست.");
  return withLockedState(async (client) => {
    const update = await client.query(`UPDATE featured_showcase_bookings SET status='cancelled',updated_at=NOW()
      WHERE id=$1 AND status IN ('active','queued') RETURNING id`,[id]);
    if (!update.rowCount) fail("جایگاه فعال یا در صف پیدا نشد.",404);
    await client.query("INSERT INTO featured_showcase_audit(id,actor_id,booking_id,action) VALUES($1,$2,$3,'booking_cancelled')",[randomUUID(),actorId,id]);
    return {ok:true};
  });
}
module.exports = {
  lookupOwnerSpaces, rotationIndex, current, dashboard, updateSettings, addBooking, cancelBooking };
