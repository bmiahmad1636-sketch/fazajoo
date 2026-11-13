const crypto = require("crypto");
const { query } = require("../db/pool");
const { createNotificationsForNewOffer } = require("../services/smartSearch.service");
const { recordContactReveal } = require("../services/securityMonitoring.service");
const storage = require("../services/storage.service");
const { cleanParkingSpaceAttributes } = require("../utils/parkingSpaceAttributes");
const { validateParkingFinance, parkingFinancePrice, readWantedParkingFinance } = require("../utils/parkingRentalFinance");
const { validateStorageFinance, storageFinancePrice, readWantedStorageFinance } = require("../utils/storageRentalFinance");
const { cleanStorageSpaceAttributes } = require("../utils/storageSpaceAttributes");
const { cleanIndustrialSpaceAttributes } = require("../utils/industrialSpaceAttributes");
const { cleanLandSpaceAttributes } = require("../utils/landSpaceAttributes");
const { cleanShopSpaceAttributes } = require("../utils/shopSpaceAttributes");
const { cleanGardenSpaceAttributes } = require("../utils/gardenSpaceAttributes");
const { cleanResidentialSpaceAttributes } = require("../utils/residentialSpaceAttributes");
const { cleanVillaSpaceAttributes } = require("../utils/villaSpaceAttributes");
const { cleanOtherSpaceAttributes } = require("../utils/otherSpaceAttributes");

const MAX_IMAGES = 10;
const HEATING_SYSTEMS = ["gasHeater", "packageRadiator", "centralHeating", "floorHeating", "electricHeater", "splitHeating"];
const COOLING_SYSTEMS = ["waterCooler", "split", "ductSplit", "centralCooling", "fan"];
function cleanSystems(value, allowed) {
  return Array.isArray(value) ? [...new Set(value.filter(item => typeof item === "string" && allowed.includes(item)))].slice(0, allowed.length) : [];
}
const FIELDS = `id, listing_type, category, custom_category, category_label, status, title, city, area, price, price_type, phone, image_url, image_urls, residential_details, villa_details, garden_details, shop_details, space_attributes, description, agency_network_consent, location_lat, location_lng, media_items, legal_hold, owner_id, created_at, updated_at`;

