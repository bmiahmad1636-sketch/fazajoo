const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const CURRENT_FILE = path.join(
  ROOT,
  "src",
  "data",
  "iran-cities-with-coordinates.json"
);

const NESHAN_FILE = path.join(
  ROOT,
  "neshan-iran-cities-fixed.json"
);

const OUTPUT_FILE = path.join(
  ROOT,
  "iran-cities-comparison-report.json"
);

function normalize(value = "") {
  return String(value)
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c|\u200d|\u200e|\u200f/g, "")
    .replace(/\s+/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getCityName(item) {
  return (
    item.cityName ||
    item.name ||
    item.city ||
    item.title ||
    ""
  );
}

function getProvinceName(item) {
  return (
    item.provinceName ||
    item.province ||
    item.state ||
    ""
  );
}

function makeKey(provinceName, cityName) {
  return `${normalize(provinceName)}|${normalize(cityName)}`;
}

try {
  const current = loadJson(CURRENT_FILE);
  const neshan = loadJson(NESHAN_FILE);

  console.log("======================================");
  console.log("Fazajoo Iran Cities Comparison");
  console.log("======================================");

  console.log("Current cities:", current.length);
  console.log("Neshan cities :", neshan.length);

  const currentKeys = new Set();

  for (const item of current) {
    currentKeys.add(
      makeKey(
        getProvinceName(item),
        getCityName(item)
      )
    );
  }

  const missing = [];

  for (const item of neshan) {
    const provinceName = getProvinceName(item);
    const cityName = getCityName(item);

    if (!cityName) continue;

    const key = makeKey(provinceName, cityName);

    if (!currentKeys.has(key)) {
      missing.push({
        provinceId: item.provinceId ?? null,
        provinceName,
        cityId: item.cityId ?? item.id ?? null,
        cityName,
      });
    }
  }

  const uniqueMissing = [];

  const seen = new Set();

  for (const item of missing) {
    const key = makeKey(
      item.provinceName,
      item.cityName
    );

    if (seen.has(key)) continue;

    seen.add(key);
    uniqueMissing.push(item);
  }

  uniqueMissing.sort((a, b) => {
    const p = normalize(a.provinceName).localeCompare(
      normalize(b.provinceName),
      "fa"
    );

    if (p !== 0) return p;

    return normalize(a.cityName).localeCompare(
      normalize(b.cityName),
      "fa"
    );
  });

  const bostanAbad = [
    ...current,
    ...neshan,
  ].filter((item) => {
    const name = normalize(getCityName(item));

    return (
      name.includes("بستان آباد") ||
      name.includes("بستاناباد") ||
      name.includes("بستان اباد")
    );
  });

  const report = {
    generatedAt: new Date().toISOString(),

    totals: {
      currentCities: current.length,
      neshanCities: neshan.length,
      missingCities: uniqueMissing.length,
    },

    bostanAbad,

    missingCities: uniqueMissing,
  };

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log("");
  console.log("--------------------------------------");
  console.log("RESULT");
  console.log("--------------------------------------");

  console.log("Current:", current.length);
  console.log("Neshan :", neshan.length);
  console.log("Missing:", uniqueMissing.length);

  console.log("");
  console.log("Bostan Abad matches:");
  console.log(bostanAbad);

  console.log("");
  console.log("First 30 missing cities:");

  console.table(
    uniqueMissing.slice(0, 30).map((item) => ({
      province: item.provinceName,
      city: item.cityName,
      cityId: item.cityId,
    }))
  );

  console.log("");
  console.log(
    "Report:",
    path.relative(ROOT, OUTPUT_FILE)
  );

  console.log("");
  console.log("DONE");
} catch (error) {
  console.error("");
  console.error("ERROR:");
  console.error(error);
  process.exit(1);
}