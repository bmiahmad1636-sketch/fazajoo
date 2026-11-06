import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {readFileSync} from 'node:fs';
import {
 VILLA_OFFER_DEFAULT,validateVillaOffer,makeVillaAttributes,villaOfferFromAttributes,
 villaListingPrice,villaFinancialRows
} from '../src/utils/villaOffer.js';
import {EMPTY_VILLA_REQUEST,writeVillaRequest,readVillaRequest,validateVillaRequest,villaRequestBudgetText} from '../src/utils/villaRequest.js';
import {compareSpaceListings} from '../src/utils/spaceCompatibility.js';
const require=createRequire(import.meta.url);
const {cleanVillaSpaceAttributes}=require('../backend/src/utils/villaSpaceAttributes.js');
const base={...VILLA_OFFER_DEFAULT,accommodationType:'villa',privacy:'private',availableStays:['daily']};
const details={capacity:'6',bedrooms:'2',pool:true,parking:true,furnished:true};
const modes={
 full_deposit:{financialMode:'full_deposit',longDepositRial:'2000000000',longMonthlyRentRial:''},
 rent_only:{financialMode:'rent_only',longDepositRial:'',longMonthlyRentRial:'50000000'},
 deposit_rent:{financialMode:'deposit_rent',longDepositRial:'2000000000',longMonthlyRentRial:'50000000'},
};
const long=mode=>({...base,rentalTerm:'long',...modes[mode]});
const attrs=(o,d=details)=>cleanVillaSpaceAttributes(makeVillaAttributes(o,d),'villa','offer',d);
const offer=(o,price,priceType, d=details)=>({listingType:'offer',category:'villa',city:'رامسر',area:180,price,priceType,villaDetails:d,spaceAttributes:attrs(o,d)});
const wanted=(r)=>({listingType:'wanted',category:'villa',city:'رامسر',description:writeVillaRequest({
 ...EMPTY_VILLA_REQUEST,accommodationType:'villa',guests:'4',...r})});

