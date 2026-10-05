const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

const INPUT_CITIES = path.join(
  ROOT,
  "src",
  "data",
  "iran-cities-with-coordinates.json"
);

const REPORT_FILE = path.join(
  ROOT,
  "iran-city-coordinate-report.json"
);

const OUTPUT_FILE = path.join(
  ROOT,
  "src",
  "data",
  "iran-cities-with-coordinates.json"
);

const NEW_REPORT_FILE = path.join(
  ROOT,
  "iran-city-coordinate-completion-report.json"
);

function readJson(file) {
  return JSON.parse(
    fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
  );
}

function normalizePersian(value = "") {
  return String(value)
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ۀ/g, "ه")
    .replace(/ة/g, "ه")
    .replace(/\u200c/g, " ")
    .replace(/\u200d/g, " ")
    .replace(/\u200e/g, " ")
    .replace(/\u200f/g, " ")
    .replace(/[ـ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripProvince(value = "") {
  return normalizePersian(value)
    .replace(/^استان\s+/, "")
    .trim();
}

function compact(value = "") {
  return normalizePersian(value)
    .replace(/[\s\-_/()（）]+/g, "")
    .trim();
}

function getLat(item) {
  const candidates = [
    item?.lat,
    item?.latitude,
    item?.location?.lat,
    item?.location?.latitude,
    item?.coordinates?.lat,
    item?.coordinates?.latitude,
  ];

  for (const value of candidates) {
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number >= 24 &&
      number <= 40
    ) {
      return number;
    }
  }

  return null;
}

function getLng(item) {
  const candidates = [
    item?.lng,
    item?.lon,
    item?.long,
    item?.longitude,
    item?.location?.lng,
    item?.location?.lon,
    item?.location?.longitude,
    item?.coordinates?.lng,
    item?.coordinates?.lon,
    item?.coordinates?.longitude,
  ];

  for (const value of candidates) {
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number >= 43 &&
      number <= 64
    ) {
      return number;
    }
  }

  return null;
}

function hasCoordinates(item) {
  return (
    Number.isFinite(Number(item?.lat)) &&
    Number.isFinite(Number(item?.lng))
  );
}

function walkJson(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      walkJson(item, output);
    }

    return output;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const lat = getLat(value);
    const lng = getLng(value);

    const cityName =
      value.cityName ??
      value.city_name ??
      value.city ??
      value.name ??
      value.title ??
      "";

    const provinceName =
      value.provinceName ??
      value.province_name ??
      value.province ??
      value.state ??
      "";

    if (
      cityName &&
      lat !== null &&
      lng !== null
    ) {
      output.push({
        cityName: normalizePersian(cityName),
        provinceName: stripProvince(provinceName),
        lat,
        lng,
      });
    }

    for (const child of Object.values(value)) {
      if (
        child &&
        typeof child === "object"
      ) {
        walkJson(child, output);
      }
    }
  }

  return output;
}

/*
 * مرحله دوم:
 *
 * تمام فایل‌های JSON موجود در ریشه پروژه و پوشه src/data
 * را بررسی می‌کنیم و هر رکورد دارای نام شهر + مختصات معتبر ایران
 * را به عنوان منبع کمکی جمع می‌کنیم.
 *
 * این کار باعث می‌شود اطلاعات 908 شهر قبلی حفظ شود و فقط Missingها
 * در صورت وجود منبع معتبر محلی تکمیل شوند.
 */

const sourceFiles = [];

function collectJsonFiles(directory) {
  if (!fs.existsSync(directory)) {
    return;
  }

  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true,
  })) {
    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.toLowerCase().endsWith(".json")) {
      continue;
    }

    const fullPath = path.join(
      directory,
      entry.name
    );

    if (
      fullPath === OUTPUT_FILE ||
      fullPath === REPORT_FILE ||
      fullPath === NEW_REPORT_FILE
    ) {
      continue;
    }

    sourceFiles.push(fullPath);
  }
}

collectJsonFiles(ROOT);
collectJsonFiles(
  path.join(ROOT, "src", "data")
);

const candidates = [];

for (const file of sourceFiles) {
  try {
    const json = readJson(file);

    const found = walkJson(json);

    for (const item of found) {
      candidates.push({
        ...item,
        source: path.relative(ROOT, file),
      });
    }
  } catch {
    // فایل JSON نامرتبط یا خراب را نادیده می‌گیریم.
  }
}

