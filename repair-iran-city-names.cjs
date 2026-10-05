const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const INPUT_FILE = path.join(
  ROOT,
  "src",
  "data",
  "iran-cities-with-coordinates.json"
);

const OUTPUT_FILE = path.join(
  ROOT,
  "src",
  "data",
  "iran-cities-with-coordinates-repaired.json"
);

const REPORT_FILE = path.join(
  ROOT,
  "iran-city-name-repair-report.json"
);

/*
 * Repair common UTF-8 -> Windows-1252/Latin1 mojibake.
 *
 * Important:
 * Node's "latin1" decoder is ISO-8859-1, while many broken UTF-8
 * strings have passed through Windows-1252. Therefore we explicitly
 * map the Windows-1252 characters back to their original bytes.
 */

const WINDOWS_1252 = {
  "\u20AC": 0x80,
  "\u201A": 0x82,
  "\u0192": 0x83,
  "\u201E": 0x84,
  "\u2026": 0x85,
  "\u2020": 0x86,
  "\u2021": 0x87,
  "\u02C6": 0x88,
  "\u2030": 0x89,
  "\u0160": 0x8a,
  "\u2039": 0x8b,
  "\u0152": 0x8c,
  "\u017D": 0x8e,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201C": 0x93,
  "\u201D": 0x94,
  "\u2022": 0x95,
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u02DC": 0x98,
  "\u2122": 0x99,
  "\u0161": 0x9a,
  "\u203A": 0x9b,
  "\u0153": 0x9c,
  "\u017E": 0x9e,
  "\u0178": 0x9f,
};

function cp1252ToBytes(value) {
  const bytes = [];

  for (const char of String(value)) {
    const code = char.codePointAt(0);

    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(WINDOWS_1252, char)) {
      bytes.push(WINDOWS_1252[char]);
      continue;
    }

    return null;
  }

  return Buffer.from(bytes);
}

function decodeMojibakeOnce(value) {
  const buffer = cp1252ToBytes(value);

  if (!buffer) {
    return value;
  }

  return buffer.toString("utf8");
}

function persianScore(value) {
  const text = String(value || "");

  let score = 0;

  for (const char of text) {
    const code = char.codePointAt(0);

    // Arabic/Persian blocks
    if (
      (code >= 0x0600 && code <= 0x06ff) ||
      (code >= 0x0750 && code <= 0x077f) ||
      (code >= 0x08a0 && code <= 0x08ff) ||
      (code >= 0xfb50 && code <= 0xfdff) ||
      (code >= 0xfe70 && code <= 0xfeff)
    ) {
      score += 5;
    }

    // Typical mojibake characters
    if (
      char === "Ø" ||
      char === "Ù" ||
      char === "Û" ||
      char === "Ú" ||
      char === "Ã" ||
      char === "Â" ||
      char === "ð" ||
      char === "�"
    ) {
      score -= 8;
    }
  }

  return score;
}

function repairText(value) {
  if (typeof value !== "string" || !value) {
    return value;
  }

  let best = value;
  let bestScore = persianScore(value);
  let current = value;

  // Some strings may have been encoded incorrectly more than once.
  for (let round = 0; round < 4; round += 1) {
    const decoded = decodeMojibakeOnce(current);

    if (!decoded || decoded === current || decoded.includes("�")) {
      break;
    }

    const score = persianScore(decoded);

    if (score > bestScore) {
      best = decoded;
      bestScore = score;
    }

    current = decoded;
  }

  return best
    .replace(/\u200c/g, "\u200c")
    .replace(/\u064a/g, "\u06cc") // Arabic ي -> Persian ی
    .replace(/\u0643/g, "\u06a9") // Arabic ك -> Persian ک
    .trim();
}

function normalizeName(value) {
  return String(value || "")
    .replace(/\u200c/g, " ")
    .replace(/[-‐-‒–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPersianReadable(value) {
  const text = String(value || "");

  return /[\u0600-\u06ff]/.test(text) &&
    !/[ØÙÛÚÃÂ�]/.test(text);
}

function main() {
  console.log("====================================");
  console.log("Fazajoo Iran city name repair");
  console.log("====================================");

  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(
      `Input file not found: ${INPUT_FILE}`
    );
  }

  let raw = fs.readFileSync(INPUT_FILE, "utf8");

  // Remove BOM if present
  raw = raw.replace(/^\uFEFF/, "");

  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error("Input JSON must be an array.");
  }

  let changedProvinceNames = 0;
  let changedCityNames = 0;
  let readableNames = 0;
  let brokenNames = 0;

  const repaired = data.map((item) => {
    const originalProvince = String(item.provinceName || "");
    const originalCity = String(item.cityName || "");

    const provinceName = repairText(originalProvince);
    const cityName = repairText(originalCity);

    if (provinceName !== originalProvince) {
      changedProvinceNames += 1;
    }

    if (cityName !== originalCity) {
      changedCityNames += 1;
    }

    if (
      isPersianReadable(provinceName) &&
      isPersianReadable(cityName)
    ) {
      readableNames += 1;
    } else {
      brokenNames += 1;
    }

    return {
      ...item,
      provinceName,
      cityName,
    };
  });

  fs.mkdirSync(path.dirname(OUTPUT_FILE), {
    recursive: true,
  });

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(repaired, null, 2),
    "utf8"
  );

  const bostanMatches = repaired
    .filter((item) => {
      const city = normalizeName(item.cityName);

      return (
        city.includes("بستان آباد") ||
        city.includes("بستان‌آباد") ||
        (city.includes("بستان") && city.includes("آباد"))
      );
    })
    .map((item) => ({
      provinceName: item.provinceName,
      cityName: item.cityName,
      cityId: item.cityId,
      lat: item.lat,
      lng: item.lng,
    }));

  const suspicious = repaired
    .filter(
      (item) =>
        !isPersianReadable(item.provinceName) ||
        !isPersianReadable(item.cityName)
    )
    .slice(0, 100)
    .map((item) => ({
      provinceName: item.provinceName,
      cityName: item.cityName,
      cityId: item.cityId,
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    total: repaired.length,
    changedProvinceNames,
    changedCityNames,
    readableNames,
    brokenNames,
    bostanAbadMatches: bostanMatches,
    suspicious,
  };

  fs.writeFileSync(
    REPORT_FILE,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log("");
  console.log("TOTAL:", repaired.length);
  console.log(
    "CHANGED PROVINCE NAMES:",
    changedProvinceNames
  );
  console.log(
    "CHANGED CITY NAMES:",
    changedCityNames
  );
  console.log("READABLE:", readableNames);
  console.log("STILL BROKEN:", brokenNames);

  console.log("");
  console.log(
    "BOSTAN ABAD MATCHES:",
    bostanMatches.length
  );

  console.log(bostanMatches);

  console.log("");
  console.log(
    "Output:",
    path.relative(ROOT, OUTPUT_FILE)
  );

  console.log(
    "Report:",
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