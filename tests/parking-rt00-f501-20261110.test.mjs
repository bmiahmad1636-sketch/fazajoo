/** F5-01 parking registration+editing+presentation contract tests; no live DB involved. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import POLICY from '../shared/rental-term-policy.v1.json' with {type:'json'};
import {getRentalOptions, validateRentalTermProfile} from '../shared/rental-term-core.mjs';
import {PARKING_RENTAL_DEFAULT,PARKING_WANTED_FINANCE_DEFAULT,changeParkingRentalTerm,changeParkingFinancialMode,changeParkingRateUnit,validateParkingRentalOffer,validateParkingRentalRequest,parkingListingPrice,parkingFinancialRows} from '../src/utils/parkingRental.js';
import {PARKING_OFFER_DEFAULT,makeParkingAttributes,parkingOfferFormFromAttributes} from '../src/utils/parkingOffer.js';
import {EMPTY_PARKING_REQUEST,readParkingRequestDetails,writeParkingRequestDetails} from '../src/utils/parkingRequestDetails.js';
import {readRentalTermSnapshot,inspectListingRentalAlignment} from '../src/utils/rentalTermBridge.js';
const require=createRequire(import.meta.url);
const {cleanParkingSpaceAttributes}=require('../backend/src/utils/parkingSpaceAttributes.js');
const {cleanParkingFinance,validateParkingFinance,parkingFinancePrice,readWantedParkingFinance}=require('../backend/src/utils/parkingRentalFinance.js');
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const offerShort=(unit='hour')=>({...PARKING_RENTAL_DEFAULT,rentalTerm:'short',shortRateUnit:unit,shortRateRial:'2500000',securityHoldRial:'8000000'});
const wantShort=(unit='hour')=>({...EMPTY_PARKING_REQUEST,rentalTerm:'short',shortRateUnit:unit,maxBudgetRial:'3000000',maxSecurityHoldRial:'9000000'});
const offerLong=(mode='deposit_rent',unit='month')=>({...PARKING_RENTAL_DEFAULT,rentalTerm:'long',financialMode:mode,longRateUnit:unit,longMonthlyRentRial:unit==='month' && mode!=='full_deposit'?'12000000':'',longYearlyRentRial:unit==='year' && mode!=='full_deposit'?'150000000':'',longDepositRial:mode==='rent_only'?'':'200000000'});
const wantLong=(mode='deposit_rent',unit='month')=>({...PARKING_WANTED_FINANCE_DEFAULT,rentalTerm:'long',financialMode:mode,longRateUnit:unit,maxRentRial:mode==='full_deposit'?'':'15000000',maxDepositRial:mode==='rent_only'?'':'250000000'});
const listing=(v,side)=>side==='offer' ? ({category:'parking',listingType:'offer',spaceAttributes:cleanParkingSpaceAttributes(makeParkingAttributes({...PARKING_OFFER_DEFAULT,vehicleUsage:'car',cover:'covered',access:'anytime',...v}),'parking','offer')}) : ({category:'parking',listingType:'wanted',description:writeParkingRequestDetails({...EMPTY_PARKING_REQUEST,...v},'car','')});

test('parking inherits EXACT RT-00 terms/units, not its own second policy',()=>{
 const got=getRentalOptions(POLICY,'parking');
 assert.deepEqual(got.terms,['short','long']);
 assert.deepEqual(got.rateUnitsByTerm.short,['hour','day','week']);
 assert.deepEqual(got.rateUnitsByTerm.long,['month','year']);
});
for (const unit of ['hour','day','week']) {
 test(`offered short-${unit} validates and round-trips; generic price never invents monthly`,()=>{
  const v=offerShort(unit);
  assert.equal(validateParkingRentalOffer(v),'');
  assert.equal(validateParkingFinance(v),'');
  const attrs=cleanParkingSpaceAttributes(makeParkingAttributes({...PARKING_OFFER_DEFAULT,vehicleUsage:'car',cover:'covered',access:'anytime',...v}),'parking','offer');
  assert.equal(attrs.values.shortRateUnit,unit);
  assert.equal(attrs.values.shortRateRial,2500000);
  assert.equal(parkingOfferFormFromAttributes(attrs).rentalTerm,'short');
  const price=parkingListingPrice(v);
  assert.deepEqual(price,parkingFinancePrice(attrs.values));
  assert.equal(price.priceType,unit==='hour'?'negotiable':unit==='day'?'daily':'weekly');
  assert.ok(parkingFinancialRows(attrs.values).some(row=>row.label.includes('ساعتی') === (unit==='hour') && row.amount.includes('ریال') && row.label!=='ضمانت خسارت / ودیعه'));
 });
 test(`wanted short-${unit} persists budget as ceiling separate from owner offer`,()=>{
  const v=wantShort(unit);
  assert.equal(validateParkingRentalRequest(v),'');
  assert.equal(validateParkingFinance(v,true),'');
  const body=writeParkingRequestDetails(v,'car','');
  const back=readParkingRequestDetails(body);
  assert.equal(back.hasMetadata,true);
  assert.equal(back.data.maxBudgetRial,'3000000');
  assert.equal(back.data.maxSecurityHoldRial,'9000000');
  assert.deepEqual(parkingListingPrice(v,true),parkingFinancePrice(readWantedParkingFinance(body),true));
  assert.equal(parkingFinancePrice(v,true).priceType,unit==='hour'?'negotiable':unit==='day'?'daily':'weekly');
  assert.equal(readRentalTermSnapshot(listing(v,'wanted')).profile.rateAmountRial,null);
 });
}
for(const unit of ['month','year']) for(const mode of ['rent_only','deposit_rent','full_deposit']) {
 test(`long offer ${unit}/${mode} maintains rent vs rhen semantics`,()=>{
  const v=offerLong(mode,unit);
  assert.equal(validateParkingRentalOffer(v),'');
  assert.equal(validateParkingFinance(v),'');
  assert.deepEqual(parkingListingPrice(v),parkingFinancePrice(v));
  const price=parkingListingPrice(v);
  assert.equal(price.priceType,mode==='full_deposit'?'negotiable':unit==='month'?'monthly':'yearly');
  assert.equal(price.price,mode==='full_deposit'?'':unit==='month'?'12000000':'150000000');
  const rows=parkingFinancialRows(v);
  assert.equal(rows.some(row=>row.label.includes('رهن') && row.label!=='نوع قرارداد'),mode!=='rent_only');
  assert.equal(rows.some(row=>row.label.startsWith('اجاره /')),mode!=='full_deposit');
 });
 test(`long wanted ${unit}/${mode} never substitutes max deposit into rent`,()=>{
  const v=wantLong(mode,unit);
  assert.equal(validateParkingRentalRequest(v),'');
  assert.equal(validateParkingFinance(v,true),'');
  assert.deepEqual(parkingListingPrice(v,true),parkingFinancePrice(v,true));
  const rows=parkingFinancialRows(v,true);
  assert.equal(rows.some(row=>row.label==='سقف رهن'),mode!=='rent_only');
  assert.equal(rows.some(row=>row.label.startsWith('سقف اجاره')),mode!=='full_deposit');
 });
}
for(const mode of ['rent_only','deposit_rent','full_deposit']) {
 test(`return from step 2 and change mode ${mode} scrubs old finance immediately`,()=>{
  const before=offerLong('deposit_rent');
  const after=changeParkingFinancialMode(before,mode);
  assert.equal(after.longDepositRial,'');
  assert.equal(after.longMonthlyRentRial,'');
  assert.equal(after.longYearlyRentRial,'');
  assert.ok(validateParkingRentalOffer(after));
  const final={...after,longDepositRial:mode==='rent_only'?'':'200000000',longMonthlyRentRial:mode==='full_deposit'?'':'11000000'};
  assert.equal(validateParkingRentalOffer(final),'');
 });
}
test('term and rate switch clear all stale amounts, preserve unrelated physical properties',()=>{
 const start={...offerLong(),vehicleUsage:'car',canNegotiateOtherTerm:true};
 const short=changeParkingRentalTerm(start,'short');
 assert.equal(short.longDepositRial,'');
 assert.equal(short.longMonthlyRentRial,'');
 assert.equal(short.vehicleUsage,'car');
 assert.equal(short.canNegotiateOtherTerm,true);
 const changingUnit=changeParkingRateUnit({...short,shortRateRial:'500000'},'hour');
 assert.equal(changingUnit.shortRateRial,'');
 const back=changeParkingRentalTerm(changingUnit,'long');
 assert.equal(back.shortRateRial,'');
 assert.equal(back.securityHoldRial,'');
 assert.equal(back.financialMode,'');
});
test('switching wanted terms never retains damage hold as long-term mortgage',()=>{
 const src=wantShort();
 const back=changeParkingRentalTerm(src,'long',true);
 assert.equal(back.maxSecurityHoldRial,'');
 assert.equal(back.maxDepositRial,'');
 assert.ok(validateParkingRentalRequest(back));
});
test('invalid numbers are rejected and sanitized rather than becoming invented budgets',()=>{
 for(const str of ['-500','1.5','abc','0','9999999999999999']) {
  assert.ok(validateParkingRentalOffer({...offerShort(),shortRateRial:str}),str);
  assert.ok(validateParkingFinance({...offerShort(),shortRateRial:str}),str);
 }
 assert.ok(validateParkingRentalOffer({...offerShort(),securityHoldRial:'-100'}));
});
test('wanted hourly request matches RT00 duration only (not a whole listing match)',()=>{
 const a=listing(offerShort(),'offer');
 const b=listing(wantShort(),'wanted');
 const result=inspectListingRentalAlignment(a,b);
 assert.equal(result.scope,'term_only');
 assert.equal(result.status,'compatible_term');
 assert.equal(result.liveMatchingUpdated,false);
});
test('different parking terms do not silently match; owner consent only triggers review',()=>{
 const want=listing(wantLong(),'wanted');
 const offer=listing(offerShort(),'offer');
 assert.equal(inspectListingRentalAlignment(offer,want).status,'incompatible_term');
 offer.spaceAttributes.values.canNegotiateOtherTerm=true;
 assert.equal(inspectListingRentalAlignment(offer,want).status,'needs_review');
});
for(const name of ['storage','warehouse','shop','land','residential','villa','garden','other']) {
 test(`parking-specific finance does not override ${name} registration and editing paths`,()=>{
  const add=read('src/pages/AddParking.jsx');
  const edit=read('src/pages/EditParking.jsx');
  assert.match(add,new RegExp(`form\\.category === "${name}"`));
  assert.match(edit,new RegExp(`parking\\?\\.category === "${name}"`));
 });
}
test('offer and request registration and editing use specialist finance and not generic price input',()=>{
 const add=read('src/pages/AddParking.jsx');const edit=read('src/pages/EditParking.jsx');
 for(const source of [add,edit]){
  assert.match(source,/<ParkingRentalFields value=\{form\.parkingOffer\}/);
  assert.match(source,/<ParkingRentalFields value=\{form\.parkingRequestDetails\} wanted/);
  assert.match(source,/parkingListingPrice\(/);
  assert.match(source,/parkingFinancialRows\(/);
  assert.match(source,/form\.category !== "parking"|parking\?\.category !== "parking"/);
 }
 const server=read('backend/src/controllers/spaces.controller.js');
 assert.match(server,/derivedParkingPrice \? derivedParkingPrice\.price/);
 assert.match(server,/derivedParkingPrice \? derivedParkingPrice\.priceType/);
 assert.match(server,/validateParkingFinance\(v, true\)/);
});
test('parking card and details show specialized budget and price independently of generic hourly "negotiable" fallback',()=>{
 const card=read('src/components/ParkingCard.jsx');
 const details=read('src/pages/ParkingDetails.jsx');
 assert.match(card,/parkingFinancial\.length/);
 assert.match(card,/parkingAreaText/);
 assert.match(card,/<ParkingRentalBadges/);
 assert.match(card,/parkingMoneyRows/);
 assert.match(details,/parkingPriceItems\.length/);
 assert.match(details,/ShopMoneyRows items=\{parkingPriceItems\} stacked/);
 assert.match(details,/parkingWantedData/);
});
test('800 Persian characters of special parking requirements fit backend 5000-character description limit',()=>{
 const req={...wantShort(),requirements:'پارکینگ'.repeat(114)};
 const description=writeParkingRequestDetails(req,'car','');
 assert.ok(description.length<5000,`Length=${description.length}`);
 assert.equal(readParkingRequestDetails(description).data.requirements,req.requirements);
 assert.equal(readWantedParkingFinance(description).rentalTerm,'short');
});
