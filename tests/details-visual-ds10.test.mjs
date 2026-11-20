import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const jsx = read('src/pages/ParkingDetails.jsx');
const css = read('src/pages/ParkingDetailsVisualRefreshDS10.css');
const originalCss = read('src/pages/ParkingDetailsGalleryDS08.css');

test('DS10 is the LAST imported details stylesheet and is details-only scoped', () => {
  const imports = [
    'import "./ParkingDetails.css";',
    'import "./ParkingDetailsGalleryDS08.css";',
    'import "./ParkingDetailsVisualRefreshDS10.css";'
  ];
  assert.ok(imports.every(s => jsx.includes(s)));
  assert.ok(jsx.indexOf(imports[0]) < jsx.indexOf(imports[1]));
  assert.ok(jsx.indexOf(imports[1]) < jsx.indexOf(imports[2]));
  assert.doesNotMatch(css, /(?:^|\n)\s*(?:html|body|:root|\.container|\*)\s*\{/);
});
test('DS10 compacts details and preserves mobile and accessibility rules', () => {
  for (const selector of [
    '.parking-details-hero', '.parking-details-hero__price',
    '.parking-details-section', '.parking-details-feature',
    '.parking-details-residential__grid', '.parking-details-location',
    '.parking-details-sidebar', '.parking-contact-card',
    '.parking-details-gallery--with-photo'
  ]) assert.ok(css.includes(selector), `Missing ${selector}`);
  for (const viewport of ['1000px', '760px', '560px', '375px']) {
    assert.ok(css.includes(`max-width: ${viewport}`), `Missing ${viewport} rule`);
  }
  assert.match(css, /min-height: 44px !important/);
  assert.doesNotMatch(css, /display:\s*none\s*!important|line-clamp|text-overflow:\s*ellipsis/);
  assert.match(css, /white-space:\s*normal/);
});
test('DS08 full image, lightbox, navigation and important contact behaviors remain', () => {
  assert.match(originalCss, /object-fit: contain/);
  for (const snippet of [
    'setIsGalleryOpen(true)', 'showPreviousImage()', 'showNextImage()',
    'className="parking-details-lightbox"', 'getSpaceContact',
    'getFavoriteStatus', 'TrustSafetyActions', 'NeshanApproximateMap',
    'to={`/chat/${parking.id}`}', 'handleDelete', 'handleEdit',
    'parking.video?.url', 'isWanted && category === "villa"',
    'category === "garden"', 'category === "residential"'
  ]) assert.ok(jsx.includes(snippet), `Missing protected behavior: ${snippet}`);
});
