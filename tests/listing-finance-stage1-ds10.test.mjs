import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LISTING_FINAL_CATEGORIES, shouldAskGenericPriceAtFinalStep, shouldAskVillaShortRateAtFirstStep, validateVillaShortRate, villaOfferPreviewAtFinalStep} from '../src/utils/listingFinalDS09.js';
import {VILLA_OFFER_DEFAULT, villaListingPrice, makeVillaAttributes, villaFinancialRows} from '../src/utils/villaOffer.js';
import {GARDEN_OFFER_DEFAULT, validateGardenFinancialRent, gardenListingPrice} from '../src/utils/gardenOffer.js';
const read = p=>readFileSync(new URL('../'+p, import.meta.url),'utf8');
const add = read('src/pages/AddParking.jsx');
const villa = read('src/components/VillaOfferFields.jsx');
const edit = read('src/pages/EditParking.jsx');
const stepOne = add.slice(add.indexOf('if (step === 1) {'),add.indexOf('if (step === 2) {'));
const stepThreeValidation = add.slice(add.indexOf('if (step === 3) {'),add.indexOf('setErrors(newErrors);'));
const stepThreeUI = add.slice(add.indexOf('{currentStep === 3 && ('),add.indexOf('<div className="add-parking-actions">'));

test('all 18 category paths: no final-step price prompt',()=>{
  assert.equal(LISTING_FINAL_CATEGORIES.length,9);
  assert.equal(new Set(LISTING_FINAL_CATEGORIES).size,9);
  for (const cat of LISTING_FINAL_CATEGORIES) {
    for (const wanted of [true,false]) for (const term of ['short','long']) {
      assert.equal(shouldAskGenericPriceAtFinalStep(cat,wanted,term),false,`${cat} ${wanted?'request':'offer'} ${term}`);
      assert.equal(shouldAskVillaShortRateAtFirstStep(cat,wanted,term),cat==='villa' && !wanted && term==='short');
    }
  }
  assert.doesNotMatch(stepThreeValidation,/newErrors\.price|validateGardenFinancialRent|validateVillaShortRate/);
  assert.doesNotMatch(stepThreeUI,/id="price"|id="priceType"|name="price"|onChange=\{handleChange\}/);
  assert.match(stepThreeUI,/htmlFor="phone"/);
});

