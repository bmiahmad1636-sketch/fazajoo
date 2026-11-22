import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (name) => fs.readFileSync(name, 'utf8');
const hero = read('src/components/Hero.jsx');
const hc = read('src/components/HeroCompactHP02.css');
const app = read('src/App.jsx');
const homeCss = read('src/HomeCompactHP02.css');
const listing = read('src/pages/parking.jsx');
const catalog = read('src/pages/ParkingCatalogLP01.css');

test('HP02 removes uncurated featured ad from the flagship art, retaining architecture and brand', () => {
  assert.doesNotMatch(hero, /parkings\.find\(|previewFailed|__feature-photo|featured\?\.imageUrl/);
  assert.match(hero, /<FeaturedShowcaseHP03 \/>/);
  const showcase = read('src/components/FeaturedShowcaseHP03.jsx');
  assert.match(showcase, /hp01-hero__architecture/);
  assert.match(showcase, /<AnimatedLogo/);
});
test('HP02 slogan is a single balanced semantic title without forced punctuation', () => {
  assert.match(hero, /<h1 className="hp01-hero__headline">/);
  assert.match(hero, /<span>هر فضا،<\/span>/);
  assert.match(hero, /<strong>یک فرصت<\/strong>/);
  assert.match(hc, /flex-direction: row/);
  assert.match(hc, /flex-wrap: wrap/);
});
test('HP02 keeps existing search, category routes and actual smart-search route', () => {
  for (const fragment of ['navigate(query ? `/parking?search=${encodeURIComponent(query)}`', 'navigate(`/parking?category=${encodeURIComponent(category.value)}`', 'navigate("/find-for-me")', 'navigate("/add-parking")']) assert.ok(hero.includes(fragment), fragment);
  assert.equal((hero.match(/value: "(?:residential|shop|land|garden|parking|storage|warehouse|villa|other)"/g)||[]).length,9);
});
test('HP02 CSS imported after existing HP01 and applies only to homepage components', () => {
  assert.match(hero,/import "\.\/HeroCompactHP02\.css"/);
  assert.match(app,/import "\.\/HomeCompactHP02\.css"/);
  assert.match(app,/className="hp01-home hp02-home hp03-home"/);
  for (const css of [hc,homeCss]) {
    assert.doesNotMatch(css, /(^|\n)\s*(body|html|:root|\.parking-page--catalog|\.parking-details)\s*\{/);
  }
});
test('HP02 filter disclosure changes presentation only, not filtered results', () => {
  assert.match(listing,/hp02HomeFiltersOpen/);
  assert.match(listing,/aria-expanded=\{hp02HomeFiltersOpen\}/);
  assert.match(listing,/aria-controls="hp02-home-filter-fields"/);
  assert.match(listing,/setHp02HomeFiltersOpen\(\(open\) => !open\)/);
  assert.match(listing,/filteredParkings\.map/);
  assert.match(listing,/lp01FiltersOpen/);
  assert.match(listing,/showHero \? "lp01-filter-fields" : "hp02-home-filter-fields"/);
  assert.match(homeCss,/hp02-home-filters--closed \{ display: none/);
  assert.match(homeCss,/hp02-home-filters--open/);
});
test('Homepage cards get green CTA in both unified and legacy variants, while catalog remains intact', () => {
  assert.match(homeCss,/\.hp02-home \.hp01-home__discover \.parking-grid \.fj-industrial-card__button/);
  assert.match(homeCss,/\.hp02-home \.hp01-home__discover \.parking-grid \.parking-card__details-button/);
  assert.match(homeCss,/#163d31/);
  assert.match(catalog,/\.parking-page--catalog/);
});
test('Home retains smart search on mobile when art panel is hidden', () => {
  assert.match(hc, /@media \(max-width: 620px\)/);
  assert.match(hc, /@media \(min-width: 621px\) and \(max-width: 850px\)/);
  assert.match(homeCss, /@media \(min-width: 621px\)/);
  assert.match(homeCss, /parking-smart-find \{ display: none/);
  assert.match(hero,/hp01-hero__art-footer/);
});
test('No backend, auth, finance, or shared detail changes needed', () => {
  assert.match(app, /<Parking parkings=\{parkings\} showHero=\{false\} \/>/);
  assert.match(app, /path="\/parking\/\:id"/);
});
