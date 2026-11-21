import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/parking.jsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/ParkingCatalogLP01.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
const cards = fs.readFileSync(path.join(root, 'src/components/ParkingCard.jsx'), 'utf8');

const rules = (text) => [...text.matchAll(/(^|\n)([^{}]+)\{/g)].map((m) => m[2].trim());

test('LP-01 stylesheet imported and catalog scoping gated by showHero', () => {
  assert.match(page, /import "\.\/ParkingCatalogLP01\.css";/);
  assert.match(page, /className=\{showHero \? "parking-page parking-page--catalog" : "parking-page"\}/);
  assert.match(app, /showHero=\{false\}/);
  assert.match(app, /path="\/parking"/);
});

test('existing filter controls, sort and route links preserved', () => {
  for (const term of [
    'selectedCity','selectedListingType','selectedCategory','selectedPropertyType',
    'minimumBedrooms','minimumPrice','maximumPrice','sortType',
    'setSelectedCity','setSelectedCategory','setMinimumPrice','setMaximumPrice','clearFilters',
    'filteredParkings.map','<ParkingCard', 'to="/find-for-me"', 'to="/add-parking"',
  ]) assert.ok(page.includes(term), `Missing old functionality: ${term}`);
  assert.match(cards, /addFavorite/);
  assert.match(cards, /removeFavorite/);
  assert.match(cards, /return <UnifiedSpaceCard/);
  assert.match(cards, /return <IndustrialCardPilot/);
});

test('mobile filter disclosure is accessible, stateful and leaves state intact', () => {
  assert.match(page, /useState\(false\)/);
  assert.match(page, /aria-expanded=\{lp01FiltersOpen\}/);
  assert.match(page, /aria-controls="lp01-filter-fields"/);
  assert.match(page, /parking-filter__grid--lp01-open/);
  assert.match(page, /parking-filter__grid--lp01-closed/);
  assert.match(css, /\.parking-page--catalog \.parking-filter__grid--lp01-closed\s*\{\s*display: none;/);
  assert.match(css, /\.parking-page--catalog \.parking-filter__grid--lp01-open\s*\{\s*display: grid;/);
  assert.match(css, /\.parking-page--catalog \.parking-filter__mobile-toggle:focus-visible/);
});

test('LP-01 scoped visual stylesheet has no global element overrides', () => {
  assert.ok(css.length > 3000);
  for (const selector of rules(css)) {
    // Ignore comment strings and @media/@keyframes structures, and only inspect
    // the tail selector line (comments can contain opening periods).
    if (selector.startsWith('@') || selector.includes('*/')) continue;
    if (selector.startsWith('from ') || selector.startsWith('to ')) continue;
    for (const part of selector.split(',')) {
      const normalized = part.trim();
      if (!normalized) continue;
      assert.ok(normalized.includes('.parking-page--catalog'), `Unscoped selector: ${normalized}`);
    }
  }
  assert.match(css, /\.parking-page--catalog \.parking-grid \.fj-industrial-card/);
  assert.match(css, /\.parking-page--catalog \.parking-page__hero/);
});