let imageSchemaPromise = null;
function ensureImageSchema() {
  if (!imageSchemaPromise) {
    imageSchemaPromise = (async () => {
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS residential_details JSONB NOT NULL DEFAULT '{}'::jsonb`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS price_type VARCHAR(20) NOT NULL DEFAULT 'monthly'`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS villa_details JSONB NOT NULL DEFAULT '{}'::jsonb`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS garden_details JSONB NOT NULL DEFAULT '{}'::jsonb`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS shop_details JSONB NOT NULL DEFAULT '{}'::jsonb`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS space_attributes JSONB NOT NULL DEFAULT '{}'::jsonb`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS agency_network_consent BOOLEAN NOT NULL DEFAULT FALSE`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS location_lat NUMERIC(9,6)`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS location_lng NUMERIC(9,6)`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS media_items JSONB NOT NULL DEFAULT '[]'::jsonb`);
      await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT FALSE`);

      // دیتابیس‌های قدیمی فضاجو دسته residential را در CHECK نداشتند.
      await query(`ALTER TABLE spaces DROP CONSTRAINT IF EXISTS spaces_category_check`);
      await query(`
        ALTER TABLE spaces
        ADD CONSTRAINT spaces_category_check
        CHECK (category IN ('parking','residential','villa','storage','warehouse','shop','land','garden','other'))
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

function normalizeVideo(value) {
  if (!value || typeof value !== "object") return null;
  const url = String(value.url || "").trim().slice(0, 2000);
  if (!url) return null;
  const mimeType = ["video/mp4","video/quicktime","video/webm"].includes(value.mimeType) ? value.mimeType : "video/mp4";
  const size = Math.max(0, Math.min(100 * 1024 * 1024, Number(value.size) || 0));
  const duration = Math.max(0, Math.min(120.5, Number(value.duration) || 0));
  return {
    type: "video",
    url,
    key: String(value.key || "").trim().slice(0, 500),
    posterUrl: String(value.posterUrl || "").trim().slice(0, 2000),
    mimeType,
    size,
    duration,
    status: ["ready","blocked","processing","failed"].includes(value.status) ? value.status : "ready",
    createdAt: value.createdAt || new Date().toISOString(),
  };
}

function videoFromMedia(items) {
  if (!Array.isArray(items)) return null;
  const item = items.find((entry) => entry && entry.type === "video");
  return item ? normalizeVideo(item) : null;
}


function isVideoOwnedByUser(video, userId) {
  if (!video) return true;
  try {
    const parsed = new URL(video.url, "http://fazajoo.local");
    const marker = "/api/uploads/ad-video/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return false;
    const parts = parsed.pathname.slice(index + marker.length).split("/").filter(Boolean).map(decodeURIComponent);
    return parts.length === 2 && parts[0] === String(userId);
  } catch { return false; }
}

function mapSpace(row, { includePhone = false, includeExactLocation = false, includeModeratedMedia = false } = {}) {
  const imageUrls = normalizeImages(row.image_urls, row.image_url);
  const storedMainImage = String(row.image_url || "").trim();
  const imageUrl = storedMainImage && imageUrls.includes(storedMainImage)
    ? storedMainImage
    : (imageUrls[0] || "");
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
    ...(includePhone ? { phone: row.phone } : {}),
    imageUrl,
    imageUrls,
    video: (() => { const v = videoFromMedia(row.media_items); return v && (v.status === "ready" || includeModeratedMedia) ? v : null; })(),
    videoModerationStatus: videoFromMedia(row.media_items)?.status || null,
    residentialDetails: row.residential_details || {},
    villaDetails: row.villa_details || {},
    gardenDetails: row.garden_details || {},
    shopDetails: row.shop_details || {},
    spaceAttributes: row.space_attributes || {},
    description: row.description || "",
    agencyNetworkConsent: Boolean(row.agency_network_consent),
    ...(row.location_lat != null && row.location_lng != null
      ? {
          location: includeExactLocation
            ? { lat: Number(row.location_lat), lng: Number(row.location_lng), approximate: false }
            : { lat: Number(Number(row.location_lat).toFixed(2)), lng: Number(Number(row.location_lng).toFixed(2)), approximate: true },
        }
      : { location: null }),
    ownerIsApprovedAgent: Boolean(row.owner_is_approved_agent),
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clean(body = {}) {
  const imageUrls = normalizeImages(body.imageUrls, body.imageUrl);
  const requestedMainImage = String(body.imageUrl || "").trim().slice(0, 2000);
  const imageUrl = requestedMainImage && imageUrls.includes(requestedMainImage)
    ? requestedMainImage
    : (imageUrls[0] || "");
  const video = normalizeVideo(body.video);
  const mediaItems = video ? [video] : [];
  // A typed commercial offer has one authoritative financial interpretation.
  // Do not permit a forged generic "monthly price" to represent key money/deposit.
  const typedParking = body.category === "parking" && body.listingType !== "wanted"
    ? cleanParkingSpaceAttributes(body.spaceAttributes, "parking", "offer") : null;
  const wantedParking = body.category === "parking" && body.listingType === "wanted"
    ? readWantedParkingFinance(body.description) : null;
  const derivedParkingPrice = typedParking?.schemaVersion === 1
    ? parkingFinancePrice(typedParking.values, false) : wantedParking
      ? parkingFinancePrice(wantedParking, true) : null;
  const typedStorage = body.category === "storage" && body.listingType !== "wanted"
    ? cleanStorageSpaceAttributes(body.spaceAttributes,"storage","offer") : null;
  const wantedStorage = body.category === "storage" && body.listingType === "wanted"
    ? readWantedStorageFinance(body.description) : null;
  const derivedStoragePrice = typedStorage?.schemaVersion === 1
    ? storageFinancePrice(typedStorage.values,false) : wantedStorage
      ? storageFinancePrice(wantedStorage,true) : null;
  const typedShop = body.category === "shop" && body.listingType !== "wanted"
    ? cleanShopSpaceAttributes(body.spaceAttributes, "shop", "offer") : null;
  const shopRent = typedShop?.values?.transferType === "rent" ? typedShop.values.monthlyRentRial : null;
  const typedGarden = body.category === "garden" && body.listingType !== "wanted"
    ? cleanGardenSpaceAttributes(body.spaceAttributes,"garden","offer") : null;
  const gardenValues=typedGarden?.schemaVersion===1?typedGarden.values:null;
  const typedGardenRent=gardenValues?.rentalTerm==="short"?gardenValues.shortRateRial:gardenValues?.rentalTerm==="long"&&gardenValues.financialMode!=="full_deposit"?gardenValues.longMonthlyRentRial:null;
  const typedGardenPeriod=gardenValues?.rentalTerm==="short"?gardenValues.shortRateUnit:gardenValues?.rentalTerm==="long"&&typedGardenRent?"monthly":null;
  const fullDepositGarden = gardenValues?.financialMode === "full_deposit" && gardenValues.rentalTerm!=="short"&&gardenValues.rentalTerm!=="seasonal";
  const typedResidential = body.category === "residential" && body.listingType !== "wanted"
    ? cleanResidentialSpaceAttributes(body.spaceAttributes, "residential", "offer") : null;
  const residentialMode = typedResidential?.values?.financialMode;
  const shortResidential = typedResidential?.values?.rentalTerm === "short";
  const residentialShortRate = shortResidential ? typedResidential.values.shortRateRial : null;
  const residentialShortPriceType = shortResidential
    ? ({night:"daily",week:"weekly",month:"monthly"})[typedResidential.values.shortRateUnit] : null;
  const typedVilla = body.category === "villa" && body.listingType !== "wanted"
    ? cleanVillaSpaceAttributes(body.spaceAttributes,"villa","offer",body.villaDetails) : null;
  const typedOther=body.category === "other" && body.listingType !== "wanted"
    ? cleanOtherSpaceAttributes(body.spaceAttributes,"other","offer") : null;
  const otherValues=typedOther?.schemaVersion===1 ? typedOther.values : null;
  const otherLongRent=otherValues?.rentalTerm==="long"&&otherValues.financialMode!=="full_deposit" ? otherValues.longMonthlyRentRial : null;
  const otherShortRent=otherValues?.rentalTerm==="short" ? otherValues.shortRateRial : null;
  const longVilla = typedVilla?.values?.rentalTerm === "long";
  const longVillaRent = longVilla && typedVilla.values.financialMode !== "full_deposit"
    ? typedVilla.values.longMonthlyRentRial : null;
  // Monthly rent and one-off deposit must never share a generic price.
  const cleanResidentialMoney = (v) => {
    if (v === null || v === undefined || v === "" || typeof v === "boolean") return 0;
    const text = String(v).replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
      .replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g, "");
    if (!/^\d{1,15}$/.test(text)) return 0;
    const n = Number(text);
    return Number.isSafeInteger(n) && n > 0 ? n : 0;
  };
  const requestedResidentialRent = cleanResidentialMoney(body.residentialDetails?.monthlyRent);
  const residentialRent = residentialMode === "full_deposit" ? 0 : requestedResidentialRent;
  return {
    listingType: body.listingType === "wanted" ? "wanted" : "offer",
    category: ["parking", "residential", "villa", "storage", "warehouse", "shop", "land", "garden", "other"].includes(body.category) ? body.category : "parking",
    customCategory: String(body.customCategory || "").trim().slice(0, 80),
    categoryLabel: String(body.categoryLabel || "").trim().slice(0, 80),
    status: ["active", "inactive", "rented"].includes(body.status) ? body.status : "active",
    title: String(body.title || "").trim().slice(0, 160),
    city: String(body.city || "").trim().slice(0, 100),
    area: Math.max(0, Number(body.area) || 0),
    price: derivedParkingPrice ? derivedParkingPrice.price : derivedStoragePrice ? derivedStoragePrice.price : typedShop?.schemaVersion === 1 ? (shopRent ? String(shopRent) : "") : typedResidential?.schemaVersion === 1 ? (shortResidential ? (residentialShortRate ? String(residentialShortRate) : "") : (residentialRent ? String(residentialRent) : "")) : otherValues ? (otherValues.rentalTerm==="short" ? (otherShortRent ? String(otherShortRent) : "") : (otherLongRent ? String(otherLongRent) : "")) : longVilla ? (longVillaRent ? String(longVillaRent) : "") : gardenValues?.rentalTerm ? (typedGardenRent ? String(typedGardenRent) : "") : fullDepositGarden ? "" : String(body.price || "").trim().slice(0, 100),
    priceType: derivedParkingPrice ? derivedParkingPrice.priceType : derivedStoragePrice ? derivedStoragePrice.priceType : typedShop?.schemaVersion === 1 ? (shopRent ? "monthly" : "negotiable") : typedResidential?.schemaVersion === 1 ? (shortResidential ? (residentialShortRate && residentialShortPriceType ? residentialShortPriceType : "negotiable") : (residentialRent ? "monthly" : "negotiable")) : otherValues ? (otherValues.rentalTerm==="short" ? (otherShortRent && ["daily","weekly","monthly"].includes(otherValues.shortRateUnit) ? otherValues.shortRateUnit : "negotiable") : (otherLongRent ? "monthly" : "negotiable")) : longVilla ? (longVillaRent ? "monthly" : "negotiable") : gardenValues?.rentalTerm ? (typedGardenRent && typedGardenPeriod ? typedGardenPeriod : "negotiable") : fullDepositGarden ? "negotiable" : (["daily", "weekly", "monthly", "yearly", "negotiable"].includes(body.priceType) ? body.priceType : "monthly"),
    phone: String(body.phone || "").replace(/\s/g, "").slice(0, 20),
    imageUrl,
    imageUrls,
    video,
    mediaItems,
    residentialDetails: body.category === "residential" && body.residentialDetails && typeof body.residentialDetails === "object"
      ? {
          propertyType: ["apartment","house","villa","suite","penthouse","room","other"].includes(body.residentialDetails.propertyType) ? body.residentialDetails.propertyType : "apartment",
          deposit: typedResidential?.schemaVersion === 1 ? (shortResidential || residentialMode === "rent_only" ? 0 : cleanResidentialMoney(body.residentialDetails.deposit)) : Math.max(0, Number(body.residentialDetails.deposit) || 0),
          monthlyRent: typedResidential?.schemaVersion === 1 ? (shortResidential ? 0 : residentialRent) : Math.max(0, Number(body.residentialDetails.monthlyRent) || 0),
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
          roofGarden: Boolean(body.residentialDetails.roofGarden),
          renovated: Boolean(body.residentialDetails.renovated),
          convertible: Boolean(body.residentialDetails.convertible),
          buildingUse: ["single", "multiple"].includes(body.residentialDetails.buildingUse) ? body.residentialDetails.buildingUse : "",
          heatingSystems: cleanSystems(body.residentialDetails.heatingSystems, HEATING_SYSTEMS),
          coolingSystems: cleanSystems(body.residentialDetails.coolingSystems, COOLING_SYSTEMS),
        }
      : {},
    villaDetails:
      body.category === "villa" &&
      body.villaDetails &&
      typeof body.villaDetails === "object"
        ? {
            bedrooms: Math.max(0, Math.min(30, Number(body.villaDetails.bedrooms) || 0)),
            capacity: Math.max(0, Math.min(100, Number(body.villaDetails.capacity) || 0)),
            extraGuestPrice: longVilla ? 0 : Math.max(0, Number(body.villaDetails.extraGuestPrice) || 0),
            distanceToSea: String(body.villaDetails.distanceToSea || "").trim().slice(0, 120),
            distanceToForest: String(body.villaDetails.distanceToForest || "").trim().slice(0, 120),
            checkInTime: longVilla ? "" : String(body.villaDetails.checkInTime || "").trim().slice(0, 10),
            checkOutTime: longVilla ? "" : String(body.villaDetails.checkOutTime || "").trim().slice(0, 10),
            houseRules: String(body.villaDetails.houseRules || "").trim().slice(0, 2000),
            pool: Boolean(body.villaDetails.pool),
            heatedPool: Boolean(body.villaDetails.heatedPool),
            parking: Boolean(body.villaDetails.parking),
            yard: Boolean(body.villaDetails.yard),
            furnished: Boolean(body.villaDetails.furnished),
            heatingSystems: cleanSystems(body.villaDetails.heatingSystems, HEATING_SYSTEMS),
            coolingSystems: cleanSystems(body.villaDetails.coolingSystems, COOLING_SYSTEMS),
            barbecue: Boolean(body.villaDetails.barbecue),
            airConditioning: Boolean(body.villaDetails.airConditioning),
            heating: Boolean(body.villaDetails.heating),
            wifi: Boolean(body.villaDetails.wifi),
            petFriendly: Boolean(body.villaDetails.petFriendly),
          }
        : {},
    gardenDetails: body.category === "garden" && body.gardenDetails && typeof body.gardenDetails === "object" && !Array.isArray(body.gardenDetails)
      ? {
          trees: String(body.gardenDetails.trees || "").trim().slice(0, 160),
          waterSource: ["well", "canal", "network", "share", "none"].includes(body.gardenDetails.waterSource) ? body.gardenDetails.waterSource : "",
          irrigation: ["drip", "flood", "sprinkler", "other"].includes(body.gardenDetails.irrigation) ? body.gardenDetails.irrigation : "",
          accessRoad: String(body.gardenDetails.accessRoad || "").trim().slice(0, 120),
          water: body.gardenDetails.water === true,
          electricity: body.gardenDetails.electricity === true,
          fenced: body.gardenDetails.fenced === true,
          building: body.gardenDetails.building === true,
          cityGas: body.gardenDetails.cityGas === true,
          landline: body.gardenDetails.landline === true,
          furnished: body.gardenDetails.building === true && body.gardenDetails.furnished === true,
          heatingSystems: body.gardenDetails.building === true ? cleanSystems(body.gardenDetails.heatingSystems, HEATING_SYSTEMS) : [],
          coolingSystems: body.gardenDetails.building === true ? cleanSystems(body.gardenDetails.coolingSystems, COOLING_SYSTEMS) : [],
        } : {},
    shopDetails: body.category === "shop" && body.shopDetails && typeof body.shopDetails === "object" && !Array.isArray(body.shopDetails)
      ? {
          waterSupply: ["independent", "shared", "none"].includes(body.shopDetails.waterSupply) ? body.shopDetails.waterSupply : "",
          electricitySupply: ["independent", "shared", "none"].includes(body.shopDetails.electricitySupply) ? body.shopDetails.electricitySupply : "",
          threePhase: body.shopDetails.threePhase === true,
          cityGas: body.shopDetails.cityGas === true,
          landline: body.shopDetails.landline === true,
          restroom: body.shopDetails.restroom === true,
          heatingSystems: cleanSystems(body.shopDetails.heatingSystems, HEATING_SYSTEMS),
          coolingSystems: cleanSystems(body.shopDetails.coolingSystems, COOLING_SYSTEMS),
        } : {},
    spaceAttributes: body.category === "residential" ? (typedResidential || cleanResidentialSpaceAttributes(body.spaceAttributes, "residential", "wanted")) : body.category === "villa" ? (typedVilla || cleanVillaSpaceAttributes(body.spaceAttributes,"villa","wanted",body.villaDetails)) : body.category === "storage" ? (typedStorage || cleanStorageSpaceAttributes(body.spaceAttributes, body.category, body.listingType === "wanted" ? "wanted" : "offer")) : body.category === "warehouse" ? cleanIndustrialSpaceAttributes(body.spaceAttributes, body.category, body.listingType === "wanted" ? "wanted" : "offer") : body.category === "land" ? cleanLandSpaceAttributes(body.spaceAttributes, body.category, body.listingType === "wanted" ? "wanted" : "offer") : body.category === "shop" ? (typedShop || cleanShopSpaceAttributes(body.spaceAttributes, body.category, "wanted")) : body.category === "garden" ? (typedGarden || cleanGardenSpaceAttributes(body.spaceAttributes, body.category, "wanted")) : body.category === "other" ? (typedOther || cleanOtherSpaceAttributes(body.spaceAttributes,"other",body.listingType==="wanted"?"wanted":"offer")) : cleanParkingSpaceAttributes(body.spaceAttributes, body.category, body.listingType === "wanted" ? "wanted" : "offer"),
    description: String(body.description || "").trim().slice(0, 5000),
    agencyNetworkConsent: body.agencyNetworkConsent === true,
    locationLat: Number.isFinite(Number(body.location?.lat)) && Number(body.location.lat) >= 24 && Number(body.location.lat) <= 40
      ? Number(Number(body.location.lat).toFixed(6)) : null,
    locationLng: Number.isFinite(Number(body.location?.lng)) && Number(body.location.lng) >= 43 && Number(body.location.lng) <= 64
      ? Number(Number(body.location.lng).toFixed(6)) : null,
  };
}

/** Verify wanted-short-term metadata agrees with the canonical budget, without trusting a free-text claim. */
function residentialWantedShortBudget(description = "") {
  const match = String(description).match(/^\[FAZAJOO_RESIDENTIAL_REQUEST:([^\]\n]+)\]/);
  if (!match) return null;
  try {
    const v = JSON.parse(decodeURIComponent(match[1]));
    if (!v || typeof v !== "object" || Array.isArray(v) || v.rentalTerm !== "short") return null;
    const unit = ({night:"daily",week:"weekly",month:"monthly"})[v.shortRateUnit];
    const digits = String(v.shortMaxBudgetRial || "").replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
      .replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g, "");
    if (!unit || !/^\d{1,15}$/.test(digits) || !Number.isSafeInteger(Number(digits)) || Number(digits)<=0) return null;
    return {price:digits,priceType:unit};
  } catch { return null; }
}
function validate(space) {
  // Parking offers/requests are now new structured contracts. No legacy migration.
  // Validate after sanitization and use backend-derived generic price, never trust sent price.
  if (space.category === "parking" && (space.listingType === "wanted" || space.spaceAttributes?.category === "parking")) {
    if (space.listingType === "offer") {
      if (space.spaceAttributes?.category !== "parking" || space.spaceAttributes?.schemaVersion !== 1)
        return "مشخصات تخصصی پارکینگ لازم است.";
      const v = space.spaceAttributes.values || {};
      const err = validateParkingFinance(v, false);
      if (err) return err;
      const summary = parkingFinancePrice(v, false);
      if (summary.price !== space.price || summary.priceType !== space.priceType)
        return "قیمت عمومی پارکینگ با قرارداد تطابق ندارد.";
    } else {
      const v = readWantedParkingFinance(space.description);
      if (!v) return "مشخصات مالی درخواست پارکینگ لازم است.";
      const err = validateParkingFinance(v, true);
      if (err) return err;
      const summary = parkingFinancePrice(v, true);
      if (summary.price !== space.price || summary.priceType !== space.priceType)
        return "بودجه درخواست پارکینگ با قرارداد تطابق ندارد.";
    }
  }
  // F5-02: new warehouse-storage listings must use one typed RT-00 contract.
  // Generic price and priceType are DERIVED server-side; do not trust the browser.
  if (space.category === "storage") {
    const values = space.listingType === "wanted"
      ? readWantedStorageFinance(space.description)
      : space.spaceAttributes?.schemaVersion === 1 && space.spaceAttributes?.category === "storage"
        ? space.spaceAttributes.values : null;
    if (!values) return "اطلاعات تخصصی قرارداد انبار لازم است.";
    const err=validateStorageFinance(values,space.listingType==="wanted");
    if(err)return err;
    const expected=storageFinancePrice(values,space.listingType==="wanted");
    if(expected.price!==space.price||expected.priceType!==space.priceType)
      return "مبلغ عمومی انبار با قرارداد تخصصی همخوانی ندارد.";
  }
  // Preserve other established categories and their contracts.
  if (space.listingType === "offer" && space.category === "parking" && space.spaceAttributes?.schemaVersion === 1) {
    const data = space.spaceAttributes.values || {};
    if (!data.vehicleUsage || !data.cover || !data.access) return "مشخصات ضروری پارکینگ کامل نیست.";
    if (data.vehicleUsage === "other" && data.usageNotes.length < 5) return "نوع کاربری خاص پارکینگ را توضیح دهید.";
    if (!space.area || !Number.isFinite(space.area)) return "متراژ واقعی پارکینگ را وارد کنید.";
  }
  if (space.listingType === "offer" && space.category === "storage" && space.spaceAttributes?.schemaVersion === 1) {
    const v=space.spaceAttributes.values || {};
    if (!v.spaceType || !v.access || !Array.isArray(v.allowedPurposes) || !v.allowedPurposes.length) return "مشخصات ضروری انبار کامل نیست.";
    if (v.allowedPurposes.includes("other") && v.otherPurpose.length < 5) return "نوع کالای خاص انبار را توضیح دهید.";
    if (!space.area || !Number.isFinite(space.area)) return "متراژ واقعی انبار را وارد کنید.";
  }
  if (space.listingType === "offer" && space.category === "warehouse" && space.spaceAttributes?.schemaVersion === 1) {
    const v = space.spaceAttributes.values || {};
    if (!v.spaceType || !v.power || !Array.isArray(v.allowedActivities) || !v.allowedActivities.length) return "مشخصات ضروری سوله یا کارگاه کامل نیست.";
    if (v.allowedActivities.includes("other") && v.otherActivity.length < 5) return "فعالیت خاص سوله یا کارگاه را توضیح دهید.";
    if (!space.area || !Number.isFinite(space.area)) return "متراژ واقعی سوله یا کارگاه را وارد کنید.";
  }
  if (space.listingType === "offer" && space.category === "land" && space.spaceAttributes?.schemaVersion === 1) {
    const v=space.spaceAttributes.values || {};
    if (!v.landType || !v.accessRoad || !Array.isArray(v.allowedPurposes) || !v.allowedPurposes.length) return "مشخصات ضروری زمین کامل نیست.";
    if (v.allowedPurposes.includes("other") && v.otherPurpose.length < 5) return "کاربرد دیگر زمین را توضیح دهید.";
    if (!space.area || !Number.isFinite(space.area)) return "مساحت واقعی زمین را وارد کنید.";
  }
  if (space.listingType === "offer" && space.category === "shop" && space.spaceAttributes?.schemaVersion === 1) {
    const v=space.spaceAttributes.values||{};
    if(!v.spaceType || !v.transferType || !Array.isArray(v.allowedActivities) || !v.allowedActivities.length) return "مشخصات ضروری مغازه کامل نیست.";
    if(v.spaceType==="other" && String(v.otherSpaceType||"").length<4) return "نوع فضای تجاری دیگر را توضیح دهید.";
    if(v.allowedActivities.includes("other") && String(v.otherActivity||"").length<4) return "فعالیت دیگر مغازه را توضیح دهید.";
    if(v.transferType==="key_money" && !v.rightsType) return "عنوان حق مورد واگذاری را مشخص کنید.";
    if(!space.area || !Number.isFinite(space.area)) return "متراژ واقعی مغازه را وارد کنید.";
  }
  if (space.listingType === "offer" && space.category === "garden" && space.spaceAttributes?.schemaVersion === 1) {
    const v=space.spaceAttributes.values||{};
    if(!v.gardenType || !v.accessRoad || !Array.isArray(v.allowedPurposes) || !v.allowedPurposes.length) return "مشخصات ضروری باغ کامل نیست.";
    if(v.allowedPurposes.includes("other")&&String(v.otherPurpose||"").trim().length<5)return "کاربرد دیگر باغ را توضیح دهید.";
    if(!space.area || !Number.isFinite(space.area))return "متراژ واقعی باغ را وارد کنید.";
    if(v.rentalTerm){
      if(v.rentalTerm==="short"){
        if(!["daily","weekly","monthly"].includes(v.shortRateUnit)||!v.shortRateRial)return "نرخ کوتاه‌مدت باغ کامل نیست.";
        if(Number(space.price)!==v.shortRateRial||space.priceType!==v.shortRateUnit)return "مبلغ کوتاه‌مدت باغ با شرایط ثبت‌شده برابر نیست.";
      } else if(v.rentalTerm==="seasonal"){
        if(!v.seasonalRateRial)return "نرخ فصلی باغ را وارد کنید.";
        if(space.price||space.priceType!=="negotiable")return "اجاره فصلی نباید به‌عنوان اجاره ماهانه ثبت شود.";
      } else if(v.rentalTerm==="long"){
        if(!["rent_only","full_deposit","deposit_rent"].includes(v.financialMode))return "شرایط مالی بلندمدت باغ را مشخص کنید.";
        if(v.financialMode!=="rent_only"&&!v.depositRial)return "مبلغ رهن بلندمدت باغ را وارد کنید.";
        if(v.financialMode!=="full_deposit"&&!v.longMonthlyRentRial)return "اجاره ماهانه بلندمدت باغ را وارد کنید.";
        if(v.financialMode==="full_deposit"&&(space.price||space.priceType!=="negotiable"))return "رهن کامل نباید اجاره ماهانه داشته باشد.";
        if(v.financialMode!=="full_deposit"&&(Number(space.price)!==v.longMonthlyRentRial||space.priceType!=="monthly"))return "مبلغ ماهانه باغ با قرارداد برابر نیست.";
      } else return "مدت واگذاری باغ معتبر نیست.";
    }else if(v.financialMode){
      if(!["rent_only","full_deposit","deposit_rent"].includes(v.financialMode)) return "نوع رهن و اجاره باغ معتبر نیست.";
      if(v.financialMode!=="rent_only"&&!v.depositRial)return "مبلغ ودیعه باغ را وارد کنید.";
      if(v.financialMode==="full_deposit" && (space.price || space.priceType!=="negotiable"))return "رهن کامل نمی‌تواند اجاره دوره‌ای داشته باشد.";
      if(v.financialMode!=="full_deposit" && space.priceType!=="negotiable" && (!Number.isSafeInteger(Number(space.price))||Number(space.price)<=0))return "اجاره باغ معتبر نیست.";
    }
  }
  if (space.listingType === "offer" && space.category === "villa" && space.spaceAttributes?.schemaVersion === 1) {
    const v=space.spaceAttributes.values||{}, d=space.villaDetails||{},term=v.rentalTerm||"short";
    if(!v.accommodationType || !v.privacy) return "مشخصات ضروری اقامتگاه کامل نیست.";
    if(v.accommodationType==="other" && v.otherType.length<5) return "نوع اقامتگاه دیگر را توضیح دهید.";
    if(!space.area || !Number.isFinite(space.area)) return "متراژ واقعی اقامتگاه را وارد کنید.";
    if(d.heatedPool && !d.pool) return "استخر آب‌گرم بدون استخر معتبر نیست.";
    if(v.features.includes("indoor_pool")&&!d.pool) return "استخر سرپوشیده بدون استخر معتبر نیست.";
    if(term==="long"){
      if(!["rent_only","full_deposit","deposit_rent"].includes(v.financialMode))return "نوع قرارداد بلندمدت ویلا معتبر نیست.";
      if(v.financialMode!=="rent_only"&&!v.longDepositRial)return "مبلغ رهن بلندمدت معتبر نیست.";
      if(v.financialMode!=="full_deposit"&&!v.longMonthlyRentRial)return "اجاره ماهانه بلندمدت معتبر نیست.";
      const expectedRent=v.financialMode==="full_deposit"?0:Number(v.longMonthlyRentRial);
      if(space.priceType!==(expectedRent?"monthly":"negotiable") || (expectedRent?Number(space.price)!==expectedRent:Boolean(space.price)))return "مبلغ اجاره ویلا با قرارداد بلندمدت مطابقت ندارد.";
    } else {
      if(!Array.isArray(v.availableStays) || !v.availableStays.length)return "حداقل یک شیوه اقامت ضروری است.";
      if(!d.capacity || !Number.isSafeInteger(d.capacity) || d.capacity>100)return "ظرفیت واقعی اقامتگاه را وارد کنید.";
      if(!["daily","weekly","monthly","negotiable"].includes(space.priceType))return "دوره اقامت معتبر نیست.";
      if(space.priceType==="negotiable" && space.price)return "قیمت توافقی نباید مبلغ قطعی داشته باشد.";
      if(space.priceType!=="negotiable" && (!/^\d{1,15}$/.test(String(space.price))||!Number.isSafeInteger(Number(space.price))||Number(space.price)<=0))return "هزینه اقامت معتبر نیست.";
    }
  }
  if (space.listingType === "offer" && space.category === "residential" && space.spaceAttributes?.schemaVersion === 1) {
    const v = space.spaceAttributes.values || {};
    const d = space.residentialDetails || {};
    if (!v.propertyType || v.propertyType !== d.propertyType) return "نوع ملک مسکونی معتبر نیست.";
    if (v.propertyType === "other" && v.otherType.length < 5) return "نوع فضای مسکونی دیگر را توضیح دهید.";
    if (!space.area || !Number.isFinite(space.area)) return "متراژ واقعی مسکونی را وارد کنید.";
    if (v.rentalTerm === "short") {
      const expectedType = {night:"daily",week:"weekly",month:"monthly"}[v.shortRateUnit];
      if (!expectedType || !v.shortRateRial) return "دوره و قیمت اقامت کوتاه‌مدت مسکونی الزامی است.";
      if (Number(space.price) !== v.shortRateRial || space.priceType !== expectedType) return "قیمت اقامت با شرایط کوتاه‌مدت مطابقت ندارد.";
      if (d.deposit || d.monthlyRent || v.financialMode) return "هزینه کوتاه‌مدت را با رهن بلندمدت مخلوط نکنید.";
    } else {
      if (!["rent_only", "full_deposit", "deposit_rent"].includes(v.financialMode)) return "روش رهن و اجاره مسکونی را انتخاب کنید.";
      if (v.financialMode !== "rent_only" && !d.deposit) return "مبلغ ودیعه مسکونی را وارد کنید.";
      if (v.financialMode !== "full_deposit" && !d.monthlyRent) return "مبلغ اجاره ماهانه مسکونی را وارد کنید.";
      if (v.financialMode === "full_deposit" && (space.price || space.priceType !== "negotiable")) return "رهن کامل نباید اجاره داشته باشد.";
      if (v.financialMode !== "full_deposit" && (space.priceType !== "monthly" || Number(space.price) !== d.monthlyRent)) return "اجاره ماهانه با مبلغ واقعی ملک مطابقت ندارد.";
    }
  }
  if(space.listingType==="offer"&&space.category==="other"&&space.spaceAttributes?.schemaVersion===1){
    const v=space.spaceAttributes.values||{};
    if(!space.customCategory||space.customCategory.length<3||!v.usage||v.usage.length<5||!v.layout||!space.area)return "نوع فضا، کاربرد و متراژ آن را مشخص کنید.";
    if(!["short","long"].includes(v.rentalTerm))return "نوع مدت اصلی واگذاری سایر فضاها را مشخص کنید.";
    const expected=v.rentalTerm==="short" ? {price:v.shortRateRial,priceType:v.shortRateUnit} :
      {price:v.financialMode==="full_deposit"?null:v.longMonthlyRentRial,priceType:v.financialMode==="full_deposit"?"negotiable":"monthly"};
    if(v.rentalTerm==="short" && (!["daily","weekly","monthly"].includes(v.shortRateUnit)||!v.shortRateRial||v.financialMode||v.longDepositRial||v.longMonthlyRentRial))return "هزینه کوتاه‌مدت سایر فضاها معتبر نیست.";
    if(v.rentalTerm==="long"&&(!["deposit_rent","full_deposit","rent_only"].includes(v.financialMode) ||
       (v.financialMode!=="rent_only"&&!v.longDepositRial) || (v.financialMode!=="full_deposit"&&!v.longMonthlyRentRial) || v.shortRateRial || v.securityHoldRial))return "رهن و اجاره بلندمدت سایر فضاها معتبر نیست.";
    if(space.priceType!==expected.priceType || (expected.price?Number(space.price)!==Number(expected.price):Boolean(space.price)))return "قیمت عمومی با قرارداد تخصصی سایر فضاها مطابقت ندارد.";
  }
  if (!space.title) return "عنوان آگهی لازم است.";
  if (!space.city) return "شهر لازم است.";
  if (space.category === "residential") {
    if (space.listingType === "wanted" && !space.residentialDetails.deposit && !space.residentialDetails.monthlyRent) {
      // Short-stay wanted requests carry a maximum budget (not rent) in price/metadata.
      // A long-term wanted ad still needs its real long-term budget fields.
      const want = residentialWantedShortBudget(space.description);
      if (!want || want.priceType !== space.priceType || Number(want.price) !== Number(space.price))
        return "بودجه یا مدت درخواست کوتاه‌مدت مسکونی معتبر نیست.";
    } else if (space.listingType !== "wanted" && space.spaceAttributes?.values?.rentalTerm === "short") {
      if (!space.price || !["daily","weekly","monthly"].includes(space.priceType)) return "اجاره کوتاه‌مدت مسکونی لازم است.";
    } else if (!space.residentialDetails.deposit && !space.residentialDetails.monthlyRent)
      return "مبلغ رهن یا اجاره را وارد کنید.";
  } else if (space.priceType !== "negotiable" && !space.price) return "قیمت لازم است.";
  if (!/^09\d{9}$/.test(space.phone)) return "شماره موبایل معتبر نیست.";
  if (!(space.listingType === "offer" && (["parking","storage","warehouse","land","shop","garden","residential","villa"].includes(space.category) || space.category==="other")) && space.description.length < 10) return "توضیحات باید حداقل ۱۰ کاراکتر باشد.";
  if (space.imageUrls.length > MAX_IMAGES) return `حداکثر ${MAX_IMAGES} عکس برای هر آگهی مجاز است.`;
  if (space.listingType !== "wanted" && space.imageUrls.length === 0) return "حداقل یک تصویر برای آگهی لازم است.";
  if (space.video && (!space.video.duration || space.video.duration > 120.5)) return "مدت ویدئو باید حداکثر ۲ دقیقه باشد.";
  if (space.video && space.video.size > 100 * 1024 * 1024) return "حجم ویدئو نباید بیشتر از ۱۰۰ مگابایت باشد.";
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
    return res.json({ ok: true, spaces: result.rows.map((row) => mapSpace(row)) });
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

async function getContact(req, res) {
  try {
    await ensureImageSchema();

    const result = await query(
      `SELECT id, phone, status FROM spaces WHERE id=$1 LIMIT 1`,
      [req.params.id]
    );

    const space = result.rows[0];

    if (!space) {
      return res.status(404).json({ ok: false, message: "آگهی پیدا نشد." });
    }

    if (space.status === "inactive" || space.status === "rented") {
      return res.status(409).json({
        ok: false,
        message: "شماره تماس این آگهی در وضعیت فعلی قابل نمایش نیست.",
      });
    }

    const phone = String(space.phone || "").replace(/\s/g, "").trim();

    if (!/^09\d{9}$/.test(phone)) {
      return res.status(404).json({
        ok: false,
        message: "شماره تماس معتبری برای این آگهی ثبت نشده است.",
      });
    }

    try {
      await recordContactReveal({
        userId: req.user.id,
        spaceId: space.id,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
    } catch (securityError) {
      console.error("Security contact monitoring error:", securityError);
    }

    return res.json({ ok: true, phone });
  } catch (error) {
    console.error("Get space contact error:", error);
    return res.status(500).json({
      ok: false,
      message: "دریافت شماره تماس انجام نشد.",
    });
  }
}

async function mine(req, res) {
  try {
    await ensureImageSchema();
    const result = await query(`SELECT ${FIELDS} FROM spaces WHERE owner_id=$1 ORDER BY created_at DESC`, [req.user.id]);
    return res.json({ ok: true, spaces: result.rows.map((row) => mapSpace(row, { includeExactLocation: true, includeModeratedMedia: true })) });
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
    if (space.video && !isVideoOwnedByUser(space.video, req.user.id)) return res.status(403).json({ ok: false, message: "ویدئوی آگهی متعلق به این حساب نیست." });
    if (error) return res.status(400).json({ ok: false, message: error });
    const id = crypto.randomUUID();
    const result = await query(
      `INSERT INTO spaces (id,listing_type,category,custom_category,category_label,status,title,city,area,price,price_type,phone,image_url,image_urls,residential_details,villa_details,garden_details,description,agency_network_consent,location_lat,location_lng,media_items,owner_id,shop_details,space_attributes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18,$19,$20,$21,$22::jsonb,$23,$24::jsonb,$25::jsonb)
       RETURNING ${FIELDS}`,
      [id, space.listingType, space.category, space.customCategory, space.categoryLabel, space.status, space.title, space.city, space.area, space.price, space.priceType, space.phone, space.imageUrl, JSON.stringify(space.imageUrls), JSON.stringify(space.residentialDetails), JSON.stringify(space.villaDetails), JSON.stringify(space.gardenDetails), space.description, space.agencyNetworkConsent, space.locationLat, space.locationLng, JSON.stringify(space.mediaItems), req.user.id, JSON.stringify(space.shopDetails), JSON.stringify(space.spaceAttributes)]
    );
    const createdSpace = mapSpace(result.rows[0], { includePhone: true, includeExactLocation: true });
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
    if (existing.rows[0].legal_hold && req.user.system_role !== "admin") {
      return res.status(423).json({ ok: false, message: "این آگهی تحت حفاظت حقوقی است و در حال حاضر قابل ویرایش نیست." });
    }
    const existingVideo = videoFromMedia(existing.rows[0].media_items);
    const merged = clean({ ...mapSpace(existing.rows[0], { includePhone: true, includeExactLocation: true, includeModeratedMedia: true }), ...req.body });
    if (existingVideo?.status === "blocked" && req.user.system_role !== "admin") {
      const sameVideo = merged.video?.url === existingVideo.url;
      if (!sameVideo) {
        return res.status(423).json({ ok: false, message: "ویدئوی این آگهی توسط مدیریت محدود شده و تا پایان بررسی قابل حذف یا جایگزینی نیست." });
      }
      merged.video = existingVideo;
      merged.mediaItems = [existingVideo];
    }
    const error = validate(merged);
    if (merged.video && req.user.system_role !== "admin" && !isVideoOwnedByUser(merged.video, req.user.id)) return res.status(403).json({ ok: false, message: "ویدئوی آگهی متعلق به این حساب نیست." });
    if (error) return res.status(400).json({ ok: false, message: error });
    const result = await query(
      `UPDATE spaces SET listing_type=$2,category=$3,custom_category=$4,category_label=$5,status=$6,title=$7,city=$8,area=$9,price=$10,price_type=$11,phone=$12,image_url=$13,image_urls=$14::jsonb,residential_details=$15::jsonb,villa_details=$16::jsonb,garden_details=$17::jsonb,description=$18,agency_network_consent=$19,location_lat=$20,location_lng=$21,media_items=$22::jsonb,shop_details=$23::jsonb,space_attributes=$24::jsonb,updated_at=NOW()
       WHERE id=$1 RETURNING ${FIELDS}`,
      [req.params.id, merged.listingType, merged.category, merged.customCategory, merged.categoryLabel, merged.status, merged.title, merged.city, merged.area, merged.price, merged.priceType, merged.phone, merged.imageUrl, JSON.stringify(merged.imageUrls), JSON.stringify(merged.residentialDetails), JSON.stringify(merged.villaDetails), JSON.stringify(merged.gardenDetails), merged.description, merged.agencyNetworkConsent, merged.locationLat, merged.locationLng, JSON.stringify(merged.mediaItems), JSON.stringify(merged.shopDetails), JSON.stringify(merged.spaceAttributes)]
    );
    if (existingVideo?.url && existingVideo.url !== merged.video?.url && existingVideo.status !== "blocked") {
      storage.deleteAdVideo({ url: existingVideo.url, userId: existing.rows[0].owner_id }).catch((cleanupError) => {
        console.error("Old ad video cleanup error:", cleanupError);
      });
      if (existingVideo.posterUrl) {
        storage.deleteAdImage({ url: existingVideo.posterUrl, userId: existing.rows[0].owner_id }).catch((cleanupError) => {
          console.error("Old ad video poster cleanup error:", cleanupError);
        });
      }
    }
    return res.json({ ok: true, message: "آگهی ویرایش شد.", space: mapSpace(result.rows[0], { includePhone: true, includeExactLocation: true, includeModeratedMedia: true }) });
  } catch (error) {
    console.error("Update space error:", error);
    return res.status(500).json({ ok: false, message: "ویرایش آگهی انجام نشد." });
  }
}

async function remove(req, res) {
  try {
    await ensureImageSchema();
    const existing = await query(`SELECT owner_id,legal_hold FROM spaces WHERE id=$1 LIMIT 1`, [req.params.id]);
    if (existing.rows[0]?.legal_hold && req.user.system_role !== "admin") {
      return res.status(423).json({ ok: false, message: "این آگهی تحت حفاظت حقوقی است و قابل حذف نیست." });
    }
    const result = await query(`DELETE FROM spaces WHERE id=$1 AND (owner_id=$2 OR $3='admin') RETURNING id`, [req.params.id, req.user.id, req.user.system_role]);
    if (!result.rowCount) return res.status(404).json({ ok: false, message: "آگهی پیدا نشد یا اجازه حذف ندارید." });
    return res.json({ ok: true, message: "آگهی حذف شد." });
  } catch (error) {
    console.error("Remove space error:", error);
    return res.status(500).json({ ok: false, message: "حذف آگهی انجام نشد." });
  }
}

module.exports = { list, getOne, getContact, mine, create, update, remove };
