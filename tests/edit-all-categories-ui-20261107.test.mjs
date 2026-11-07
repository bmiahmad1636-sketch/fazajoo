import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  EDIT_LISTING_CATEGORY_LABELS,
  editListingCategoryLabel,
  editListingTitle,
  editListingBaseHint,
  editListingTitlePlaceholder,
} from '../src/utils/editListingLabels.js';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const categories = [
  ['parking','پارکینگ'], ['residential','مسکونی'], ['villa','ویلا'],
  ['storage','انبار'], ['warehouse','سوله و کارگاه'], ['shop','مغازه'],
  ['garden','باغ'], ['land','زمین'], ['other','سایر فضاها'],
];
for (const [category,label] of categories) {
  test(`Edit category ${category}: offer/request headings, hints and placeholders match ${label}`, () => {
    assert.equal(EDIT_LISTING_CATEGORY_LABELS[category], label);
    assert.equal(editListingCategoryLabel(category),label);
    assert.equal(editListingTitle(category,false),`ویرایش آگهی ${label}`);
    assert.equal(editListingTitle(category,true),`ویرایش درخواست ${label}`);
    for (const isWanted of [false,true]) {
      assert.match(editListingBaseHint(category,isWanted), category==='other' ? /نام فضای/ : new RegExp(label));
      assert.match(editListingTitlePlaceholder(category,isWanted),new RegExp(isWanted?'درخواست':'مثلاً'));
      assert.ok(editListingBaseHint(category,isWanted).length>20);
    }
    if (category!=='parking') assert.doesNotMatch(editListingBaseHint(category,false),/پارکینگ/);
  });
}
test('Unknown category is never silently shown as parking',()=>{
 assert.equal(editListingTitle('unknown',false),'ویرایش آگهی فضا');
 assert.equal(editListingTitle('unknown',true),'ویرایش درخواست فضا');
});
test('Shared EditParking route renders category-specific headings, help, previews, photo descriptions',()=>{
 const jsx=read('src/pages/EditParking.jsx');
 assert.match(jsx,/<h1>\{editListingTitle\(parking\?\.category, isWanted\)\}<\/h1>/);
 assert.match(jsx,/<p>\s*\{editListingBaseHint\(parking\?\.category, isWanted\)\}/);
 assert.match(jsx,/placeholder=\{editListingTitlePlaceholder\(parking\?\.category, isWanted\)\}/);
 assert.match(jsx,/aria-label=\{`درخواست \$\{spaceCategoryLabel\} بدون نیاز به تصویر`\}/);
 assert.match(jsx,/`تصویر \$\{spaceCategoryLabel\}`/);
 assert.match(jsx,/`شهر \$\{spaceCategoryLabel\}`/);
 assert.doesNotMatch(jsx,/<h1>\{isWanted \? "ویرایش درخواست پارکینگ"/);
 assert.doesNotMatch(jsx,/عنوان، موقعیت و اندازه پارکینگ را ویرایش کن/);
});
test('All nine offer editors keep the form after the hero; wanted flow stays distinct',()=>{
 const jsx=read('src/pages/EditParking.jsx');
 const css=read('src/pages/EditParking.css');
 assert.match(jsx,/isWanted \? " edit-parking-page--wanted" : " edit-parking-page--offer"/);
 assert.match(css,/\.edit-parking-page--offer \.edit-parking-content\s*\{\s*margin-top:\s*22px/);
 assert.match(css,/@media \(max-width: 760px\)\s*\{\s*\.edit-parking-page--offer \.edit-parking-hero\s*\{ padding-bottom: 22px/);
 assert.match(css,/\.edit-parking-page--wanted \.edit-parking-content\s*\{\s*margin-top: 22px/);
 assert.match(css,/\.edit-parking-hero \.edit-parking-hero__meta strong\s*\{\s*color: #20342d/);
});
test('Existing category menus and detail labels match all nine types; villa card fallback is repaired',()=>{
 const add=read('src/pages/AddParking.jsx');
 const details=read('src/pages/ParkingDetails.jsx');
 const card=read('src/components/ParkingCard.jsx');
 for(const [category] of categories) {
  assert.match(add, new RegExp(`value: "${category}"`));
  assert.match(details, new RegExp(`\\b${category}: \\{`));
  assert.match(card, new RegExp(`\\b${category}: \\{`));
 }
 assert.match(card,/villa:\s*\{\s*label:\s*"ویلا",\s*icon:\s*"🏡"/);
});
test('Wanted preview does not reuse parking usage labels for unrelated categories',()=>{
 const s=read('src/pages/EditParking.jsx');
 assert.match(s,/parking\?\.category === "parking" \? parkingUsageLabel\(form\.parkingRequestUsage, form\.parkingOtherUsage\) : \(form\.title\.trim\(\)/);
});
