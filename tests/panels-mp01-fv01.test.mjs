import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');
const mine = read('src/pages/MyParkings.jsx');
const favorites = read('src/pages/Favorites.jsx');
const myCss=read('src/pages/MyParkingsMP01.css');
const favCss=read('src/pages/FavoritesFV01.css');

test('MP-01: dedicated styles loaded after original, scoped only to personal page',()=>{
 assert.ok(mine.includes('import "./MyParkings.css";\nimport "./MyParkingsMP01.css";'));
 assert.match(myCss,/\.my-parkings-page \.my-parkings-hero/);
 assert.doesNotMatch(myCss,/\.parking-page--catalog|\.favorites-page|\.parking-details-page/);
 assert.match(myCss,/@media\(max-width:720px\)/);
 assert.match(myCss,/@media\(max-width:410px\)/);
});
test('FV-01: dedicated styles scoped to favorites; mobile and reduced-motion retained',()=>{
 assert.ok(favorites.includes('import "./Favorites.css";\nimport "./FavoritesFV01.css";'));
 assert.match(favCss,/\.favorites-page \.favorites-hero/);
 assert.match(favCss,/@media\(max-width:700px\)/);
 assert.match(favCss, /prefers-reduced-motion:reduce/);
 assert.doesNotMatch(favCss,/\.parking-page--catalog|\.my-parkings-page|\.parking-details-page/);
});
test('MP-01: management functionality is preserved (filter, search, status update, edit)',()=>{
 for(const symbol of ['getMySpaces','updateSpace','handleStatusChange','setStatusFilter','setSearchTerm','filteredParkings','/add-parking','/edit-parking/','/parking/'])
  assert.ok(mine.includes(symbol),`Missing ${symbol}`);
 assert.equal((mine.match(/aria-pressed=\{statusFilter ===/g)||[]).length,4);
 assert.match(mine,/\bstatusFilter ===\s*"rented"/);
 assert.match(mine,/\bstatusFilter ===\s*"inactive"/);
});
test('FV-01: favorites removal still requires confirmation, card favorites remain functional',()=>{
 for(const symbol of ['ParkingCard','getFavorites','removeFavorite','openRemoveDialog','removeDialogOpen','handleRemoveFavorite','setFavorites','/parking'])
  assert.ok(favorites.includes(symbol),`Missing ${symbol}`);
 assert.match(favorites,/role="dialog"/);
 assert.match(favorites,/aria-modal="true"/);
});
test('FV-01: no parking-only wording or duplicate visible main heading',()=>{
 assert.ok(favorites.includes('فضاهایی که نشان کرده‌اید'));
 assert.ok(favorites.includes('فهرست ذخیره‌شده‌ها'));
 assert.match(favorites,/\s+علاقه‌مندی‌های من\s+<\/h1>/);
 assert.match(favorites,/\s+آگهی‌های ذخیره‌شده\s+<\/h2>/);
 assert.ok(!favorites.includes('همه پارکینگ‌هایی که پسندیده‌ای'));
});
test('Both personal pages: style changes are visual and no new network/database calls',()=>{
 for(const css of [myCss,favCss]){
   assert.ok(!css.includes('@import'));
   assert.ok(!css.includes('url(http'));
   assert.ok(!css.includes('position:fixed'));
 }
 assert.match(myCss,/\.my-parkings-page \.my-parking-card__facts/);
 assert.match(favCss,/\.favorites-page \.favorites-item \.fj-industrial-card__button/);
});
