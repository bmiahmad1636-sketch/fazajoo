const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = process.cwd();
const inputPath = path.join(ROOT, 'neshan-iran-cities-fixed.json');
const outputPath = path.join(ROOT, 'src', 'data', 'iran-cities-with-coordinates.json');
const reportPath = path.join(ROOT, 'iran-city-coordinate-report.json');

const SOURCES = {
  cities: 'https://raw.githubusercontent.com/tafakoritech/Provinces-and-Cities-of-Iran-Dataset/main/cities.json',
  provinces: 'https://raw.githubusercontent.com/tafakoritech/Provinces-and-Cities-of-Iran-Dataset/main/provinces.json',
};

function normalize(value = '') {
  return String(value)
    .trim()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200d\u200e\u200f]/g, ' ')
    .replace(/^استان\s+/, '')
    .replace(/\s+/g, ' ');
}

function downloadJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Fazajoo-City-Builder/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadJson(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (error) { reject(new Error(`Invalid JSON from ${url}: ${error.message}`)); }
      });
    }).on('error', reject);
  });
}

(async () => {
  if (!fs.existsSync(inputPath)) {
    throw new Error('neshan-iran-cities-fixed.json در ریشه پروژه پیدا نشد.');
  }

  const neshan = JSON.parse(fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, ''));
  console.log(`Neshan cities: ${neshan.length}`);
  console.log('Downloading coordinate dataset...');

  const [sourceCities, sourceProvinces] = await Promise.all([
    downloadJson(SOURCES.cities),
    downloadJson(SOURCES.provinces),
  ]);

  const provinceById = new Map(sourceProvinces.map((p) => [String(p.id), normalize(p.name)]));
  const exact = new Map();
  const byCity = new Map();

  for (const c of sourceCities) {
    const lat = Number(c.lat ?? c.latitude);
    const lng = Number(c.lon ?? c.lng ?? c.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < 24 || lat > 40 || lng < 43 || lng > 64) continue;

    const cityName = normalize(c.name ?? c.title);
    const provinceName = provinceById.get(String(c.province_id ?? c.provinceId)) || '';
    const record = { cityName, provinceName, lat, lng };
    exact.set(`${provinceName}|${cityName}`, record);
    if (!byCity.has(cityName)) byCity.set(cityName, []);
    byCity.get(cityName).push(record);
  }

  let exactCount = 0;
  let uniqueFallbackCount = 0;
  const missing = [];
  const ambiguous = [];

  const merged = neshan.map((item) => {
    const cityName = normalize(item.cityName);
    const provinceName = normalize(item.provinceName);
    let hit = exact.get(`${provinceName}|${cityName}`);
    let matchType = 'province+city';

    if (!hit) {
      const candidates = byCity.get(cityName) || [];
      if (candidates.length === 1) {
        hit = candidates[0];
        matchType = 'unique-city-name';
      } else if (candidates.length > 1) {
        ambiguous.push({ ...item, candidates });
      }
    }

    if (!hit) {
      missing.push(item);
      return { ...item, lat: null, lng: null };
    }

    if (matchType === 'province+city') exactCount++;
    else uniqueFallbackCount++;

    return {
      ...item,
      lat: hit.lat,
      lng: hit.lng,
    };
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), 'utf8');
  fs.writeFileSync(reportPath, JSON.stringify({
    total: merged.length,
    matched: exactCount + uniqueFallbackCount,
    exactCount,
    uniqueFallbackCount,
    missingCount: missing.length,
    ambiguousCount: ambiguous.length,
    missing,
    ambiguous,
  }, null, 2), 'utf8');

  console.log('--------------------------------');
  console.log(`Matched: ${exactCount + uniqueFallbackCount}/${merged.length}`);
  console.log(`Exact province+city: ${exactCount}`);
  console.log(`Unique-name fallback: ${uniqueFallbackCount}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`Ambiguous: ${ambiguous.length}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Report: ${reportPath}`);
})();
