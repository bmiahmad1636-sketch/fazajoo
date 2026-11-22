import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = file=>readFileSync(new URL('../'+file, import.meta.url),'utf8');
const my=read('src/pages/MyParkings.jsx');
const fav=read('src/pages/Favorites.jsx');
const mc=read('src/pages/MyParkingsMP04.css');
const fc=read('src/pages/FavoritesFV04.css');

test('MPFV04 loads new strictly scoped card CSS after MPFV01',()=>{
  assert.match(my,/import "\.\/MyParkingsMP01\.css";\s*import "\.\/MyParkingsMP04\.css";/);
  assert.match(fav,/import "\.\/FavoritesFV01\.css";\s*import "\.\/FavoritesFV04\.css";/);
  assert.doesNotMatch(mc, /\.favorites-page|\.parking-page--catalog|\.parking-details-page/);
  assert.doesNotMatch(fc, /\.my-parkings-page|\.parking-page--catalog|\.parking-details-page/);
});
test('MPFV04 reflows personal cards to complete photo-top editorial format',()=>{
  assert.match(mc,/\.my-parkings-page \.my-parking-card__media\s*\{[^}]*height:184px/s);
  assert.match(mc,/\.my-parkings-page \.my-parking-card__media img,/);
  assert.match(mc,/position:absolute;\s*inset:0;\s*width:100%;height:100%;/);
  assert.match(mc,/\.my-parkings-page \.my-parking-card\s*\{[^}]*display:flex;[^}]*flex-direction:column/s);
  assert.match(mc,/\.my-parkings-page \.my-parkings-grid\s*\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/s);
});
test('MPFV04 keeps price, city, size and status-management controls readable',()=>{
  assert.match(mc,/\.my-parkings-page \.my-parking-card__facts>div:last-child/);
  assert.match(mc,/\.my-parkings-page \.my-parking-card__status-control\s*\{[^}]*grid-template-columns:/s);
  for(const term of ['handleStatusChange','getMySpaces','updateSpace','setStatusFilter','setSearchTerm','formatRialPrice','/edit-parking/'])
    assert.ok(my.includes(term),term);
});
test('MPFV04 retains favorite card component, confirmation, removal and shared styles',()=>{
  for(const term of ['ParkingCard','getFavorites','removeFavorite','openRemoveDialog','handleRemoveFavorite','role="dialog"','aria-modal="true"'])
    assert.ok(fav.includes(term), term);
  assert.match(fc,/\.favorites-page \.favorites-item>\.parking-card,/);
  assert.match(fc,/\.favorites-page \.favorites-item>\.fj-industrial-card/);
  assert.match(fc,/\.favorites-page \.favorites-item__remove/);
});
test('MPFV04 aligns actions in both pages and removes card hover movement',()=>{
  assert.match(mc,/\.my-parkings-page \.my-parking-card:hover,[\s\S]*transform:none!important/);
  assert.match(fc,/\.favorites-page \.favorites-item:hover,[\s\S]*transform:none!important/);
  assert.match(mc,/\.my-parkings-page \.my-parking-card__action--secondary/);
  assert.match(fc,/\.favorites-page \.favorites-item \.parking-card__details-button/);
});
test('MPFV04 responsive layouts include desktop, tablet, mobile and reduced motion',()=>{
  for(const r of ['max-width:1330px','max-width:840px','max-width:520px','prefers-reduced-motion:reduce'])
    assert.ok(mc.includes(r),r);
  for(const r of ['max-width:1130px','max-width:700px','prefers-reduced-motion:reduce'])
    assert.ok(fc.includes(r),r);
  assert.doesNotMatch(mc,/position:fixed|@import|url\(https?:/);
  assert.doesNotMatch(fc,/position:fixed|@import|url\(https?:/);
});
