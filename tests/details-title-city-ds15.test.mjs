import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const jsx = read('src/pages/ParkingDetails.jsx');
const css = read('src/pages/ParkingDetailsTitleCityDS15.css');

test('DS15 loads once after DS14 and preserves prior visual layers', () => {
  const marker = 'import "./ParkingDetailsTitleCityDS15.css";';
  assert.equal(jsx.split(marker).length - 1, 1);
  assert.ok(jsx.indexOf(marker) > jsx.indexOf('import "./ParkingDetailsMetaRailDS14.css";'));
  for (const prior of ['ParkingDetailsVisualRefreshDS10.css','ParkingDetailsEditorialDS11.css','ParkingDetailsAlignmentDS12.css','ParkingDetailsHeroMetaDS13.css']) {
    assert.ok(jsx.includes(prior), prior);
  }
});

test('DS15 keeps title and city together before the metadata rail', () => {
  assert.match(css, /@media\s*\(min-width:\s*1001px\)/);
  assert.match(css, /> h1 \{/);
  assert.match(css, /> p \{/);
  assert.match(css, /margin-inline-start:\s*2cm\s*!important/);
  assert.match(css, /order:\s*0\s*!important/);
  assert.match(css, /order:\s*1\s*!important/);
  assert.match(css, /order:\s*2\s*!important/);
  assert.match(css, /order:\s*3\s*!important/);
  assert.match(css, /order:\s*4\s*!important/);
  assert.match(css, /flex:\s*0 0 100%\s*!important/);
});

test('DS15 only affects scoped wide-screen layout, without styling colors', () => {
  assert.match(css, /^\s*\.parking-details-page /m);
  assert.doesNotMatch(css, /@media\s*\(max-width:/);
  assert.doesNotMatch(css, /(?:^|[\s;{])(?:background(?:-color)?|color|border-color)\s*:/mi);
  for (const preserved of ['getSpaceContact', 'handlePhoneToggle', 'handleFavorite', 'handleShare', 'NeshanApproximateMap', 'setIsGalleryOpen(true)', 'TrustSafetyActions']) {
    assert.ok(jsx.includes(preserved), preserved);
  }
});
