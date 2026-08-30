const crypto = require("crypto");
const { query } = require("../db/pool");
const { createNotificationsForNewOffer } = require("../services/smartSearch.service");

const MAX_IMAGES = 8;
const FIELDS = `id, listing_type, category, custom_category, category_label, status, title, city, area, price, price_type, phone, image_url, image_urls, residential_details, villa_details, description, agency_network_consent, owner_id, created_at, updated_at`;

let imageSchemaPromise = null;
function ensureImageSchema() {
  if (!imageSchemaPromise) {
    imageSchemaPromise = (async () => {
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS residential_details JSONB NOT NULL DEFAULT '{}'::jsonb`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS price_type VARCHAR(20) NOT NULL DEFAULT 'monthly'`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS villa_details JSONB NOT NULL DEFAULT '{}'::jsonb`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS agency_network_consent BOOLEAN NOT NULL DEFAULT FALSE`);

      // دیتابیس‌های قدیمی فضاجو دسته residential را در CHECK نداشتند.
      await query(`ALTER TABLE spaces DROP CONSTRAINT IF EXISTS spaces_category_check`);
      await query(`
        ALTER TABLE spaces
        ADD CONSTRAINT spaces_category_check
        CHECK (category IN ('parking','residential','villa','storage','warehouse','shop','land','other'))
      `);
      await query(`
        UPDATE spaces
        SET image_urls = jsonb_build_array(image_url)
        WHERE image_url IS NOT NULL
          AND BTRIM(image_url) <> ''
          AND (image_urls IS NULL OR image_urls = '[]'::jsonb)
      `);
    })().catch((error) => {
      imageSchemaPromise = null;
      throw error;
    });
  }
  return imageSchemaPromise;
}

function normalizeImages(value, fallback = "") {
  const source = Array.isArray(value) ? value : [];
  const cleaned = [];
  for (const item of source) {
    const url = String(item || "").trim().slice(0, 2000);
    if (url && !cleaned.includes(url)) cleaned.push(url);
    if (cleaned.length >= MAX_IMAGES) break;
  }
  const oldUrl = String(fallback || "").trim().slice(0, 2000);
  if (!cleaned.length && oldUrl) cleaned.push(oldUrl);
  return cleaned;
}

