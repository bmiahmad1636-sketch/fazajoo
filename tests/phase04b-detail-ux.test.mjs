import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('details favorite button uses persisted API toggle, not a decorative heart', () => {
  const src = file('src/pages/ParkingDetails.jsx');
  assert.match(src, /import \{ addFavorite, getFavoriteStatus, removeFavorite \} from "\.\.\/services\/favoriteService"/);
  assert.match(src, /const next = await getFavoriteStatus\(id\)/);
  assert.match(src, /await addFavorite\(id\)/);
  assert.match(src, /await removeFavorite\(id\)/);
  assert.match(src, /onClick=\{handleFavorite\}/);
  assert.match(src, /aria-pressed=\{isFavorite\}/);
});

test('details heart reacts to auth and favorites changed across the application', () => {
  const src = file('src/pages/ParkingDetails.jsx');
  assert.match(src, /subscribeToAuth\(\(sessionUser\) => refresh\(sessionUser\)\)/);
  assert.match(src, /"fazajoo:favorites-changed"/);
  assert.match(src, /favoriteLoading \|\| favoriteChanging/);
  assert.match(src, /getCurrentSessionUser\(\)/);
});

test('edit screen resets previous scroll position for each listing ID', () => {
  const src = file('src/pages/EditParking.jsx');
  assert.match(src, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "instant" \}\)/);
  assert.match(src, /\}, \[id\]\);/);
});

test('land missing purpose error appears beside its choices and scrolls into view', () => {
  const src = file('src/components/LandOfferFields.jsx');
  assert.match(src, /id="land-offer-purposes"/);
  assert.match(src, /errorTarget === "purposes" && <p role="alert" className="fj-lo-inline-error">\{error\}<\/p>/);
  assert.match(src, /scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/);
  assert.match(src, /error\.startsWith\("حداقل یک کاربرد"\)/);
});

test('other land validation messages remain visible next to their fields', () => {
  const src = file('src/components/LandOfferFields.jsx');
  assert.match(src, /id="land-offer-type"/);
  assert.match(src, /id="land-offer-road"/);
  assert.match(src, /id="land-offer-extra"/);
  assert.match(src, /errorTarget === "extra" && <p role="alert"/);
  assert.match(file('src/components/LandOfferFields.css'), /\.fj-lo-group--invalid/);
});