const cities = readJson(INPUT_CITIES);
const previousReport = readJson(REPORT_FILE);

const missingIds = new Set(
  (previousReport.missing || []).map(
    (item) => Number(item.cityId)
  )
);

const exactIndex = new Map();
const cityOnlyIndex = new Map();

for (const item of candidates) {
  const cityKey = compact(item.cityName);
  const provinceKey = compact(
    stripProvince(item.provinceName)
  );

  if (!cityKey) {
    continue;
  }

  if (provinceKey) {
    const exactKey =
      `${provinceKey}|${cityKey}`;

    if (!exactIndex.has(exactKey)) {
      exactIndex.set(exactKey, []);
    }

    exactIndex
      .get(exactKey)
      .push(item);
  }

  if (!cityOnlyIndex.has(cityKey)) {
    cityOnlyIndex.set(cityKey, []);
  }

  cityOnlyIndex
    .get(cityKey)
    .push(item);
}

let completed = 0;
let completedExact = 0;
let completedUniqueName = 0;

const completionDetails = [];
const stillMissing = [];

for (const city of cities) {
  if (
    hasCoordinates(city) ||
    !missingIds.has(Number(city.cityId))
  ) {
    continue;
  }

  const cityKey = compact(city.cityName);
  const provinceKey = compact(
    stripProvince(city.provinceName)
  );

  const exactKey =
    `${provinceKey}|${cityKey}`;

  const exactMatches =
    exactIndex.get(exactKey) || [];

  let selected = null;
  let method = null;

  if (exactMatches.length === 1) {
    selected = exactMatches[0];
    method = "exact-province-city";
    completedExact += 1;
  } else {
    const nameMatches =
      cityOnlyIndex.get(cityKey) || [];

    /*
     * فقط اگر تمام نتایج یک نام عملاً یک مختصات داشته باشند،
     * تطبیق نام یکتا را قبول می‌کنیم.
     */
    const uniqueCoordinates = new Map();

    for (const match of nameMatches) {
      const key =
        `${Number(match.lat).toFixed(5)},` +
        `${Number(match.lng).toFixed(5)}`;

      if (!uniqueCoordinates.has(key)) {
        uniqueCoordinates.set(
          key,
          match
        );
      }
    }

    if (uniqueCoordinates.size === 1) {
      selected =
        [...uniqueCoordinates.values()][0];

      method = "unique-city-name";
      completedUniqueName += 1;
    }
  }

  if (!selected) {
    stillMissing.push({
      provinceId: city.provinceId,
      provinceName: city.provinceName,
      cityId: city.cityId,
      cityName: city.cityName,
    });

    continue;
  }

  city.lat = Number(selected.lat);
  city.lng = Number(selected.lng);

  city.coordinateSource =
    selected.source;

  city.coordinateMatchMethod =
    method;

  completed += 1;

  completionDetails.push({
    provinceId: city.provinceId,
    provinceName: city.provinceName,
    cityId: city.cityId,
    cityName: city.cityName,
    lat: city.lat,
    lng: city.lng,
    method,
    source: selected.source,
  });
}

fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(cities, null, 2),
  "utf8"
);

const totalWithCoordinates =
  cities.filter(hasCoordinates).length;

const report = {
  generatedAt: new Date().toISOString(),
  totalCities: cities.length,
  previousMissing:
    missingIds.size,
  candidatesFound:
    candidates.length,
  completed,
  completedExact,
  completedUniqueName,
  totalWithCoordinates,
  stillMissingCount:
    stillMissing.length,
  completionDetails,
  stillMissing,
};

fs.writeFileSync(
  NEW_REPORT_FILE,
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("");
console.log(
  "=== FAZAJOO IRAN CITY COORDINATE COMPLETION ==="
);

console.log(
  "Total cities:",
  cities.length
);

console.log(
  "Previously missing:",
  missingIds.size
);

console.log(
  "Coordinate candidates found:",
  candidates.length
);

console.log(
  "Newly completed:",
  completed
);

console.log(
  "  Exact province + city:",
  completedExact
);

console.log(
  "  Unique city name:",
  completedUniqueName
);

console.log(
  "Total with coordinates:",
  totalWithCoordinates
);

console.log(
  "Still missing:",
  stillMissing.length
);

console.log("");
console.log(
  "Output:",
  path.relative(ROOT, OUTPUT_FILE)
);

console.log(
  "Report:",
  path.relative(
    ROOT,
    NEW_REPORT_FILE
  )
);