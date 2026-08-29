const crypto = require("crypto");
const { query } = require("../db/pool");

let schemaPromise = null;

function ensureSmartSearchSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS smart_searches (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          raw_text TEXT NOT NULL,
          criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
          threshold INTEGER NOT NULL DEFAULT 70 CHECK (threshold BETWEEN 1 AND 100),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          best_seen_score INTEGER NOT NULL DEFAULT 0,
          last_notified_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_smart_searches_user_active
        ON smart_searches(user_id, is_active, created_at DESC)
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS smart_search_notifications (
          id UUID PRIMARY KEY,
          smart_search_id UUID NOT NULL REFERENCES smart_searches(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
          match_score INTEGER NOT NULL CHECK (match_score BETWEEN 0 AND 100),
          reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (smart_search_id, space_id)
        )
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_smart_notifications_user_read
        ON smart_search_notifications(user_id, is_read, created_at DESC)
      `);
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  return schemaPromise;
}

function normalizeText(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\u200c\u200d\u200e\u200f]/g, " ")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأٱآ]/g, "ا")
    .replace(/[َُِّْٰ]/g, "")
    .replace(/[،,؛;:_\-–—/\\()\[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePlace(value = "") {
  return normalizeText(value)
    .replace(/^(استان|شهرستان|شهر|بخش|منطقه)\s+/g, "")
    .replace(/\s+(استان|شهرستان|شهر)$/g, "")
    .trim();
}

function compactPlace(value = "") {
  return normalizePlace(value)
    .replace(/\b(استان|شهرستان|شهر|بخش|منطقه)\b/g, " ")
    .replace(/\s+/g, "");
}

function inferCityFromRawText(rawText = "") {
  const text = normalizeText(rawText);
  if (!text) return "";

  const patterns = [
    /(?:^|\s)در\s+([ا-ی][ا-ی\s]{1,60})$/,
    /(?:^|\s)توی\s+([ا-ی][ا-ی\s]{1,60})$/,
    /(?:^|\s)داخل\s+([ا-ی][ا-ی\s]{1,60})$/,
    /(?:^|\s)شهر\s+([ا-ی][ا-ی\s]{1,60})$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const city = normalizePlace(match[1]).trim();
    if (city.length >= 2) return city;
  }

  return "";
}

function sameCity(requestCity = "", offerCity = "", rawText = "") {
  const request = compactPlace(requestCity || inferCityFromRawText(rawText));
  const offer = compactPlace(offerCity);

  if (!request || !offer) return false;

  if (request === offer) return true;

  if (
    Math.min(request.length, offer.length) >= 4 &&
    (request.includes(offer) || offer.includes(request))
  ) {
    return true;
  }

  // حذف نام استان/پسوندهای رایج در صورت ذخیره‌شدن همراه شهر
  const provinceWords = [
    "گیلان","مازندران","گلستان","تهران","البرز","قزوین","زنجان","اردبیل",
    "اذربایجانشرقی","اذربایجانغربی","کردستان","کرمانشاه","همدان","مرکزی",
    "قم","اصفهان","یزد","کرمان","فارس","بوشهر","هرمزگان","خوزستان","ایلام",
    "لرستان","چهارمحالوبختیاری","کهگیلویهوبویراحمد","خراسانرضوی",
    "خراسانشمالی","خراسانجنوبی","سمنان","سیستانوبلوچستان"
  ];

  const stripProvince = (value) => {
    let result = value;
    for (const province of provinceWords) {
      result = result.replace(province, "");
    }
    return result;
  };

  const requestCore = stripProvince(request);
  const offerCore = stripProvince(offer);

  return (
    requestCore === offerCore ||
    (
      Math.min(requestCore.length, offerCore.length) >= 4 &&
      (requestCore.includes(offerCore) || offerCore.includes(requestCore))
    )
  );
}


const PRIMARY_CATEGORY_RULES = [
  { category: "villa", words: ["ویلا", "ویلای", "اقامتگاه"] },
  { category: "residential", words: ["آپارتمان", "خانه", "منزل", "مسکونی", "سوئیت", "پنت هاوس", "پنت‌هاوس"] },
  { category: "parking", words: ["پارکینگ", "جای پارک", "پارک خودرو"] },
  { category: "storage", words: ["انبار", "انباری"] },
  { category: "warehouse", words: ["سوله", "کارگاه", "صنعتی"] },
  { category: "shop", words: ["مغازه", "فروشگاه", "تجاری"] },
  { category: "land", words: ["قطعه زمین", "زمین"] },
];

function inferPrimaryCategory(rawText = "", fallback = "other") {
  const text = normalizeText(rawText);
  const candidates = [];

  for (const rule of PRIMARY_CATEGORY_RULES) {
    for (const word of rule.words) {
      const normalizedWord = normalizeText(word);
      const index = text.indexOf(normalizedWord);
      if (index >= 0) {
        candidates.push({ category: rule.category, index, length: normalizedWord.length });
      }
    }
  }

  candidates.sort((a, b) => a.index - b.index || b.length - a.length);
  return candidates[0]?.category || fallback || "other";
}

function withInferredCategory(criteria = {}, rawText = "") {
  const inferred = inferPrimaryCategory(rawText, criteria.category || "other");
  return inferred === criteria.category ? criteria : { ...criteria, category: inferred };
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const normalized = String(value || "")
    .replace(/[۰-۹]/g, (digit) => persian.indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => arabic.indexOf(digit))
    .replace(/[٬,]/g, "");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function getBedrooms(value = {}) {
  return Math.max(
    0,
    Number(
      value?.villaDetails?.bedrooms ??
        value?.villa_details?.bedrooms ??
        value?.residentialDetails?.bedrooms ??
        value?.residential_details?.bedrooms ??
        0
    ) || 0
  );
}

function scoreSmartCriteria(criteria = {}, offer = {}, rawText = "") {
  const requestCategory = String(criteria.category || "other");
  const offerCategory = String(offer.category || "other");

  if (requestCategory !== "other" && requestCategory !== offerCategory) {
    return { score: 0, reasons: [], eligible: false };
  }

  let score = 45;
  const reasons = ["نوع فضا مناسب"];

  const requestCity = normalizePlace(criteria.city) || inferCityFromRawText(rawText);
  const offerCity = normalizePlace(offer.city);
  const cityMatched = sameCity(requestCity, offerCity, rawText);
  if (offerCity) {
    if (cityMatched) {
      score += 30;
      reasons.push("شهر یکسان");
    } else if (requestCity) {
      score -= 10;
    }
  }

  const requestArea = toNumber(criteria.area);
  const offerArea = toNumber(offer.area);
  if (requestArea > 0 && offerArea > 0) {
    const diff = Math.abs(requestArea - offerArea) / Math.max(requestArea, 1);
    if (diff <= 0.25) {
      score += 10;
      reasons.push("متراژ نزدیک");
    } else if (diff <= 0.5) {
      score += 5;
      reasons.push("متراژ قابل قبول");
    } else {
      score -= 5;
    }
  }

  const budget = toNumber(criteria.price);
  const offerPrice = toNumber(offer.price);
  if (budget > 0 && offerPrice > 0) {
    if (offerPrice <= budget) {
      score += 10;
      reasons.push("در محدوده بودجه");
    } else if (offerPrice <= budget * 1.2) {
      score += 3;
      reasons.push("نزدیک به بودجه");
    } else {
      score -= 10;
    }
  }

  const requestBedrooms = getBedrooms(criteria);
  const offerBedrooms = getBedrooms(offer);
  if (requestBedrooms > 0 && offerBedrooms > 0) {
    if (offerBedrooms >= requestBedrooms) {
      score += 8;
      reasons.push("تعداد خواب مناسب");
    } else {
      score -= 5;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, reasons: [...new Set(reasons)], eligible: true };
}

async function createNotificationsForNewOffer(offer, ownerId) {
  try {
    await ensureSmartSearchSchema();
    if (!offer || (offer.listingType || offer.listing_type || "offer") === "wanted") return;
    if (offer.status && offer.status !== "active") return;

    const searches = await query(
      `SELECT id, user_id, raw_text, criteria, threshold, best_seen_score
       FROM smart_searches
       WHERE is_active = TRUE
         AND user_id <> $1`,
      [ownerId]
    );

    for (const saved of searches.rows) {
      const effectiveCriteria = withInferredCategory(saved.criteria || {}, saved.raw_text || "");
      const result = scoreSmartCriteria(effectiveCriteria, offer, saved.raw_text || "");
      if (!result.eligible || result.score < Number(saved.threshold || 70)) continue;

      const notificationId = crypto.randomUUID();
      const inserted = await query(
        `INSERT INTO smart_search_notifications
          (id, smart_search_id, user_id, space_id, match_score, reasons)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         ON CONFLICT (smart_search_id, space_id) DO NOTHING
         RETURNING id`,
        [
          notificationId,
          saved.id,
          saved.user_id,
          offer.id,
          result.score,
          JSON.stringify(result.reasons),
        ]
      );

      if (inserted.rowCount) {
        await query(
          `UPDATE smart_searches
           SET best_seen_score = GREATEST(best_seen_score, $2),
               last_notified_at = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [saved.id, result.score]
        );
      }
    }
  } catch (error) {
    // ثبت آگهی نباید به خاطر اعلان هوشمند شکست بخورد.
    console.error("Smart search notification error:", error);
  }
}


