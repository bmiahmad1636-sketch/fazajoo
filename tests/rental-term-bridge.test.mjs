import test from 'node:test';
import assert from 'node:assert/strict';
import { readRentalTermSnapshot, inspectListingRentalAlignment } from '../src/utils/rentalTermBridge.js';
const typed=(category,values,more={})=>({category,listingType:'offer',city:'شهرضا',spaceAttributes:{schemaVersion:1,category,values},...more});
const villaOffer=(term,attrs={},price='',priceType='negotiable')=>typed('villa',{
  accommodationType:'villa',rentalTerm:term,canNegotiateOtherTerm:false,...attrs},{price,priceType});
const wantedVilla=(term, extra={})=>({category:'villa',listingType:'wanted',description:`[FAZAJOO_VILLA_REQUEST:${encodeURIComponent(JSON.stringify({rentalTerm:term,...extra}))}]`});
test('Phase08C villa short is read as short, without converting security to lease deposit',()=>{
 const {profile,source}=readRentalTermSnapshot(villaOffer('short',{depositRial:'۱۰٬۰۰۰٬۰۰۰'},'5,000,000','daily'));
 assert.equal(source,'villa_offer_typed');assert.equal(profile.primaryTerm,'short');assert.equal(profile.rateUnit,'night');
 assert.equal(profile.securityHoldRial,10000000);assert.equal(profile.leaseDepositRial,null);assert.equal(profile.rateAmountRial,5000000);
});
test('villa full-deposit is long: no fabricated monthly rent',()=>{
 const {profile}=readRentalTermSnapshot(villaOffer('long',{financialMode:'full_deposit',longDepositRial:'2000000000'}));
 assert.equal(profile.primaryTerm,'long');assert.equal(profile.leaseDepositRial,2000000000);assert.equal(profile.monthlyRentRial,null);
 assert.equal(profile.rateUnit,null);
});
test('villa long rent+deposit keeps both values independent',()=>{
 const {profile}=readRentalTermSnapshot(villaOffer('long',{financialMode:'deposit_rent',longDepositRial:'30000000',longMonthlyRentRial:'2000000'}));
 assert.equal(profile.leaseDepositRial,30000000);assert.equal(profile.monthlyRentRial,2000000);assert.equal(profile.rateUnit,'month');
});
test('villa alternate duration needs negotiation, never auto-match',()=>{
 const result=inspectListingRentalAlignment(villaOffer('short',{canNegotiateOtherTerm:true}),wantedVilla('long'));
 assert.equal(result.status,'needs_review');assert.equal(result.reason,'alternative_requires_owner_agreement');
 assert.equal(result.liveMatchingUpdated,false);
});
test('villa unapproved alternate duration conflicts',()=>{
 assert.equal(inspectListingRentalAlignment(villaOffer('short'),wantedVilla('long')).status,'incompatible_term');
});
test('villa wanted budget must NOT be interpreted as owner rental price',()=>{
 const {profile}=readRentalTermSnapshot(wantedVilla('short',{maxBudget:'5000000',pricePeriod:'daily',maxDeposit:'50000000'}));
 assert.equal(profile.primaryTerm,'short');assert.equal(profile.rateUnit,'night');
 assert.equal(profile.rateAmountRial,null);assert.equal(profile.securityHoldRial,null);
});
test('residential explicitly typed long contract can be read without changing live form',()=>{
 const {profile}=readRentalTermSnapshot(typed('residential',{financialMode:'deposit_rent'}, {residentialDetails:{deposit:'50000000',monthlyRent:'2000000'}}));
 assert.equal(profile.primaryTerm,'long');assert.equal(profile.leaseDepositRial,50000000);assert.equal(profile.monthlyRentRial,2000000);
});
test('residential legacy monthly rate does not imply long term',()=>{
 const {profile}=readRentalTermSnapshot({category:'residential',listingType:'offer',price:'900000',priceType:'monthly',residentialDetails:{monthlyRent:'900000'}});
 assert.equal(profile.primaryTerm,null);
});
test('garden daily explicit term reads as short, garden monthly remains unknown',()=>{
 const day=readRentalTermSnapshot(typed('garden',{rentalDuration:'daily'}, {price:'1200000',priceType:'daily'}));
 assert.equal(day.profile.primaryTerm,'short');assert.equal(day.profile.rateUnit,'day');
 const month=readRentalTermSnapshot(typed('garden',{rentalDuration:'monthly'}, {price:'1200000',priceType:'monthly'}));
 assert.equal(month.profile.primaryTerm,null);assert.equal(month.profile.rateAmountRial,null);
});
test('garden seasonal is seasonal without inventing deposit classification',()=>{
 const {profile,notes}=readRentalTermSnapshot(typed('garden',{rentalDuration:'seasonal',depositRial:'5000000'}));
 assert.equal(profile.primaryTerm,'seasonal');assert.equal(profile.leaseDepositRial,null);assert.equal(profile.securityHoldRial,null);
 assert.deepEqual(notes,['garden_deposit_kind_requires_review']);
});
test('no other category gets fabricated term from arbitrary monthly/weekly rate',()=>{
 for(const category of ['parking','storage','warehouse','shop','land','other']){
  const {profile}=readRentalTermSnapshot(typed(category,{}, {price:'200000',priceType:'monthly'}));
  assert.equal(profile.primaryTerm,null,category);
 }
});
test('category mismatch cannot match',()=>{
 const r=inspectListingRentalAlignment(villaOffer('short'),typed('garden',{rentalDuration:'daily'}));
 assert.equal(r.status,'incompatible_term');
});
test('live matching engine untouched; bridge is read-only and has no server writes',()=>{
 const a=villaOffer('short',{depositRial:'5000000'},'1000000','daily');
 const before=JSON.stringify(a);
 const result=readRentalTermSnapshot(a);
 assert.equal(result.ok,true);assert.equal(result.liveMatchingUpdated,false);assert.equal(JSON.stringify(a),before);
});
