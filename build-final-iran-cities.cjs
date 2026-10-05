const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

const OFFICIAL_FILE = path.join(
  ROOT,
  "src",
  "data",
  "iran-cities-official-1404.json"
);

const OLD_COORDINATES_FILE = path.join(
  ROOT,
  "src",
  "data",
  "iran-cities-with-coordinates.json"
);

const OUTPUT_FILE = path.join(
  ROOT,
  "src",
  "data",
  "iran-cities-final.json"
);

const REPORT_FILE = path.join(
  ROOT,
  "iran-cities-final-report.json"
);

function readJson(file) {
  let text = fs.readFileSync(file, "utf8");

  // Remove BOM if present
  text = text.replace(/^\uFEFF/, "");

  return JSON.parse(text);
}

function normalize(value) {
  return String(value || "")
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function validCoordinate(value) {
  const n = Number(value);
  return Number.isFinite(n);
}

function main() {
  console.log("======================================");
  console.log("FAZAJOO - BUILD FINAL IRAN CITIES");
  console.log("======================================");

  const official = readJson(OFFICIAL_FILE);
  const oldCoordinates = readJson(OLD_COORDINATES_FILE);

  console.log("OFFICIAL RECORDS:", official.length);
  console.log("OLD COORDINATE RECORDS:", oldCoordinates.length);

  // Build coordinate index from old dataset
  const coordinateIndex = new Map();

  for (const item of oldCoordinates) {
    const cityName =
      item.cityName ??
      item.name ??
      item.city_name ??
      "";

    const key = normalize(cityName);

    if (!key) continue;

    const lat = Number(item.lat ?? item.latitude);
    const lng = Number(
      item.lng ??
      item.lon ??
      item.longitude
    );

    if (!validCoordinate(lat) || !validCoordinate(lng)) {
      continue;
    }

    if (!coordinateIndex.has(key)) {
      coordinateIndex.set(key, {
        lat,
        lng,
      });
    }
  }

  console.log("COORDINATE INDEX:", coordinateIndex.size);

  const missing = [];
  let matched = 0;

  const finalCities = official.map((city) => {
    const key = normalize(city.name);
    const coordinates = coordinateIndex.get(key);

    if (coordinates) {
      matched += 1;
    } else {
      missing.push({
        id: city.id,
        name: city.name,
        slug: city.slug,
        province_id: city.province_id,
        county_id: city.county_id,
        district_id: city.district_id,
      });
    }

    return {
      id: city.id,
      name: city.name,
      slug: city.slug,
      province_id: city.province_id,
      county_id: city.county_id,
      district_id: city.district_id,
      lat: coordinates?.lat ?? null,
      lng: coordinates?.lng ?? null,
    };
  });

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(finalCities, null, 2),
    "utf8"
  );

  const bostanAbad = finalCities.filter(
    (x) => normalize(x.name) === normalize("بستان آباد")
  );

  const report = {
    generatedAt: new Date().toISOString(),

    totals: {
      official: official.length,
      matchedCoordinates: matched,
      missingCoordinates: missing.length,
    },

    bostanAbad,

    missingCoordinates: missing,
  };

  fs.writeFileSync(
    REPORT_FILE,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log("");
  console.log("MATCHED:", matched);
  console.log("MISSING COORDINATES:", missing.length);

  console.log("");
  console.log("BOSTAN ABAD:");
  console.log(bostanAbad);

  console.log("");
  console.log(
    "OUTPUT:",
    path.relative(ROOT, OUTPUT_FILE)
  );

  console.log(
    "REPORT:",
    path.relative(ROOT, REPORT_FILE)
  );

  console.log("");
  console.log("DONE");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("ERROR:");
  console.error(error);
  process.exit(1);
}