async function reconcileSmartSearchNotificationsForUser(userId) {
  await ensureSmartSearchSchema();

  const searches = await query(
    `SELECT id, user_id, raw_text, criteria, threshold, best_seen_score
     FROM smart_searches
     WHERE user_id=$1 AND is_active=TRUE`,
    [userId]
  );

  if (!searches.rows.length) return;

  const offers = await query(
    `SELECT id, listing_type, category, status, title, city, area, price,
            residential_details, villa_details, owner_id
     FROM spaces
     WHERE status='active'
       AND COALESCE(listing_type, 'offer') <> 'wanted'
       AND owner_id <> $1
     ORDER BY created_at DESC`,
    [userId]
  );

  for (const saved of searches.rows) {
    const originalCriteria = saved.criteria || {};
    let effectiveCriteria = withInferredCategory(originalCriteria, saved.raw_text || "");

    if (!normalizePlace(effectiveCriteria.city)) {
      const inferredCity = inferCityFromRawText(saved.raw_text || "");
      if (inferredCity) {
        effectiveCriteria = { ...effectiveCriteria, city: inferredCity };
      }
    }

    if (JSON.stringify(effectiveCriteria) !== JSON.stringify(originalCriteria)) {
      await query(
        `UPDATE smart_searches
         SET criteria=$2::jsonb, updated_at=NOW()
         WHERE id=$1`,
        [saved.id, JSON.stringify(effectiveCriteria)]
      );
    }

    for (const row of offers.rows) {
      const offer = {
        id: row.id,
        listingType: row.listing_type,
        category: row.category,
        status: row.status,
        title: row.title,
        city: row.city,
        area: Number(row.area || 0),
        price: row.price,
        residentialDetails: row.residential_details || {},
        villaDetails: row.villa_details || {},
      };

      const result = scoreSmartCriteria(effectiveCriteria, offer, saved.raw_text || "");

      if (!result.eligible || result.score < Number(saved.threshold || 70)) continue;

      const inserted = await query(
        `INSERT INTO smart_search_notifications
          (id, smart_search_id, user_id, space_id, match_score, reasons)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         ON CONFLICT (smart_search_id, space_id) DO NOTHING
         RETURNING id`,
        [
          crypto.randomUUID(),
          saved.id,
          saved.user_id,
          offer.id,
          result.score,
          JSON.stringify(result.reasons),
        ]
      );

      if (inserted.rowCount) {
        await query(
          `UPDATE smart_searches
           SET best_seen_score=GREATEST(best_seen_score,$2),
               last_notified_at=NOW(), updated_at=NOW()
           WHERE id=$1`,
          [saved.id, result.score]
        );
      }
    }
  }
}

module.exports = {
  ensureSmartSearchSchema,
  scoreSmartCriteria,
  createNotificationsForNewOffer,
  inferPrimaryCategory,
  inferCityFromRawText,
  withInferredCategory,
  reconcileSmartSearchNotificationsForUser,
};
