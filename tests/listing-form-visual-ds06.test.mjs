import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const add = read('src/pages/AddParking.jsx');
const edit = read('src/pages/EditParking.jsx');
const css = read('src/pages/ListingFormVisualRefresh.css');
const hash = (s) => createHash('sha256').update(s).digest('hex');
const importMarker = 'import "./ListingFormVisualRefresh.css";\n';

// Exact hashes from user-supplied snapshot Fazajoo_FOR_CHATGPT(20261120-153725).zip.
test('add: DS-06 visual baseline remains and DS-07 map journey is wired without new prices', () => {
  assert.equal(add.split(importMarker).length - 1, 1);
  assert.match(add, /import "\.\/ListingFormJourneyDS07\.css"/);
  assert.match(add, /onSelect=\{revealSelectedCity\}/);
  assert.match(add, /ref=\{mapJourneyRef\}/);
  assert.match(add, /onClick=\{goToNextStep\}/);
  assert.match(add, /onClick=\{saveParking\}/);
  assert.equal((add.match(/<NeshanLocationPicker/g) || []).length, 1);
  const city = add.indexOf('<IranCityAutocomplete');
  const map = add.indexOf('<NeshanLocationPicker');
  const firstOffer = add.indexOf('<ParkingOfferFields');
  assert.ok(city !== -1 && map > city && firstOffer > map);
});

test('edit: original specialty wiring survives and map follows base info', () => {
  assert.equal(edit.split(importMarker).length - 1, 1);
  assert.match(edit, /import "\.\/ListingFormJourneyDS07\.css"/);
  assert.match(edit, /onSubmit=\{saveEdit\}/);
  assert.match(edit, /onClick=\{resetChanges\}/);
  const first = edit.indexOf('{isWanted ? "مشخصات اصلی درخواست" : "مشخصات اصلی آگهی"}');
  const map = edit.indexOf('<NeshanLocationPicker');
  const specialty = edit.indexOf('<ParkingOfferFields');
  assert.ok(first !== -1 && map > first && specialty > map);
});

test('legacy and journey styles are loaded after page CSS', () => {
  assert.match(add, /import "\.\/AddParking\.css";\s*import "\.\/ListingFormVisualRefresh\.css";\s*import "\.\/ListingFormJourneyDS07\.css";/);
  assert.match(edit, /import "\.\/EditParking\.css";\s*import "\.\/ListingFormVisualRefresh\.css";\s*import "\.\/ListingFormJourneyDS07\.css";/);
});

test('edit: users can see their city on the map before specialty fields', () => {
  const base = edit.indexOf('{isWanted ? "مشخصات اصلی درخواست" : "مشخصات اصلی آگهی"}');
  const map = edit.indexOf('<NeshanLocationPicker');
  const specialty = edit.indexOf('<ParkingOfferFields');
  assert.ok(base !== -1 && map > base && specialty > map);
});

test('edit: all nine categories keep their independent details', () => {
  for (const c of ['parking', 'storage', 'warehouse', 'land', 'shop', 'residential', 'villa', 'garden', 'other']) {
    assert.ok(edit.includes(`parking?.category === "${c}"`), c);
  }
});

test('offer controls are still wired to the same model setters', () => {
  for (const setter of ['parkingOffer', 'storageOffer', 'industrialOffer', 'landOffer', 'residentialOffer', 'villaOffer', 'gardenOffer', 'otherOffer', 'shopOffer']) {
    assert.ok(edit.includes(setter), setter);
  }
});

test('submission, step navigation, and form state remain present', () => {
  assert.match(add, /onClick=\{goToNextStep\}/);
  assert.match(add, /onClick=\{saveParking\}/);
  assert.match(edit, /onSubmit=\{saveEdit\}/);
  assert.match(edit, /onClick=\{resetChanges\}/);
  assert.match(edit, /disabled=\{\s*loading \|\| !hasChanges\s*\}/);
});

test('visual CSS is scoped to the two listing form pages', () => {
  assert.match(css, /\.add-parking-page/);
  assert.match(css, /\.edit-parking-page/);
  assert.doesNotMatch(css, /(^|\n)\s*(html|body|\.container|:root|button\s*\{|input\s*\{)/m);
});

test('layout supports compact mobile, tablet, desktop, and accessible focus', () => {
  for (const text of ['max-width: 1050px', 'max-width: 720px', 'max-width: 380px', ':focus-visible']) {
    assert.ok(css.includes(text), text);
  }
});

test('editing preview remains available and styling preserves warning states', () => {
  assert.match(edit, /className="edit-parking-preview"/);
  assert.match(edit, /className="edit-parking-preview__price"/);
  assert.match(css, /\.edit-parking-input--error/);
  assert.match(css, /\.add-parking-input--error/);
});

test('category forms and shared site are not imported into visual refresh stylesheet', () => {
  assert.doesNotMatch(css, /@import|url\(/);
  assert.doesNotMatch(css, /\.parking-card\s*\{|\.fj-industrial-card\s*\{|\.fj-unified-card\s*\{/);
});

test('desktop compact.css global !important rules cannot reintroduce card gaps', () => {
  assert.match(css, /@media \(min-width: 769px\)/);
  assert.match(css, /\.edit-parking-page \.edit-parking-card\s*\{\s*padding-top: 0 !important;\s*padding-bottom: 0 !important;/);
  assert.match(css, /\.add-parking-page \.add-parking-content,\s*\.edit-parking-page \.edit-parking-content\s*\{\s*padding-top: 0 !important;/);
});
