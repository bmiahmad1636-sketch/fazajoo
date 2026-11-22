import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = file => readFileSync(new URL('../'+file, import.meta.url), 'utf8');
const my = read('src/pages/MyParkings.jsx');
const fav = read('src/pages/Favorites.jsx');
const mp = read('src/pages/MyParkingsMP05.css');
const fc = read('src/pages/FavoritesFV05.css');
const old = read('src/pages/MyParkingsMP04.css');
const oldFav = read('src/pages/FavoritesFV04.css');

test('MPFV05 loads only page-scoped overrides after approved MPFV04',()=>{
  assert.match(my,/import "\.\/MyParkingsMP04\.css";\s*import "\.\/MyParkingsMP05\.css";/);
  assert.match(fav,/import "\.\/FavoritesFV04\.css";\s*import "\.\/FavoritesFV05\.css";/);
  assert.doesNotMatch(mp,/\.favorites-page|\.parking-page--catalog|\.parking-details-page|url\(https?:/);
  assert.doesNotMatch(fc,/\.my-parkings-page|\.parking-page--catalog|\.parking-details-page|url\(https?:/);
});

test('MPFV05 retains the approved card grid, photo, border and orange highlight',()=>{
  assert.match(old,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(old,/gap:20px/);
  assert.match(old,/height:184px/);
  assert.match(old,/\.my-parking-card::before/);
  assert.match(oldFav,/gap:20px/);
  assert.doesNotMatch(mp,/\.my-parkings-grid|\.my-parking-card__media|\.my-parking-card::before/);
});

test('MPFV05 first glance includes title, city, area, price and details link',()=>{
  for (const part of ['my-parking-card__heading','my-parking-card__overview','my-parking-card__city','my-parking-card__area','my-parking-card__price','formatRialPrice','/parking/${parking.id}'])
    assert.ok(my.includes(part),part);
  assert.match(my,/fallback:\s*"توافقی"/);
  assert.doesNotMatch(my,/className="my-parking-card__eyebrow"/);
  assert.doesNotMatch(my,/className="my-parking-card__status-copy"/);
  assert.doesNotMatch(my,/className="my-parking-card__facts"/);
});

test('MPFV05 uses a native keyboard-accessible management disclosure',()=>{
  assert.match(my,/<details className="my-parking-card__management">/);
  assert.match(my,/<summary aria-label=\{`مدیریت آگهی/);
  assert.match(my,/<label htmlFor=\{`status-\$\{parking.id\}`\}>/);
  assert.match(my,/<select\s+id=\{`status-\$\{parking.id\}`\}/);
  assert.match(my,/handleStatusChange\(parking.id, event.target.value\)/);
  assert.match(my,/disabled=\{updatingId === parking.id\}/);
  assert.match(my,/to=\{`\/edit-parking\/\$\{parking.id\}`\}/);
  assert.match(mp,/:focus-visible/);
});

test('MPFV05 retains fetch, status update, status filters, search and error handling',()=>{
  for(const text of ['getMySpaces','subscribeToAuth','getCurrentSessionUser','updateSpace(parkingId, { status: newStatus })','showInSiteAlert','setStatusFilter','setSearchTerm','setUpdatingId'])
    assert.ok(my.includes(text),text);
  for(const status of ['active','rented','inactive']) assert.ok(my.includes(`value="${status}"`),status);
});

test('MPFV05 favorites does not replace shared card, service or remove-confirmation modal',()=>{
  for(const x of ['<ParkingCard','getFavorites','removeFavorite','openRemoveDialog','handleRemoveFavorite','role="dialog"','aria-modal="true"'])
    assert.ok(fav.includes(x),x);
  assert.match(fc,/\.favorites-page \.favorites-item \.fj-industrial-card__favorite/);
  assert.match(fc,/\.favorites-page \.favorites-item__remove/);
});

test('MPFV05 has mobile settings and motion accessibility',()=>{
  assert.match(mp,/@media\(max-width:520px\)/);
  assert.match(mp,/@media\(max-width:345px\)/);
  assert.match(mp, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(mp, /summary::-webkit-details-marker/);
  assert.match(mp, /summary:focus-visible/);
  assert.doesNotMatch(mp, /position:fixed|\!important;\s*display:none/);
});