test('villa short-stay pricing is collected and validated at step one, never in last step',()=>{
  assert.match(stepOne,/if \(!isWantedAd && form\.category === "villa"\)/);
  assert.match(stepOne,/validateVillaOffer\(form\.villaOffer, form\.villaDetails, form\.area\)/);
  assert.match(stepOne,/shouldAskVillaShortRateAtFirstStep\(form\.category, isWantedAd, form\.villaOffer\?\.rentalTerm\)/);
  assert.match(stepOne,/validateVillaShortRate\(form\.price, form\.priceType\)/);
  assert.match(add,/shortRate=\{form\.price\} shortRateType=\{form\.priceType\} shortRateError=\{errors\.price\}/);
  assert.match(add,/!isWantedAd && \["other", "villa"\]\.includes\(form\.category\)/);
  assert.match(villa,/id="villa-short-stay-period"/);
  assert.match(villa,/id="villa-short-stay-amount"/);
  assert.match(villa,/typeof onShortRateChange === "function"/);
  assert.match(villa,/moneyField\("fj-villa-deposit"/);
  assert.doesNotMatch(villa,/قیمت هر دوره در مرحله آخر مشخص می‌شود/);
  assert.match(add,/هزینه اقامت و ضمانت خسارت در مرحله اول ثبت شده‌اند/);
});

test('period, money, optional deposit are separate and retain real canonical API fields',()=>{
  for (const period of ['daily','weekly','monthly']) {
    for (const v of ['25000000','25,000,000','۲۵٬۰۰۰٬۰۰۰','٢٥٬٠٠٠٬٠٠٠'])
      assert.equal(validateVillaShortRate(v,period),'',`${v} ${period}`);
    for (const v of ['', '0', '-1', '12abc', '1000000000000000'])
      assert.notEqual(validateVillaShortRate(v,period),'',`${v} ${period}`);
  }
  assert.equal(validateVillaShortRate('', 'negotiable'),'');
  assert.notEqual(validateVillaShortRate('25000000', 'yearly'),'');
  const offer={...VILLA_OFFER_DEFAULT, accommodationType:'villa', availableStays:['daily'], rentalTerm:'short', depositRial:'200000000'};
  const attrs=makeVillaAttributes(offer,{});
  assert.equal(villaListingPrice(offer,'25000000','daily').price,'25000000');
  assert.equal(villaListingPrice(offer,'25000000','daily').priceType,'daily');
  assert.equal(villaListingPrice(offer,'','negotiable').price,'');
  assert.equal(villaListingPrice(offer,'','negotiable').priceType,'negotiable');
  assert.equal(attrs.values.depositRial,200000000);
  const rows=villaFinancialRows(attrs,'25000000','daily');
  assert.equal(rows.length,2);
  assert.match(rows[0].label,/اقامت/);
  assert.match(rows[1].label,/ضمانت خسارت/);
  assert.match(villaOfferPreviewAtFinalStep(attrs,'25000000','daily'),/۲۵٬۰۰۰٬۰۰۰/);
});

test('long villa, villa demand, and edit retain their own independent finance flow',()=>{
  const long={...VILLA_OFFER_DEFAULT,rentalTerm:'long',financialMode:'deposit_rent',longDepositRial:'2000000000',longMonthlyRentRial:'45000000'};
  assert.deepEqual(villaListingPrice(long, '100000', 'daily'),{price:'45000000',priceType:'monthly'});
  assert.equal(shouldAskVillaShortRateAtFirstStep('villa',true,'short'),false);
  assert.equal(shouldAskVillaShortRateAtFirstStep('villa',false,'long'),false);
  assert.match(add,/isWantedAd && form\.category === "villa" && \(\s*<VillaRequestFields/s);
  assert.match(edit,/<VillaOfferFields/);
  assert.doesNotMatch(edit,/onShortRateChange=/);
  assert.match(villa,/typeof onShortRateChange === "function"/);
});

test('all remaining eight category financial components remain in first step, with no duplicate final price',()=>{
  const stageOneUI=add.slice(add.indexOf('{currentStep === 1 && ('),add.indexOf('{currentStep === 2 && ('));
  const componentNames=[
    'ParkingRentalFields','StorageOfferFields','IndustrialOfferFields','ShopOfferFields','LandOfferFields',
    'ResidentialFields','GardenOfferFields','OtherOfferFields',
    'ParkingRequestDetailsFields','WarehouseRequestFields','ShedRequestFields','ShopRequestFields',
    'LandRentalFields','ResidentialRequestFields','VillaRequestFields','GardenRequestFields','OtherRequestFields',
  ];
  for(const component of componentNames) assert.ok(stageOneUI.includes('<'+component),component+' before next-step');
  assert.match(stepOne,/validateGardenFinancialRent\(form\.gardenOffer, form\.price, form\.priceType\)/);
  // Current garden offers have typed short/seasonal/long price fields; legacy guard is not a fresh final-step question.
  assert.equal(validateGardenFinancialRent({...GARDEN_OFFER_DEFAULT,rentalTerm:'short'},'', 'monthly'),'');
  assert.equal(gardenListingPrice({...GARDEN_OFFER_DEFAULT,rentalTerm:'short',shortRateUnit:'daily',shortRateRial:'15000000'},'','monthly').price,'15000000');
});

test('DS10 touches only component display, validation step placement and front-end presentation',()=>{
  assert.match(add,/villaListingPrice\(form\.villaOffer,form\.price,form\.priceType\)/);
  assert.match(add,/priceType:.*villaListingPrice/s);
  assert.match(add,/onClick=\{saveParking\}/);
  assert.match(villa,/import "\.\/VillaShortStayFinanceDS10\.css"/);
  assert.match(read('src/components/VillaShortStayFinanceDS10.css'),/\.fj-vo__short-rate-grid/);
});
