import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const jsx = read('src/pages/ParkingDetails.jsx');
const css = read('src/pages/ParkingDetailsHeroMetaDS13.css');
test('DS13 is the final style layer after DS12', () => {
  assert.equal((jsx.match(/import "\.\/ParkingDetailsHeroMetaDS13\.css";/g) || []).length, 1);
  assert.ok(jsx.indexOf('import "./ParkingDetailsHeroMetaDS13.css";') > jsx.indexOf('import "./ParkingDetailsAlignmentDS12.css";'));
});
test('DS13 separates city from chips on wide layouts without hidden fields', () => {
  for (const token of [
    'min-width: 1001px',
    'div:first-child > h1',
    'div:first-child > p',
    'div:first-child::before',
    'order: 2', 'order: 3', 'order: 4',
    'flex: 0 0 100%', 'flex-wrap: wrap',
  ]) assert.ok(css.includes(token), `missing ${token}`);
  assert.doesNotMatch(css, /display:\s*none|text-overflow|line-clamp|position:\s*(?:absolute|fixed)|overflow:\s*hidden/);
  assert.ok(css.startsWith('/* Fazajoo DS-13'));
});
test('DS13 does not alter protected behavior from DS12', () => {
  for (const key of [
    'const ds12PriceCard', 'handleFavorite', 'handleShare', 'getSpaceContact',
    'TrustSafetyActions', 'handlePhoneToggle', 'setIsGalleryOpen(true)',
    'NeshanApproximateMap', 'to={`/chat/${parking.id}`}',
    'parking?.spaceAttributes', 'category === "garden"',
  ]) assert.ok(jsx.includes(key), key);
});
