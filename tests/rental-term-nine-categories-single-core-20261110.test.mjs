import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import POLICY from '../shared/rental-term-policy.v1.json' with { type: 'json' };
import {validateRentalTermProfile, assessRentalTermAlignment} from '../shared/rental-term-core.mjs';
import {readRentalTermSnapshot, inspectListingRentalAlignment} from '../src/utils/rentalTermBridge.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIVE=['parking','storage','warehouse','shop','land'];
const FOUR=['garden','villa','residential','other'];
const nine=[...FOUR,...FIVE];
const attrs=(category,values)=>({schemaVersion:1,category,values});
const wanted=(category,data)=>({listingType:'wanted',category,description:`[FAZAJOO_${{parking:'PARKING_REQUEST',storage:'WAREHOUSE_REQUEST',warehouse:'SHED_REQUEST',shop:'SHOP_REQUEST',land:'LAND_RENTAL',villa:'VILLA_REQUEST',garden:'GARDEN_REQUEST',residential:'RESIDENTIAL_REQUEST',other:'OTHER_WANTED'}[category]}:${encodeURIComponent(JSON.stringify(data))}]`});
const offer=(category,data)=>({listingType:'offer',category,spaceAttributes:attrs(category,data)});

test('Nine categories have ONE canonical RT-00 policy and same schema vocabulary',()=>{
  assert.deepEqual(Object.keys(POLICY.categories).sort(),nine.sort());
  assert.ok(!fs.existsSync(path.resolve(HERE,'../shared/remaining-five-rental.v1.mjs')), 'Do not install the obsolete second F5 engine');
  for(const category of nine) {
    assert.ok(POLICY.categories[category].terms.length>0);
    for (const term of POLICY.categories[category].terms) assert.ok(POLICY.categories[category].rateUnitsByTerm[term].length>0);
  }
});

test('Garden seasonal deposit no longer fails the canonical validation (existing RT-03 behavior)',()=>{
  const x=offer('garden',{rentalTerm:'seasonal',seasonalRateRial:'200000000',seasonalSecurityHoldRial:'100000000'});
  const r=readRentalTermSnapshot(x);
  assert.equal(r.ok,true,JSON.stringify(r.errors));
  assert.equal(r.profile.primaryTerm,'seasonal');
  assert.equal(r.profile.securityHoldRial,100000000);
  assert.equal(r.profile.leaseDepositRial,null);
});

test('Land seasonal security is allowed; short-only villa still forbids seasonal',()=>{
  assert.equal(validateRentalTermProfile({category:'land',side:'offer',primaryTerm:'seasonal',rateUnit:'season',securityHoldRial:500000},POLICY).ok,true);
  assert.ok(validateRentalTermProfile({category:'villa',side:'offer',primaryTerm:'long',securityHoldRial:500000},POLICY).errors.includes('security_hold_requires_short_term'));
  assert.ok(validateRentalTermProfile({category:'villa',side:'offer',primaryTerm:'seasonal',rateUnit:'season',securityHoldRial:500000},POLICY).errors.includes('term_not_allowed'));
});

for(const category of FIVE){
  test(`${category}: Old monthly offer and legacy requested duration remain untyped (no false contract)`,()=>{
    const a=offer(category,{duration:'long'}); a.price='12000000';a.priceType='monthly';
    const b=wanted(category,{duration:'long',monthlyRent:'15000000'});
    assert.equal(readRentalTermSnapshot(a).profile.primaryTerm,null);
    assert.equal(readRentalTermSnapshot(b).profile.primaryTerm,null);
    assert.equal(inspectListingRentalAlignment(a,b).status,'needs_review');
  });
}

const shortUnits={parking:'hour',storage:'day',warehouse:'week',shop:'day',land:'week'};
for(const category of FIVE){
  test(`${category}: New EXPLICIT typed offer and demand flow through EXISTING core only`,()=>{
    const unit=shortUnits[category];
    const a=offer(category,{rentalTerm:'short',shortRateUnit:unit,shortRateRial:'۵۰۰۰۰۰',securityHoldRial:'۲۰۰۰۰۰۰'});
    const b=wanted(category,{rentalTerm:'short',shortRateUnit:unit,maxShortBudgetRial:'۱۰۰۰۰۰۰'});
    const s1=readRentalTermSnapshot(a),s2=readRentalTermSnapshot(b);
    assert.equal(s1.ok,true,JSON.stringify(s1.errors));
    assert.equal(s2.ok,true,JSON.stringify(s2.errors));
    assert.equal(s1.profile.primaryTerm,'short'); assert.equal(s1.profile.rateUnit,unit);
    assert.equal(s1.profile.rateAmountRial,500000);
    assert.equal(s1.profile.securityHoldRial,2000000);
    assert.equal(s2.profile.rateAmountRial,null, 'demand budget must not become owner asking rate');
    assert.equal(s2.profile.leaseDepositRial,null);
    assert.equal(inspectListingRentalAlignment(a,b).status,'compatible_term');
    assert.equal(inspectListingRentalAlignment(a,b).scope,'term_only');
  });
}

