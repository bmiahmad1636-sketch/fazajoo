import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import POLICY from '../shared/rental-term-policy.v1.json' with {type:'json'};
import { validateRentalTermProfile } from '../shared/rental-term-core.mjs';
import { validateParkingRentalOffer, validateParkingRentalRequest } from '../src/utils/parkingRental.js';
import { STORAGE_OFFER_DEFAULT, makeStorageAttributes, storageOfferFromAttributes } from '../src/utils/storageOffer.js';
import { EMPTY_WAREHOUSE_REQUEST, readWarehouseRequest, writeWarehouseRequest } from '../src/utils/warehouseRequest.js';
import { STORAGE_RENTAL_OPTIONS, validateStorageRental, storageListingPrice, storageFinancialHeadline, storageMoneyRows, changeStorageUnit, changeStorageTerm, pickStorageRental } from '../src/utils/storageRental.js';
import { readRentalTermSnapshot, inspectListingRentalAlignment } from '../src/utils/rentalTermBridge.js';
const require = createRequire(import.meta.url);
const { cleanParkingFinance, validateParkingFinance } = require('../backend/src/utils/parkingRentalFinance.js');
const { cleanStorageFinance, validateStorageFinance, storageFinancePrice } = require('../backend/src/utils/storageRentalFinance.js');
const { cleanStorageSpaceAttributes } = require('../backend/src/utils/storageSpaceAttributes.js');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const make=(wanted=false,unit='month')=>({
  ...(wanted?EMPTY_WAREHOUSE_REQUEST:STORAGE_OFFER_DEFAULT),
  rentalTerm:'short',shortRateUnit:unit,
  ...(wanted ? {maxBudgetRial:'18000000',maxSecurityHoldRial:'9000000',purpose:'commercial',minArea:'25',maxArea:'90'}
            : {shortRateRial:'18000000',securityHoldRial:'9000000',spaceType:'indoor',allowedPurposes:['commercial'],access:'24h',loadingMethod:'ramp',features:['security']})
});
const asAd=(x,wanted)=>wanted?({category:'storage',listingType:'wanted',description:writeWarehouseRequest('انبار مناسب',x)}):({category:'storage',listingType:'offer',spaceAttributes:makeStorageAttributes(x)});
test('one shared RT-00 policy adds month only for short storage and keeps long month/year',()=>{
 assert.deepEqual(STORAGE_RENTAL_OPTIONS.rateUnitsByTerm.short,['day','week','month']);
 assert.deepEqual(STORAGE_RENTAL_OPTIONS.rateUnitsByTerm.long,['month','year']);
 assert.deepEqual(POLICY.categories.parking.rateUnitsByTerm.short,['hour','day','week']);
 assert.deepEqual(POLICY.categories.warehouse.rateUnitsByTerm.short,['day','week','month']);
});
for(const wanted of [false,true]) {
 for(const unit of ['day','week','month'])test(`${wanted?'wanted':'offer'} storage short ${unit} price, validation, persistence and display`,()=>{
  const x=make(wanted,unit);
  assert.equal(validateStorageRental(x,wanted),'');
  assert.equal(validateStorageFinance(x,wanted),'');
  const expected=unit==='month'?'monthly':unit==='week'?'weekly':'daily';
  assert.deepEqual(storageListingPrice(x,wanted),{price:'18000000',priceType:expected});
  assert.deepEqual(storageFinancePrice(x,wanted),{price:'18000000',priceType:expected});
  assert.equal(cleanStorageFinance(x,wanted).shortRateUnit,unit);
  const ad=asAd(x,wanted),snapshot=readRentalTermSnapshot(ad);
  assert.equal(snapshot.ok,true,JSON.stringify(snapshot.errors));
  assert.equal(snapshot.profile.primaryTerm,'short');
  assert.equal(snapshot.profile.rateUnit,unit);
  const restored=wanted?readWarehouseRequest(ad.description).data:storageOfferFromAttributes(ad.spaceAttributes);
  assert.equal(restored.shortRateUnit,unit);
  assert.equal(restored.rentalTerm,'short');
  assert.equal(restored[wanted?'maxSecurityHoldRial':'securityHoldRial'],'9000000');
  assert.match(storageFinancialHeadline(restored,wanted),new RegExp(unit==='month'?'ماهانه':unit==='week'?'هفتگی':'روزانه'));
  assert.equal(storageMoneyRows(restored,wanted).length,2);
 });
 test(`${wanted?'wanted':'offer'} changing week to short/month keeps specs and guarantee but resets amount`,()=>{
  const x=make(wanted,'week');
  const changed=changeStorageUnit(x,'month',wanted);
  assert.equal(changed.rentalTerm,'short');
  assert.equal(changed.shortRateUnit,'month');
  assert.equal(changed[wanted?'maxBudgetRial':'shortRateRial'],'');
  assert.equal(changed[wanted?'maxSecurityHoldRial':'securityHoldRial'],'9000000');
  assert.equal(changed[wanted?'purpose':'spaceType'],wanted?'commercial':'indoor');
  assert.equal(changed[wanted?'minArea':'access'],wanted?'25':'24h');
  const completed={...changed,[wanted?'maxBudgetRial':'shortRateRial']:'22000000'};
  assert.deepEqual(storageListingPrice(completed,wanted),{price:'22000000',priceType:'monthly'});
  const back=changeStorageUnit(completed,'week',wanted);
  assert.equal(back.shortRateUnit,'week');
  assert.equal(back[wanted?'maxBudgetRial':'shortRateRial'],'');
  assert.equal(back[wanted?'purpose':'spaceType'],wanted?'commercial':'indoor');
 });
 test(`${wanted?'wanted':'offer'} contract short/month does not create long-term mortgage or rent`,()=>{
  const x={...make(wanted),financialMode:'deposit_rent',longRateUnit:'month',longDepositRial:'999999',longMonthlyRentRial:'888888',maxDepositRial:'777777',maxRentRial:'666666'};
  const cleaned=pickStorageRental(x,wanted);
  assert.equal(cleaned.financialMode,'');
  for(const key of ['longDepositRial','longMonthlyRentRial','maxDepositRial','maxRentRial'])assert.ok(!cleaned[key],key+' must not survive short-term cleaning');
  assert.equal(validateStorageRental(cleaned,wanted),'');
  const newLong=changeStorageTerm(x,'long',wanted);
  assert.equal(newLong[wanted?'maxBudgetRial':'shortRateRial'],'');
  assert.equal(newLong[wanted?'purpose':'spaceType'],wanted?'commercial':'indoor');
 });
 test(`${wanted?'wanted':'offer'} month/short cannot accidentally enable monthly in parking`,()=>{
  const x=make(wanted);
  assert.ok(wanted?validateParkingRentalRequest(x):validateParkingRentalOffer(x));
  assert.ok(validateParkingFinance(x,wanted));
  assert.equal(cleanParkingFinance(x,wanted).shortRateUnit,null);
  assert.equal(validateParkingFinance(x,wanted,'storage'),'');
 });
}
test('RT-00 monthly short term remains short, not long-term; alternative duration still needs review',()=>{
 const offer=asAd({...make(false),canNegotiateOtherTerm:false},false);
 const request=asAd(make(true),true);
 assert.equal(inspectListingRentalAlignment(offer,request).status,'compatible_term');
 const longRequest=asAd({...make(true),rentalTerm:'long',financialMode:'rent_only',maxRentRial:'20000000'},true);
 assert.equal(inspectListingRentalAlignment(offer,longRequest).status,'incompatible_term');
 const alt=asAd({...make(false),canNegotiateOtherTerm:true},false);
 assert.equal(inspectListingRentalAlignment(alt,longRequest).status,'needs_review');
});
test('backend clean typed storage offer preserves short/month, no forged generic key',()=>{
 const payload=makeStorageAttributes(make());
 const cleaned=cleanStorageSpaceAttributes(payload,'storage','offer');
 assert.equal(cleaned.values.shortRateUnit,'month');
 assert.equal(cleaned.values.shortRateRial,18000000);
 assert.equal(cleaned.values.longMonthlyRentRial,null);
 assert.equal(validateStorageFinance(cleaned.values),'');
});
test('UI period labels, edit and details reuse rentalTerm and not a second engine',()=>{
 assert.match(read('src/components/ParkingRentalFields.jsx'),/month:"ماهانه"/);
 for(const p of ['src/pages/AddParking.jsx','src/pages/EditParking.jsx','src/components/ParkingCard.jsx','src/pages/ParkingDetails.jsx']){
  const source=read(p);
  assert.match(source,/storage/);
 }
 assert.match(read('src/utils/storageRental.js'),/validateRentalTermProfile/);
});
test('price API remains canonically monthly for short/month without retyping rentalTerm',()=>{
 const src=read('backend/src/controllers/spaces.controller.js');
 assert.match(src,/storageFinancePrice\(typedStorage.values,false\)/);
 assert.match(src,/storageFinancePrice\(wantedStorage,true\)/);
 const parsed=make();
 assert.equal(validateRentalTermProfile({category:'storage',side:'offer',primaryTerm:'short',rateUnit:'month',rateAmountRial:parsed.shortRateRial,securityHoldRial:parsed.securityHoldRial},POLICY,{requireTerm:true}).ok,true);
 assert.equal(validateRentalTermProfile({category:'parking',side:'offer',primaryTerm:'short',rateUnit:'month',rateAmountRial:parsed.shortRateRial},POLICY,{requireTerm:true}).ok,false);
});