test('Phase08B: short term retains nights, and damage deposit never becomes long-term key money',()=>{
 const o={...base,depositRial:'10000000'};
 assert.equal(validateVillaOffer(o,details,180),'');
 const a=attrs(o);
 assert.equal(a.values.rentalTerm,'short');
 assert.equal(a.values.financialMode,null);
 assert.equal(a.values.depositRial,10000000);
 assert.equal(a.values.longDepositRial,null);
 assert.deepEqual(villaListingPrice(o,'25000000','daily'),{price:'25000000',priceType:'daily'});
 const rows=villaFinancialRows(a,'25000000','daily');
 assert.match(rows[0].label,/شبانه/);assert.match(rows[1].label,/خسارت/);
});
test('Phase08B: long-term full deposit has no monthly rent even if stale value exists',()=>{
 const o={...long('full_deposit'),longMonthlyRentRial:'50000000',depositRial:'90000'};
 assert.equal(validateVillaOffer(o,details,180),'');
 const a=attrs(o);
 assert.equal(a.values.longMonthlyRentRial,null);
 assert.equal(a.values.depositRial,null);
 assert.equal(a.values.longDepositRial,2000000000);
 assert.deepEqual(villaListingPrice(o,'999999999','daily'),{price:'',priceType:'negotiable'});
 assert.deepEqual(villaFinancialRows(a,'999999999','daily').map(x=>x.label),['رهن بلندمدت']);
});
test('Phase08B: rent only cannot manufacture a deposit from stale input',()=>{
 const o={...long('rent_only'),longDepositRial:'5000000000'};
 assert.equal(validateVillaOffer(o,details,180),'');
 assert.equal(attrs(o).values.longDepositRial,null);
 assert.deepEqual(villaListingPrice(o,'123','daily'),{price:'50000000',priceType:'monthly'});
 assert.deepEqual(villaFinancialRows(attrs(o),'123','daily').map(x=>x.label),['اجاره ماهانه']);
});
test('Phase08B: rhen-and-rent keeps two distinct amounts',()=>{
 const o=long('deposit_rent');
 assert.equal(validateVillaOffer(o,details,180),'');
 assert.equal(attrs(o).values.longDepositRial,2000000000);
 assert.equal(attrs(o).values.longMonthlyRentRial,50000000);
 assert.equal(villaFinancialRows(attrs(o),'50000000','monthly').length,2);
 assert.equal(villaOfferFromAttributes(attrs(o)).financialMode,'deposit_rent');
});
test('Phase08B: contract and amounts mandatory; short duration still required',()=>{
 assert.match(validateVillaOffer({...base,availableStays:[]},details,180),/شیوه اقامت/);
 assert.match(validateVillaOffer({...long('full_deposit'),longDepositRial:''},details,180),/رهن/);
 assert.match(validateVillaOffer({...long('rent_only'),longMonthlyRentRial:''},details,180),/اجاره ماهانه/);
 assert.match(validateVillaOffer({...long('deposit_rent'),financialMode:''},details,180),/نوع قرارداد/);
});
test('Phase08B: sanitization strips untrusted values and never invents rent',()=>{
 const o=makeVillaAttributes(long('full_deposit'),details);
 o.values.longMonthlyRentRial=900000000;
 o.values.features.push('admin');o.values.adminOverride=true;
 const clean=cleanVillaSpaceAttributes(o,'villa','offer',details);
 assert.equal(clean.values.longMonthlyRentRial,null);
 assert.equal(clean.values.adminOverride,undefined);
 assert.equal(clean.values.features.includes('admin'),false);
});
test('Phase08B: wanted long-term demand round trips with monthly budget and deposit separately',()=>{
 const original={...EMPTY_VILLA_REQUEST,rentalTerm:'long',financialMode:'deposit_rent',guests:'4',maxBudget:'40000000',maxDeposit:'1000000000',pricePeriod:'monthly'};
 assert.equal(validateVillaRequest(original),'');
 const read=readVillaRequest(writeVillaRequest(original));
 assert.equal(read.data.rentalTerm,'long');
 assert.equal(read.data.financialMode,'deposit_rent');
 assert.match(villaRequestBudgetText(read.data),/اجاره ماهانه/);
 assert.match(villaRequestBudgetText(read.data),/رهن/);
});
test('Phase08B: demand full deposit strips stale monthly budget; rent-only strips stale deposit',()=>{
 const r={...EMPTY_VILLA_REQUEST,rentalTerm:'long',guests:'2',financialMode:'full_deposit',maxDeposit:'1000000000',maxBudget:'50000000'};
 assert.equal(validateVillaRequest({...r,pricePeriod:'monthly'}),'');
 let o=readVillaRequest(writeVillaRequest(r)).data;
 assert.equal(o.maxBudget,'');assert.equal(o.maxDeposit,'1000000000');
 o=readVillaRequest(writeVillaRequest({...r,financialMode:'rent_only',maxBudget:'50000000'})).data;
 assert.equal(o.maxDeposit,'');assert.equal(o.maxBudget,'50000000');
});
test('Phase08B: short and long contracts do not match one another automatically',()=>{
 const shortDemand=wanted({rentalTerm:'short',guests:'2',stayType:'daily',maxBudget:'30000000',pricePeriod:'daily'});
 const longDemand=wanted({rentalTerm:'long',financialMode:'rent_only',guests:'2',maxBudget:'60000000',pricePeriod:'monthly'});
 const shortOffer=offer({...base},'25000000','daily');
 const longOffer=offer(long('rent_only'),'50000000','monthly');
 assert.ok(compareSpaceListings(shortDemand,longOffer).conflicts.includes('villa-rental-term'));
 assert.ok(compareSpaceListings(longDemand,shortOffer).conflicts.includes('villa-rental-term'));
 assert.equal(compareSpaceListings(longDemand,longOffer).status,'compatible');
});
test('Phase08B: incompatible long-term contract types do not silently match',()=>{
 const demand=wanted({rentalTerm:'long',financialMode:'full_deposit',guests:'2',maxDeposit:'3000000000',pricePeriod:'monthly'});
 const result=compareSpaceListings(demand,offer(long('rent_only'),'50000000','monthly'));
 assert.ok(result.conflicts.includes('villa-contract-mode'));
});
test('Phase08B: old unstructured villas are not falsely declared long-term',()=>{
 const demand=wanted({rentalTerm:'long',financialMode:'rent_only',guests:'2',maxBudget:'60000000',pricePeriod:'monthly'});
 const old={listingType:'offer',category:'villa',city:'رامسر',area:180,price:'50000000',priceType:'monthly',villaDetails:details,spaceAttributes:{}};
 const r=compareSpaceListings(demand,old);
 assert.equal(r.status,'needs_details');
 assert.ok(r.unknown.includes('villa-rental-term'));
});
test('Phase08B: backend derives long-term generic amount and validates actual fields',()=>{
 const src=readFileSync(new URL('../backend/src/controllers/spaces.controller.js',import.meta.url),'utf8');
 assert.match(src,/longVillaRent/);
 assert.match(src,/longDepositRial/);
 assert.match(src,/مبلغ اجاره ویلا با قرارداد بلندمدت/);
});
