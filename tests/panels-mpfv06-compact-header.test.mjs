import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const jsx = read('src/pages/MyParkings.jsx');
const css = read('src/pages/MyParkingsMP06.css');
const previous = read('src/pages/MyParkingsMP05.css');

// This is intentionally a presentation-only change.
test('MPFV06 is imported after the approved MPFV05 layer', () => {
  assert.match(jsx, /import "\.\/MyParkingsMP05\.css";\s*import "\.\/MyParkingsMP06\.css";/);
});

test('MPFV06 retains the approved listing cards and media sizing', () => {
  assert.doesNotMatch(css, /\.my-parking-card(?:\b|__|--)/);
  assert.doesNotMatch(css, /\.favorites-page|\.parking-page--catalog|\.parking-details-page/);
  assert.match(previous, /\.my-parking-card__management summary/);
  assert.match(jsx, /<details className="my-parking-card__management">/);
});

test('MPFV06 only shortens the hero and the pre-list control panels', () => {
  for (const token of [
    '.my-parkings-hero__content',
    '.my-parkings-hero h1',
    '.my-parkings-summary-card',
    '.my-parkings-toolbar',
    '.my-parkings-search input',
    '.my-parkings-grid'
  ]) assert.ok(css.includes(token), token);
  assert.doesNotMatch(css, /position\s*:\s*fixed|display\s*:\s*none\s*!important/);
});

test('Wide-desktop three-card mode only hides duplicate hero description', () => {
  assert.match(css, /@media\s*\(min-width:\s*1331px\)/);
  assert.match(css, /\.my-parkings-hero p\s*\{display:none;\}/);
  assert.match(css, /\.my-parkings-summary-card\s*\{min-height:\s*55px/);
  assert.match(css, /\.my-parkings-grid\s*\{margin-top:\s*10px/);
});

test('MPFV06 restores readable mobile controls and retains search/status behavior', () => {
  assert.match(css, /@media\s*\(max-width:\s*720px\)/);
  assert.match(css, /@media\s*\(max-width:\s*340px\)/);
  assert.match(css, /\.my-parkings-add-button\s*\{min-height:\s*44px;\}/);
  for (const token of [
    'getMySpaces', 'updateSpace(parkingId, { status: newStatus })',
    'setStatusFilter', 'setSearchTerm', 'aria-pressed',
    'to="/add-parking"', 'my-parking-card__actions'
  ]) assert.ok(jsx.includes(token), token);
});
