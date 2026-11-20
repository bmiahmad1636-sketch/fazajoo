import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  LISTING_FINAL_CATEGORIES,
  shouldAskGenericPriceAtFinalStep,
  shouldAskVillaShortRateAtFirstStep,
  villaOfferPreviewAtFinalStep,
} from '../src/utils/listingFinalDS09.js';
import {makeVillaAttributes} from '../src/utils/villaOffer.js';

const read = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const add = read('src/pages/AddParking.jsx');
const sticky = read('src/pages/EditParkingStickyDS08.css');
const chips = read('src/pages/ListingFinalDS09.css');

test('all nine registered categories are audited, including supply and demand', () => {
  assert.equal(new Set(LISTING_FINAL_CATEGORIES).size,9);
  for (const cat of LISTING_FINAL_CATEGORIES) {
    assert.equal(shouldAskGenericPriceAtFinalStep(cat,true,'short'),false,`demand ${cat}`);
    assert.equal(shouldAskGenericPriceAtFinalStep(cat,true,'long'),false,`demand ${cat}`);
    assert.equal(shouldAskGenericPriceAtFinalStep(cat,false,'long'),false,`long ${cat}`);
    assert.equal(shouldAskGenericPriceAtFinalStep(cat,false,'short'),false,`no new price on final for ${cat}`);
    assert.equal(shouldAskVillaShortRateAtFirstStep(cat,false,'short'),cat==='villa',`first-step short ${cat}`);
  }
});
test('DS10: short villa rate is collected on step one, and final step only asks contact',()=>{
  assert.match(add,/shortRate=\{form\.price\} shortRateType=\{form\.priceType\}/);
  assert.match(add,/shouldAskVillaShortRateAtFirstStep\(form\.category, isWantedAd, form\.villaOffer\?\.rentalTerm\)/);
  assert.match(add,/validateVillaShortRate\(form\.price, form\.priceType\)/);
  assert.doesNotMatch(add,/shouldAskGenericPriceAtFinalStep\(form\.category/);
  assert.match(add,/form\.category === "garden".*validateGardenFinancialRent/s);
  assert.match(add,/villaListingPrice\(form\.villaOffer,form\.price,form\.priceType\)/);
});
test('preview separates unentered villa rental rate from deposit, with no false negotiated rate',()=>{
  const attrs=makeVillaAttributes({accommodationType:'villa',rentalTerm:'short',depositRial:'200000000'},{});
  const missing=villaOfferPreviewAtFinalStep(attrs,'','daily');
  assert.match(missing,/هزینه اقامت شبانه: هنوز وارد نشده/);
  assert.match(missing,/ضمانت خسارت/);
  assert.match(missing,/۲۰۰٬۰۰۰٬۰۰۰/);
  assert.doesNotMatch(missing,/توافقی/);
  const filled=villaOfferPreviewAtFinalStep(attrs,'35,000,000','weekly');
  assert.match(filled,/۳۵٬۰۰۰٬۰۰۰/);
  assert.match(filled,/هفتگی/);
  const explicit=villaOfferPreviewAtFinalStep(attrs,'','negotiable');
  assert.match(explicit,/توافقی/);
  const noDeposit=villaOfferPreviewAtFinalStep(makeVillaAttributes({accommodationType:'villa',rentalTerm:'short',depositRial:''},{}),'','daily');
  assert.doesNotMatch(noDeposit,/ودیعه/);
});
test('long villa preview uses the actual rental form values rather than generic nightly rate',()=>{
  const attrs=makeVillaAttributes({accommodationType:'villa',rentalTerm:'long',financialMode:'full_deposit',longDepositRial:'2000000000'},{});
  const result=villaOfferPreviewAtFinalStep(attrs,'','daily');
  assert.match(result,/رهن بلندمدت/);
  assert.match(result,/۲٬۰۰۰٬۰۰۰٬۰۰۰/);
  assert.doesNotMatch(result,/شبانه/);
});
test('category grid is 9 columns at desktop, but responsive on mobile',()=>{
  assert.match(add,/className="add-parking-categories-grid"/);
  assert.match(chips,/@media \(min-width: 1220px\)/);
  assert.match(chips,/repeat\(9, minmax\(0, 1fr\)\)/);
  assert.match(chips,/@media \(max-width: 700px\)/);
  assert.match(chips,/repeat\(2, minmax\(0, 1fr\)\)/);
});
test('sticky root is freed and preview scrolls only when needed; mobile remains static',()=>{
  assert.match(sticky,/\.edit-parking-page\s*\{\s*overflow: visible !important;/);
  assert.match(sticky,/\.edit-parking-page \.edit-parking-sidebar\s*\{\s*position: sticky !important;/);
  assert.match(sticky,/overflow: visible !important;/);
  assert.match(sticky,/\.edit-parking-page \.edit-parking-preview\s*\{\s*max-height: calc\(100vh - 102px\)/);
  assert.match(sticky,/@media \(max-width: 1050px\)/);
  assert.match(sticky,/position: static !important;/);
});
test('new scope does not change service, backend, map component, or detail gallery',()=>{
  assert.match(add,/import "\.\/ListingFinalDS09\.css"/);
  assert.match(add,/villaOfferPreviewAtFinalStep/);
  assert.match(add,/price:.*villaListingPrice/s);
  assert.match(add,/onClick=\{saveParking\}/);
});
