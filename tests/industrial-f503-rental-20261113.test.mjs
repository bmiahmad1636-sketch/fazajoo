import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import POLICY from '../shared/rental-term-policy.v1.json' with {type:'json'};
import { INDUSTRIAL_OFFER_DEFAULT, makeIndustrialAttributes, industrialOfferFromAttributes, validateIndustrialOffer } from '../src/utils/industrialOffer.js';
import { EMPTY_SHED_REQUEST, readShedRequest, writeShedRequest, shedRequestValidation, shedRequestAreaText } from '../src/utils/shedRequest.js';
import { INDUSTRIAL_RENTAL_OPTIONS, changeIndustrialTerm, changeIndustrialMode, changeIndustrialUnit, pickIndustrialRental, validateIndustrialRental, industrialListingPrice, industrialMoneyRows, industrialFinancialHeadline } from '../src/utils/industrialRental.js';
import { readRentalTermSnapshot, inspectListingRentalAlignment } from '../src/utils/rentalTermBridge.js';
import { compareSpaceListings } from '../src/utils/spaceCompatibility.js';
const require=createRequire(import.meta.url);
const {cleanIndustrialFinance, validateIndustrialFinance, industrialFinancePrice, readWantedIndustrialFinance}=require('../backend/src/utils/industrialRentalFinance.js');
const {cleanIndustrialSpaceAttributes}=require('../backend/src/utils/industrialSpaceAttributes.js');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const offer=()=>({...INDUSTRIAL_OFFER_DEFAULT,spaceType:'shed',allowedActivities:['production'],power:'three',powerCapacityKw:'50',heightM:'6.5',vehicleAccess:'truck',features:['security','crane'],flooring:'reinforced',craneCapacityTons:'5',operationHours:'24h',rentalTerm:'short',shortRateUnit:'month',shortRateRial:'18000000',securityHoldRial:'9000000',canNegotiateOtherTerm:false});
const wanted=()=>({...EMPTY_SHED_REQUEST,spaceType:'shed',activity:'production',power:'three',powerCapacity:'40',minArea:'300',maxArea:'900',minHeight:'5.5',access:'truck',features:['security','loading'],requirements:'امکان فعالیت شیفت شب',rentalTerm:'short',shortRateUnit:'month',maxBudgetRial:'20000000',maxSecurityHoldRial:'10000000'});
const asAd=(o,w=false)=>w?{listingType:'wanted',category:'warehouse',city:'شهرضا',description:writeShedRequest('شرایط واقعی کارگاه',o),area:0,price:industrialListingPrice(o,true).price,priceType:industrialListingPrice(o,true).priceType}:{listingType:'offer',category:'warehouse',city:'شهرضا',area:600,description:'سوله صنعتی آماده',spaceAttributes:makeIndustrialAttributes(o),...industrialListingPrice(o)};
const detailsOffer=['spaceType','allowedActivities','power','powerCapacityKw','heightM','vehicleAccess','features','flooring','craneCapacityTons','operationHours'];
const detailsWanted=['spaceType','activity','power','powerCapacity','minArea','maxArea','minHeight','access','features','requirements'];
const unchanged=(before,after,fields)=>{for(const f of fields)assert.deepEqual(after[f],before[f],f+' must not be cleared when changing the rental contract');};
test('one RT-00 warehouse policy contains short day/week/month and long month/year',()=>{
 assert.deepEqual(INDUSTRIAL_RENTAL_OPTIONS.rateUnitsByTerm.short,['day','week','month']);
 assert.deepEqual(INDUSTRIAL_RENTAL_OPTIONS.rateUnitsByTerm.long,['month','year']);
 assert.deepEqual(POLICY.categories.parking.rateUnitsByTerm.short,['hour','day','week']);
});
for(const w of [false,true]){
 const make=w?wanted:offer;
 for(const unit of ['day','week','month'])test(`${w?'wanted':'offer'} short ${unit} validates, prices and survives serialization`,()=>{
  const o={...make(),shortRateUnit:unit};
  assert.equal(validateIndustrialRental(o,w),'');
  assert.equal(validateIndustrialFinance(o,w),'');
  const pt={day:'daily',week:'weekly',month:'monthly'}[unit];
  assert.deepEqual(industrialListingPrice(o,w),{price:w?'20000000':'18000000',priceType:pt});
  assert.deepEqual(industrialFinancePrice(o,w),{price:w?'20000000':'18000000',priceType:pt});
  const ad=asAd(o,w);const snap=readRentalTermSnapshot(ad);
  assert.equal(snap.ok,true,JSON.stringify(snap.errors));
  assert.equal(snap.profile.primaryTerm,'short');assert.equal(snap.profile.rateUnit,unit);
  const restored=w?readShedRequest(ad.description).data:industrialOfferFromAttributes(ad.spaceAttributes);
  assert.equal(restored.rentalTerm,'short');assert.equal(restored.shortRateUnit,unit);
  assert.equal(restored[w?'maxSecurityHoldRial':'securityHoldRial'],w?'10000000':'9000000');
  assert.match(industrialFinancialHeadline(restored,w),/ماهانه|هفتگی|روزانه/);
  assert.equal(industrialMoneyRows(restored,w).length,2);
  assert.equal(ad.category,'warehouse');
 });
 for(const [mode,unit] of [['rent_only','month'],['deposit_rent','month'],['full_deposit','month'],['rent_only','year'],['deposit_rent','year'],['full_deposit','year']])test(`${w?'wanted':'offer'} long ${mode} ${unit} canonical amounts`,()=>{
  const o={...make(),rentalTerm:'long',financialMode:mode,longRateUnit:unit,shortRateRial:'999',maxBudgetRial:'999',securityHoldRial:'888',maxSecurityHoldRial:'888',longMonthlyRentRial:'7000000',longYearlyRentRial:'80000000',longDepositRial:'250000000',maxRentRial:'9000000',maxDepositRial:'260000000'};
  assert.equal(validateIndustrialRental(o,w),'');assert.equal(validateIndustrialFinance(o,w),'');
  const derived=industrialListingPrice(o,w),server=industrialFinancePrice(o,w);
  assert.deepEqual(server,derived);
  assert.equal(derived.priceType,mode==='full_deposit'?'negotiable':unit==='year'?'yearly':'monthly');
  assert.equal(derived.price,mode==='full_deposit'?'':w?'9000000':unit==='year'?'80000000':'7000000');
  assert.ok(!pickIndustrialRental(o,w).shortRateRial);
  assert.ok(!pickIndustrialRental(o,w).maxBudgetRial);
  const r=w?readShedRequest(asAd(o,true).description).data:industrialOfferFromAttributes(makeIndustrialAttributes(o));
  assert.equal(r.rentalTerm,'long');assert.equal(r.financialMode,mode);assert.equal(r.longRateUnit,unit);
  assert.ok(industrialMoneyRows(r,w).length>0);
 });
 test(`${w?'wanted':'offer'} switching duration preserves all physical fields`,()=>{
  const old=make(),fields=w?detailsWanted:detailsOffer;
  const long=changeIndustrialTerm(old,'long',w);
  unchanged(old,long,fields);assert.equal(long.rentalTerm,'long');assert.equal(long[w?'maxBudgetRial':'shortRateRial'],'');
  const short=changeIndustrialTerm(long,'short',w);
  unchanged(old,short,fields);assert.equal(short.rentalTerm,'short');assert.equal(short[w?'maxRentRial':'longMonthlyRentRial'],'');
 });
 for(const mode of ['rent_only','deposit_rent','full_deposit'])test(`${w?'wanted':'offer'} changing mode ${mode} keeps physical fields and drops irrelevant money`,()=>{
  const old={...make(),rentalTerm:'long',financialMode:'deposit_rent',longRateUnit:'month',longDepositRial:'250000000',maxDepositRial:'260000000',longMonthlyRentRial:'7000000',maxRentRial:'9000000'};
  const changed=changeIndustrialMode(old,mode,w);
  unchanged(old,changed,w?detailsWanted:detailsOffer);assert.equal(changed.financialMode,mode);
  if(mode==='rent_only')assert.equal(changed[w?'maxDepositRial':'longDepositRial'],'');
  if(mode==='full_deposit')assert.equal(changed[w?'maxRentRial':'longMonthlyRentRial'],'');
 });
 test(`${w?'wanted':'offer'} changing short week to month preserves details but resets rate`,()=>{
  const old={...make(),shortRateUnit:'week'};
  const m=changeIndustrialUnit(old,'month',w);
  unchanged(old,m,w?detailsWanted:detailsOffer);
  assert.equal(m.shortRateUnit,'month');assert.equal(m.rentalTerm,'short');
  assert.equal(m[w?'maxBudgetRial':'shortRateRial'],'');
  assert.equal(m[w?'maxSecurityHoldRial':'securityHoldRial'],w?'10000000':'9000000');
 });
 test(`${w?'wanted':'offer'} changing long year/month preserves details and clears rent`,()=>{
  const old={...make(),rentalTerm:'long',financialMode:'deposit_rent',longRateUnit:'month',maxRentRial:'5000000',longMonthlyRentRial:'4000000'};
  const moved=changeIndustrialUnit(old,'year',w);
  unchanged(old,moved,w?detailsWanted:detailsOffer);
  assert.equal(moved.longRateUnit,'year');assert.equal(moved[w?'maxRentRial':'longMonthlyRentRial'],'');
 });
 test(`${w?'wanted':'offer'} finance input is mandatory`,()=>{
  assert.ok(validateIndustrialRental({...make(),rentalTerm:''},w));
  assert.ok(validateIndustrialFinance({...make(),rentalTerm:''},w));
 });
}
test('wanted metadata strips raw FAZAJOO header and excludes old ambiguous duration',()=>{
 const encoded=writeShedRequest('شرح واقعی سوله',wanted());
 assert.match(encoded,/^\[FAZAJOO_SHED_REQUEST:/);assert.equal(readShedRequest(encoded).description,'شرح واقعی سوله');
 assert.ok(!Object.hasOwn(readWantedIndustrialFinance(encoded),'duration'));
 assert.equal(readWantedIndustrialFinance(encoded).maxBudgetRial,'20000000');
});
test('server-side whitelist preserves financial RT00 and physical shed fields',()=>{
 const attrs=cleanIndustrialSpaceAttributes(makeIndustrialAttributes(offer()),'warehouse','offer');
 assert.equal(attrs.values.spaceType,'shed');assert.equal(attrs.values.shortRateUnit,'month');
 assert.equal(attrs.values.shortRateRial,18000000);assert.equal(attrs.values.longMonthlyRentRial,null);
 assert.equal(attrs.values.heightM,6.5);assert.ok(attrs.values.allowedActivities.includes('production'));
 assert.equal(validateIndustrialFinance(attrs.values),'');
});
test('wanted optional area never fabricates exact size',()=>{
 assert.equal(shedRequestAreaText({minArea:'',maxArea:''}),'');
 assert.match(shedRequestAreaText({minArea:'300',maxArea:'900'}),/از .* تا .* مترمربع/);
 assert.match(shedRequestAreaText({minArea:'',maxArea:'900'}),/تا .* مترمربع/);
});
test('required industrial physical fields retain category-specific errors',()=>{
 assert.match(validateIndustrialOffer({...offer(),spaceType:''}),/نوع فضای موجود/);
 assert.match(validateIndustrialOffer({...offer(),allowedActivities:[]}),/حداقل یک فعالیت/);
 assert.match(validateIndustrialOffer({...offer(),power:''}),/وضعیت واقعی برق/);
 assert.match(shedRequestValidation({...wanted(),spaceType:''}),/نوع فضای موردنیاز/);
 assert.match(shedRequestValidation({...wanted(),activity:''}),/نوع فعالیت/);
});
test('industrial request short/month and long/month cannot auto match',()=>{
 const x=asAd(offer());
 const y=asAd({...wanted(),rentalTerm:'long',financialMode:'rent_only',longRateUnit:'month',maxRentRial:'20000000'},true);
 assert.equal(inspectListingRentalAlignment(x,y).status,'incompatible_term');
 assert.ok(compareSpaceListings(y,x).conflicts.includes('industrial-rental-term'));
 const alt=asAd({...offer(),canNegotiateOtherTerm:true});
 assert.equal(inspectListingRentalAlignment(alt,y).status,'needs_review');
 const result=compareSpaceListings(y,alt);
 assert.ok(result.unknown.includes('industrial-alternative-term-price-and-contract-review'));
 assert.ok(!result.matched.includes('rent-irr'));
});
test('matching preserves day/month billing separation',()=>{
 const x=asAd({...offer(),shortRateUnit:'day'}),y=asAd(wanted(),true);
 const result=compareSpaceListings(y,x);
 assert.ok(result.unknown.includes('price-period'));
 assert.ok(!result.matched.includes('rent-irr'));
});
test('industrial offer and wanted keep separate budget/pricing semantics',()=>{
 const x=offer(),y=wanted();
 assert.equal(cleanIndustrialFinance(x,false).shortRateRial,18000000);
 assert.equal(cleanIndustrialFinance(y,true).maxBudgetRial,20000000);
 assert.equal(cleanIndustrialFinance(x,false).maxBudgetRial,null);
 assert.equal(cleanIndustrialFinance(y,true).shortRateRial,null);
});
test('forms render errors next to their fields, not just at bottom',()=>{
 const o=read('src/components/IndustrialOfferFields.jsx');const w=read('src/components/ShedRequestFields.jsx');
 assert.match(o,/error.startsWith\("نوع فضای موجود"\)/);assert.match(o,/error.startsWith\("حداقل یک فعالیت"\)/);assert.match(o,/error.startsWith\("وضعیت واقعی برق"\)/);
 assert.match(w,/typeError && <small role="alert"/);assert.match(w,/activityError&&<small role="alert"/);
 assert.match(w,/error=\{rentalError\}/);
 assert.ok(!w.includes('SHED_DURATIONS.map'));
});
test('backend uses finance and refuses generic forged prices',()=>{
 const src=read('backend/src/controllers/spaces.controller.js');
 assert.match(src,/derivedIndustrialPrice\s*=\s*typedIndustrial/);
 assert.match(src,/industrialFinancePrice\(typedIndustrial.values,false\)/);
 assert.match(src,/industrialFinancePrice\(wantedIndustrial,true\)/);
 assert.match(src,/if\(expected.price!==space.price\|\|expected.priceType!==space.priceType\)/);
});
test('all F5-03 surfaces share rental fields and never replace RT-00 with second engine',()=>{
 const paths=['src/pages/AddParking.jsx','src/pages/EditParking.jsx','src/pages/ParkingDetails.jsx','src/components/ParkingCard.jsx'];
 for(const p of paths) assert.match(read(p),/industrialFinancial|industrialMoneyRows|industrialPriceItems/,p);
 assert.match(read('src/utils/industrialRental.js'),/getRentalOptions\(POLICY,"warehouse"\)/);
 assert.match(read('src/utils/industrialRental.js'),/validateRentalTermProfile/);
 assert.match(read('src/components/ParkingRentalFields.jsx'),/category="warehouse"|category === "warehouse"|category==="warehouse"/);
});

test('warehouse rental field errors are inline for term, mode, period and amounts',()=>{
 const source=read('src/components/ParkingRentalFields.jsx');
 for(const key of ['termError','modeError','periodError','depositError','rentError'])assert.match(source,new RegExp(key));
 assert.match(source,/termError && <p className="fj-pr-error"/);
 assert.match(source,/periodError && <small role="alert" className="fj-pr-error"/);
 assert.match(source,/error && !inlineShown/);
});
