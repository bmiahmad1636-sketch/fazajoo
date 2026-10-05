const fs = require("fs");
const https = require("https");
const path = require("path");

const ROOT = process.cwd();

const OUTPUT_DIR = path.join(ROOT, "src", "data");

const RAW_FILE = path.join(
  OUTPUT_DIR,
  "iran-cities-official-1404.json"
);

const REPORT_FILE = path.join(
  ROOT,
  "iran-cities-official-1404-report.json"
);

/*
  Official-based Iran administrative dataset
  Repository:
  sajaddp/list-of-cities-in-Iran

  We intentionally download the current generated cities JSON
  instead of using our previous corrupted Neshan names.
*/

const CANDIDATE_URLS = [
  "https://raw.githubusercontent.com/sajaddp/list-of-cities-in-Iran/main/dist/json/cities.json",
  "https://raw.githubusercontent.com/sajaddp/list-of-cities-in-Iran/main/dist/cities.json",
  "https://raw.githubusercontent.com/sajaddp/list-of-cities-in-Iran/main/dist/cities/cities.json",
];

function download(url) {
  return new Promise((resolve, reject) => {
    console.log("Trying:");
    console.log(url);
    console.log("");

    https
      .get(
        url,
        {
          headers: {
            "User-Agent": "Fazajoo-City-Builder/1.0",
          },
        },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            res.resume();

            return resolve(
              download(res.headers.location)
            );
          }

          if (res.statusCode !== 200) {
            res.resume();

            return reject(
              new Error(
                `HTTP ${res.statusCode}`
              )
            );
          }

          let body = "";

          res.setEncoding("utf8");

          res.on("data", (chunk) => {
            body += chunk;
          });

          res.on("end", () => {
            resolve(body);
          });
        }
      )
      .on("error", reject);
  });
}

function removeBom(text) {
  return String(text || "").replace(
    /^\uFEFF/,
    ""
  );
}

function countPersian(text) {
  const matches = String(text || "").match(
    /[\u0600-\u06FF]/g
  );

  return matches ? matches.length : 0;
}

function findBostan(value) {
  const text = JSON.stringify(value);

  return (
    text.includes("بستان آباد") ||
    text.includes("بستان‌آباد") ||
    text.includes("بستان")
  );
}

async function main() {
  console.log(
    "========================================"
  );

  console.log(
    "FAZAJOO - CLEAN IRAN CITIES BUILDER"
  );

  console.log(
    "========================================"
  );

  console.log("");

  fs.mkdirSync(OUTPUT_DIR, {
    recursive: true,
  });

  let raw = null;
  let successfulUrl = null;
  let lastError = null;

  for (const url of CANDIDATE_URLS) {
    try {
      const downloaded = await download(url);

      const cleaned = removeBom(downloaded);

      const parsed = JSON.parse(cleaned);

      raw = cleaned;
      successfulUrl = url;

      console.log("DOWNLOAD OK");
      console.log("");

      /*
        Re-stringify so we know the output is
        valid UTF-8 JSON written by Node itself.
      */

      fs.writeFileSync(
        RAW_FILE,
        JSON.stringify(parsed, null, 2),
        "utf8"
      );

      break;
    } catch (error) {
      lastError = error;

      console.log(
        "Failed:",
        error.message
      );

      console.log("");
    }
  }

  if (!raw || !successfulUrl) {
    throw new Error(
      `Could not download cities dataset. Last error: ${
        lastError?.message || "unknown"
      }`
    );
  }

  const data = JSON.parse(raw);

  const serialized = JSON.stringify(data);

  const persianCharacterCount =
    countPersian(serialized);

  const bostanFound = findBostan(data);

  let recordCount = null;

  if (Array.isArray(data)) {
    recordCount = data.length;
  } else if (
    data &&
    Array.isArray(data.data)
  ) {
    recordCount = data.data.length;
  } else if (
    data &&
    Array.isArray(data.cities)
  ) {
    recordCount = data.cities.length;
  }

  const report = {
    generatedAt: new Date().toISOString(),

    source: successfulUrl,

    topLevelType: Array.isArray(data)
      ? "array"
      : typeof data,

    recordCount,

    persianCharacterCount,

    bostanFound,

    outputFile: path.relative(
      ROOT,
      RAW_FILE
    ),
  };

  fs.writeFileSync(
    REPORT_FILE,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log(
    "----------------------------------------"
  );

  console.log(
    "SOURCE:",
    successfulUrl
  );

  console.log(
    "RECORD COUNT:",
    recordCount
  );

  console.log(
    "PERSIAN CHARACTERS:",
    persianCharacterCount
  );

  console.log(
    "BOSTAN FOUND:",
    bostanFound
  );

  console.log("");

  console.log(
    "OUTPUT:",
    path.relative(ROOT, RAW_FILE)
  );

  console.log(
    "REPORT:",
    path.relative(ROOT, REPORT_FILE)
  );

  console.log("");

  console.log("DONE");
}

main().catch((error) => {
  console.error("");
  console.error("ERROR:");
  console.error(error.message);
  process.exit(1);
});