test('Same category with incompatible short vs long does not become compatible without consent',()=>{
  const a=offer('parking',{rentalTerm:'short',shortRateUnit:'hour',shortRateRial:'20000'});
  const b=wanted('parking',{rentalTerm:'long',financialMode:'rent_only'});
  assert.equal(inspectListingRentalAlignment(a,b).status,'incompatible_term');
  a.spaceAttributes.values.canNegotiateOtherTerm=true;
  assert.equal(inspectListingRentalAlignment(a,b).status,'needs_review');
});

test('Long-term lease deposit is distinct from damage hold, for new industrial offers',()=>{
  const s=readRentalTermSnapshot(offer('warehouse',{rentalTerm:'long',financialMode:'deposit_rent',longDepositRial:'500000000',longMonthlyRentRial:'10000000'}));
  assert.equal(s.ok,true,JSON.stringify(s.errors));
  assert.equal(s.profile.leaseDepositRial,500000000);
  assert.equal(s.profile.monthlyRentRial,10000000);
  assert.equal(s.profile.securityHoldRial,null);
});

test('Short-term industrial security never becomes long-term lease deposit on alternate term',()=>{
  const a=readRentalTermSnapshot(offer('storage',{rentalTerm:'short',shortRateUnit:'day',shortRateRial:'200000',securityHoldRial:'5000000'}));
  assert.equal(a.profile.leaseDepositRial,null);
  assert.equal(a.profile.securityHoldRial,5000000);
});

test('Explicit annual long-term contract is not silently converted to monthly',()=>{
  const a=readRentalTermSnapshot(offer('parking',{rentalTerm:'long',financialMode:'rent_only',longRateUnit:'year',longYearlyRentRial:'200000000'}));
  assert.equal(a.ok,true,JSON.stringify(a.errors));
  assert.equal(a.profile.rateUnit,'year');
  assert.equal(a.profile.monthlyRentRial,null);
  assert.equal(a.profile.rateAmountRial,200000000);
});

test('Key money/rights is NOT ordinary rent in shop and always requires manual review',()=>{
  const a=readRentalTermSnapshot(offer('shop',{transferType:'key_money',rentalTerm:'long',financialMode:'rent_only',longMonthlyRentRial:'25000000'}));
  assert.equal(a.profile.primaryTerm,null);
  assert.equal(a.source,'special_transaction_manual_review');
  assert.ok(a.notes.includes('shop_rights_transfer_requires_legal_review'));
});

test('Crop sharing is NOT regular land rent and requires manual review',()=>{
  const b=readRentalTermSnapshot(wanted('land',{paymentType:'crop_share',rentalTerm:'seasonal',seasonalMaxBudgetRial:'1000000'}));
  assert.equal(b.profile.primaryTerm,null);
  assert.ok(b.notes.includes('land_crop_share_requires_manual_review'));
});

test('A typed invalid term never masquerades as an exact match',()=>{
  const a=readRentalTermSnapshot(offer('parking',{rentalTerm:'seasonal',seasonalRateRial:'1500000'}));
  assert.equal(a.ok,false);
  assert.ok(a.errors.includes('term_not_allowed'));
  const b=wanted('parking',{rentalTerm:'seasonal'});
  assert.equal(inspectListingRentalAlignment(offer('parking',{rentalTerm:'seasonal'}),b).status,'needs_review');
});

test('Core result is never a full-price or physical-property match',()=>{
  const a={category:'villa',side:'offer',primaryTerm:'short',rateUnit:'night'};
  const b={category:'villa',side:'wanted',primaryTerm:'short',rateUnit:'night'};
  const alignment=assessRentalTermAlignment(a,b,POLICY);
  assert.equal(alignment.scope,'term_only');
  assert.equal(alignment.status,'compatible_term');
  assert.equal(Object.hasOwn(alignment,'score'),false);
});
