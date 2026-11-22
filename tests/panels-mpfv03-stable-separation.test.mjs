import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const my = readFileSync(new URL("../src/pages/MyParkingsMP01.css", import.meta.url), "utf8");
const fav = readFileSync(new URL("../src/pages/FavoritesFV01.css", import.meta.url), "utf8");
const block = (css, selector) => {const start = css.indexOf(selector+" {"); assert.notEqual(start,-1); const end=css.indexOf("}",start);return css.slice(start,end+1)};
test("listing grid restores distinct card spacing and removes continuous frame",()=>{
  const b=block(my,'.my-parkings-page .my-parkings-grid');
  assert.match(b,/gap:18px/);
  assert.match(b,/padding:0/);
  assert.match(b,/background:transparent/);
  assert.match(b,/overflow:visible/);
  assert.doesNotMatch(b,/gap:3px/);
});
test("listing hover no longer shifts card or enlarges its photo",()=>{
  assert.match(block(my,'.my-parkings-page .my-parking-card:hover'),/transform:none!important/);
  assert.match(my,/\.my-parkings-page \.my-parking-card:hover \.my-parking-card__media img/);
  assert.match(my,/transform:none!important/);
});
test("favorites grid has separate balanced cards",()=>{
  const b=block(fav,'.favorites-page .favorites-grid');
  assert.match(b,/gap:18px/);
  assert.match(b,/padding:0/);
  assert.match(b,/background:transparent/);
  assert.doesNotMatch(b,/gap:3px/);
});
test("favorites item and shared card hover do not translate",()=>{
  assert.match(block(fav,'.favorites-page .favorites-item:hover'),/transform:none!important/);
  assert.match(fav,/\.favorites-page \.favorites-item:hover>\.fj-industrial-card/);
  assert.match(fav,/\.favorites-page \.favorites-item:hover>\.parking-card/);
});
test("responsive card gutters remain separated",()=>{
  assert.match(my,/grid-template-columns:1fr;gap:16px;padding:0/);
  assert.match(my,/\.my-parkings-page \.my-parkings-grid \{gap:14px;/);
  assert.match(fav,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:16px;padding:0/);
  assert.match(fav,/grid-template-columns:1fr;gap:14px;padding:0/);
});