function mapSpace(row) {
  const imageUrls = normalizeImages(row.image_urls, row.image_url);
  return {
    id: row.id,
    listingType: row.listing_type,
    category: row.category,
    customCategory: row.custom_category || "",
    categoryLabel: row.category_label || "",
    status: row.status,
    title: row.title,
    city: row.city,
    area: Number(row.area || 0),
    price: row.price,
    priceType: row.price_type || "monthly",
    phone: row.phone,
    imageUrl: imageUrls[0] || "",
    imageUrls,
    residentialDetails: row.residential_details || {},
    villaDetails: row.villa_details || {},
    description: row.description || "",
    agencyNetworkConsent: Boolean(row.agency_network_consent),
    ownerIsApprovedAgent: Boolean(row.owner_is_approved_agent),
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clean(body = {}) {
  const imageUrls = normalizeImages(body.imageUrls, body.imageUrl);
  return {
    listingType: body.listingType === "wanted" ? "wanted" : "offer",
    category: ["parking", "residential", "villa", "storage", "warehouse", "shop", "land", "other"].includes(body.category) ? body.category : "parking",
    customCategory: String(body.customCategory || "").trim().slice(0, 80),
    categoryLabel: String(body.categoryLabel || "").trim().slice(0, 80),
    status: ["active", "inactive", "rented"].includes(body.status) ? body.status : "active",
    title: String(body.title || "").trim().slice(0, 160),
    city: String(body.city || "").trim().slice(0, 100),
    area: Math.max(0, Number(body.area) || 0),
    price: String(body.price || "").trim().slice(0, 100),
    priceType: ["daily", "monthly", "yearly", "negotiable"].includes(body.priceType) ? body.priceType : "monthly",
    phone: String(body.phone || "").replace(/\s/g, "").slice(0, 20),
    imageUrl: imageUrls[0] || "",
    imageUrls,
    residentialDetails: body.category === "residential" && body.residentialDetails && typeof body.residentialDetails === "object"
      ? {
          propertyType: ["apartment","house","villa","suite","penthouse","other"].includes(body.residentialDetails.propertyType) ? body.residentialDetails.propertyType : "apartment",
          deposit: Math.max(0, Number(body.residentialDetails.deposit) || 0),
          monthlyRent: Math.max(0, Number(body.residentialDetails.monthlyRent) || 0),
          bedrooms: Math.max(0, Math.min(20, Number(body.residentialDetails.bedrooms) || 0)),
          floor: String(body.residentialDetails.floor || "").trim().slice(0, 30),
          totalFloors: Math.max(0, Math.min(100, Number(body.residentialDetails.totalFloors) || 0)),
          unitsPerFloor: Math.max(0, Math.min(50, Number(body.residentialDetails.unitsPerFloor) || 0)),
          buildYear: Math.max(0, Math.min(2100, Number(body.residentialDetails.buildYear) || 0)),
          elevator: Boolean(body.residentialDetails.elevator),
          parking: Boolean(body.residentialDetails.parking),
          storage: Boolean(body.residentialDetails.storage),
          furnished: Boolean(body.residentialDetails.furnished),
          balcony: Boolean(body.residentialDetails.balcony),
          renovated: Boolean(body.residentialDetails.renovated),
          convertible: Boolean(body.residentialDetails.convertible),
        }
      : {},
    villaDetails:
      body.category === "villa" &&
      body.villaDetails &&
      typeof body.villaDetails === "object"
        ? {
            bedrooms: Math.max(0, Math.min(30, Number(body.villaDetails.bedrooms) || 0)),
            capacity: Math.max(0, Math.min(100, Number(body.villaDetails.capacity) || 0)),
            extraGuestPrice: Math.max(0, Number(body.villaDetails.extraGuestPrice) || 0),
            distanceToSea: String(body.villaDetails.distanceToSea || "").trim().slice(0, 120),
            distanceToForest: String(body.villaDetails.distanceToForest || "").trim().slice(0, 120),
            checkInTime: String(body.villaDetails.checkInTime || "").trim().slice(0, 10),
            checkOutTime: String(body.villaDetails.checkOutTime || "").trim().slice(0, 10),
            houseRules: String(body.villaDetails.houseRules || "").trim().slice(0, 2000),
            pool: Boolean(body.villaDetails.pool),
            heatedPool: Boolean(body.villaDetails.heatedPool),
            parking: Boolean(body.villaDetails.parking),
            yard: Boolean(body.villaDetails.yard),
            furnished: Boolean(body.villaDetails.furnished),
            barbecue: Boolean(body.villaDetails.barbecue),
            airConditioning: Boolean(body.villaDetails.airConditioning),
            heating: Boolean(body.villaDetails.heating),
            wifi: Boolean(body.villaDetails.wifi),
            petFriendly: Boolean(body.villaDetails.petFriendly),
          }
        : {},
    description: String(body.description || "").trim().slice(0, 5000),
    agencyNetworkConsent: body.agencyNetworkConsent === true,
  };
}

function validate(space) {
  if (!space.title) return "عنوان آگهی لازم است.";
  if (!space.city) return "شهر لازم است.";
  if (space.category === "residential") {
    if (!space.residentialDetails.deposit && !space.residentialDetails.monthlyRent) return "مبلغ رهن یا اجاره را وارد کنید.";
  } else if (!space.price) return "قیمت لازم است.";
  if (!/^09\d{9}$/.test(space.phone)) return "شماره موبایل معتبر نیست.";
  if (space.description.length < 10) return "توضیحات باید حداقل ۱۰ کاراکتر باشد.";
  if (space.imageUrls.length > MAX_IMAGES) return `حداکثر ${MAX_IMAGES} عکس برای هر آگهی مجاز است.`;
  if (space.listingType !== "wanted" && space.imageUrls.length === 0) return "حداقل یک تصویر برای آگهی لازم است.";
  return "";
}

async function list(req, res) {
  try {
    await ensureImageSchema();
    const result = await query(`
      SELECT s.*,
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = s.owner_id
            AND u.is_active = TRUE
            AND u.account_type = 'agent'
            AND u.agency_status = 'approved'
        ) AS owner_is_approved_agent
      FROM spaces s
      WHERE s.status <> 'inactive'
      ORDER BY s.created_at DESC
    `);
    return res.json({ ok: true, spaces: result.rows.map(mapSpace) });
  } catch (error) {
    console.error("List spaces error:", error);
    return res.status(500).json({ ok: false, message: "دریافت آگهی‌ها انجام نشد." });
  }
}

async function getOne(req, res) {
  try {
    await ensureImageSchema();
    const result = await query(`
      SELECT s.*,
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = s.owner_id
            AND u.is_active = TRUE
            AND u.account_type = 'agent'
            AND u.agency_status = 'approved'
        ) AS owner_is_approved_agent
      FROM spaces s WHERE s.id=$1 LIMIT 1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ ok: false, message: "آگهی پیدا نشد." });
    return res.json({ ok: true, space: mapSpace(result.rows[0]) });
  } catch (error) {
    console.error("Get space error:", error);
    return res.status(500).json({ ok: false, message: "دریافت آگهی انجام نشد." });
  }
}

async function mine(req, res) {
  try {
    await ensureImageSchema();
    const result = await query(`SELECT ${FIELDS} FROM spaces WHERE owner_id=$1 ORDER BY created_at DESC`, [req.user.id]);
    return res.json({ ok: true, spaces: result.rows.map(mapSpace) });
  } catch (error) {
    console.error("Mine spaces error:", error);
    return res.status(500).json({ ok: false, message: "دریافت آگهی‌های شما انجام نشد." });
  }
}

async function create(req, res) {
  try {
    await ensureImageSchema();
    const space = clean(req.body);
    const error = validate(space);
    if (error) return res.status(400).json({ ok: false, message: error });
    const id = crypto.randomUUID();
    const result = await query(
      `INSERT INTO spaces (id,listing_type,category,custom_category,category_label,status,title,city,area,price,price_type,phone,image_url,image_urls,residential_details,villa_details,description,agency_network_consent,owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb,$17,$18,$19)
       RETURNING ${FIELDS}`,
      [id, space.listingType, space.category, space.customCategory, space.categoryLabel, space.status, space.title, space.city, space.area, space.price, space.priceType, space.phone, space.imageUrl, JSON.stringify(space.imageUrls), JSON.stringify(space.residentialDetails), JSON.stringify(space.villaDetails), space.description, space.agencyNetworkConsent, req.user.id]
    );
    const createdSpace = mapSpace(result.rows[0]);
    createNotificationsForNewOffer(createdSpace, req.user.id);
    return res.status(201).json({ ok: true, message: "آگهی با موفقیت ثبت شد.", space: createdSpace });
  } catch (error) {
    console.error("Create space error:", error);
    return res.status(500).json({ ok: false, message: "ثبت آگهی انجام نشد." });
  }
}

async function update(req, res) {
  try {
    await ensureImageSchema();
    const existing = await query(`SELECT ${FIELDS} FROM spaces WHERE id=$1 LIMIT 1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ ok: false, message: "آگهی پیدا نشد." });
    if (existing.rows[0].owner_id !== req.user.id && req.user.system_role !== "admin") {
      return res.status(403).json({ ok: false, message: "اجازه ویرایش این آگهی را ندارید." });
    }
    const merged = clean({ ...mapSpace(existing.rows[0]), ...req.body });
    const error = validate(merged);
    if (error) return res.status(400).json({ ok: false, message: error });
    const result = await query(
      `UPDATE spaces SET listing_type=$2,category=$3,custom_category=$4,category_label=$5,status=$6,title=$7,city=$8,area=$9,price=$10,price_type=$11,phone=$12,image_url=$13,image_urls=$14::jsonb,residential_details=$15::jsonb,villa_details=$16::jsonb,description=$17,agency_network_consent=$18,updated_at=NOW()
       WHERE id=$1 RETURNING ${FIELDS}`,
      [req.params.id, merged.listingType, merged.category, merged.customCategory, merged.categoryLabel, merged.status, merged.title, merged.city, merged.area, merged.price, merged.priceType, merged.phone, merged.imageUrl, JSON.stringify(merged.imageUrls), JSON.stringify(merged.residentialDetails), JSON.stringify(merged.villaDetails), merged.description, merged.agencyNetworkConsent]
    );
    return res.json({ ok: true, message: "آگهی ویرایش شد.", space: mapSpace(result.rows[0]) });
  } catch (error) {
    console.error("Update space error:", error);
    return res.status(500).json({ ok: false, message: "ویرایش آگهی انجام نشد." });
  }
}

async function remove(req, res) {
  try {
    await ensureImageSchema();
    const result = await query(`DELETE FROM spaces WHERE id=$1 AND (owner_id=$2 OR $3='admin') RETURNING id`, [req.params.id, req.user.id, req.user.system_role]);
    if (!result.rowCount) return res.status(404).json({ ok: false, message: "آگهی پیدا نشد یا اجازه حذف ندارید." });
    return res.json({ ok: true, message: "آگهی حذف شد." });
  } catch (error) {
    console.error("Remove space error:", error);
    return res.status(500).json({ ok: false, message: "حذف آگهی انجام نشد." });
  }
}

module.exports = { list, getOne, mine, create, update, remove };
