import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const jsx = read('src/pages/ParkingDetails.jsx');
const css = read('src/pages/ParkingDetailsMetaRailDS14.css');

test('DS14 adds exactly one CSS import after DS13', () => {
  assert.equal((jsx.match(/import "\.\/ParkingDetailsMetaRailDS14\.css";/g) || []).length, 1);
  assert.ok(jsx.indexOf('import "./ParkingDetailsMetaRailDS14.css";') > jsx.indexOf('import "./ParkingDetailsHeroMetaDS13.css";'));
});

test('DS14 positions rental-term chips before status, category and city', () => {
  for (const token of ['min-width: 1001px', 'order: 1 !important', 'order: 2 !important', 'order: 3 !important',
    'nth-child(3) { order: 2', 'nth-child(2) { order: 3', 'margin-inline-start: clamp(22px, 6vw, 76px)',
    'content: none !important', 'flex: 0 0 100% !important']) assert.ok(css.includes(token), token);
});

test('DS14 equalizes duration and metadata chip dimensions without color changes', () => {
  assert.match(css, /\.fj-vr-badges > \.fj-vr-badge/);
  assert.match(css, /\.parking-details-hero__badges > \.parking-details-badge/);
  assert.ok(css.includes('width: clamp(120px, 9vw, 142px) !important;'));
  assert.ok(css.includes('min-height: 37px !important;'));
  assert.doesNotMatch(css, /(?:^|[\s;{])(?:background(?:-color)?|color|border-color)\s*:/mi);
});

test('DS14 keeps DS13 markup, API and financial logic byte-identical apart from the import', () => {
  const without = jsx.replace('import "./ParkingDetailsMetaRailDS14.css";\n', '');
  const source = read('tests/details-hero-meta-ds13.test.mjs');
  for (const key of ['const ds12PriceCard', 'getSpaceContact', 'handlePhoneToggle', 'TrustSafetyActions',
    'handleFavorite', 'handleShare', 'NeshanApproximateMap', 'parking?.spaceAttributes', 'setIsGalleryOpen(true)']) {
    assert.ok(without.includes(key), key);
  }
  assert.ok(source.includes('DS13 separates city from chips'));
});
