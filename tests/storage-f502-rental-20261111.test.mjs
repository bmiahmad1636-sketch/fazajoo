import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { STORAGE_OFFER_DEFAULT,makeStorageAttributes,storageOfferFromAttributes } from '../src/utils/storageOffer.js';
import { readWarehouseRequest,writeWarehouseRequest,EMPTY_WAREHOUSE_REQUEST,warehouseRequestValidation,storageRequestAreaText } from '../src/utils/warehouseRequest.js';
import { validateStorageRental,storageListingPrice,storageMoneyRows,storageFinancialHeadline,pickStorageRental,changeStorageTerm,changeStorageMode,changeStorageUnit,STORAGE_RENTAL_OPTIONS } from '../src/utils/storageRental.js';
import { readRentalTermSnapshot,inspectListingRentalAlignment } from '../src/utils/rentalTermBridge.js';
const require = createRequire(import.meta.url);
const {cleanStorageSpaceAttributes}=require('../backend/src/utils/storageSpaceAttributes.js');
const {cleanStorageFinance,validateStorageFinance,storageFinancePrice,readWantedStorageFinance}=require('../backend/src/utils/storageRentalFinance.js');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=(p)=>readFileSync(resolve(root,p),'utf8');
const offerBase = ()=>({...STORAGE_OFFER_DEFAULT,spaceType:'indoor',allowedPurposes:['personal'],access:'24h'});
const wantedBase = ()=>({...EMPTY_WAREHOUSE_REQUEST,purpose:'personal'});
const short = (wanted=false,unit='day')=>({...(wanted?wantedBase():offerBase()),rentalTerm:'short',shortRateUnit:unit,
  ...(wanted?{maxBudgetRial:'100000000',maxSecurityHoldRial:'30000000'}:{shortRateRial:'100000000',securityHoldRial:'30000000'})});
const long=(wanted=false,mode='deposit_rent',unit='month')=>({...(wanted?wantedBase():offerBase()),rentalTerm:'long',financialMode:mode,longRateUnit:unit,
  ...(wanted?{maxRentRial:'150000000',maxDepositRial:'1000000000'}:{longMonthlyRentRial:'150000000',longYearlyRentRial:'1800000000',longDepositRial:'1000000000'})});
const typedOffer=x=>({category:'storage',listingType:'offer',spaceAttributes:makeStorageAttributes(x),price:storageListingPrice(x).price,priceType:storageListingPrice(x).priceType});
const typedWanted=x=>({category:'storage',listingType:'wanted',description:writeWarehouseRequest('',x),price:storageListingPrice(x,true).price,priceType:storageListingPrice(x,true).priceType});

test('storage policies use RT-00, not a separate engine',()=>{
 assert.deepEqual(STORAGE_RENTAL_OPTIONS.terms,['short','long']);
 assert.deepEqual(STORAGE_RENTAL_OPTIONS.rateUnitsByTerm.short,['day','week','month']);
 assert.deepEqual(STORAGE_RENTAL_OPTIONS.rateUnitsByTerm.long,['month','year']);
 assert.match(src('src/utils/storageRental.js'),/validateRentalTermProfile/);
});
for(const wanted of [false,true]) {
 for(const unit of ['day','week','month'])test(`${wanted?'wanted':'offer'} short ${unit} contract validates, roundtrips and retains distinct security`,()=>{
   const x=short(wanted,unit);
   assert.equal(validateStorageRental(x,wanted),'');
   assert.equal(validateStorageFinance(x,wanted),'');
   const raw=wanted?readWarehouseRequest(writeWarehouseRequest('',x)).data:storageOfferFromAttributes(makeStorageAttributes(x));
   assert.equal(raw.rentalTerm,'short');assert.equal(raw.shortRateUnit,unit);
   assert.equal(raw[wanted?'maxSecurityHoldRial':'securityHoldRial'],x[wanted?'maxSecurityHoldRial':'securityHoldRial']);
   const p=storageListingPrice(x,wanted),sp=storageFinancePrice(x,wanted);
   assert.deepEqual(p,sp);
   assert.equal(p.priceType,unit==='day'?'daily':unit==='week'?'weekly':'monthly');
   assert.equal(storageMoneyRows(x,wanted).length,2);
 });
 for(const mode of ['rent_only','deposit_rent','full_deposit']) {
  for(const unit of ['month','year'])test(`${wanted?'wanted':'offer'} long ${mode} ${unit}: no false rent/deposit`,()=>{
   const x=long(wanted,mode,unit);
   assert.equal(validateStorageRental(x,wanted),'');
   assert.equal(validateStorageFinance(x,wanted),'');
   const v=wanted?readWarehouseRequest(writeWarehouseRequest('',x)).data:storageOfferFromAttributes(makeStorageAttributes(x));
   const rows=storageMoneyRows(v,wanted);
   assert.equal(rows.some(r=>r.label.includes('رهن')),mode!=='rent_only');
   assert.equal(rows.some(r=>r.label.includes('اجاره')),mode!=='full_deposit');
   assert.equal(rows.some(r=>r.label.includes('ضمانت')),false);
   const expected=storageFinancePrice(x,wanted);
   assert.deepEqual(storageListingPrice(x,wanted),expected);
   assert.equal(expected.priceType,mode==='full_deposit'?'negotiable':unit==='year'?'yearly':'monthly');
   if(mode==='full_deposit')assert.equal(expected.price,'');
  });
 }
}
for(const wanted of [false,true]) {
 test(`switch term erases stale short/long amounts (${wanted?'wanted':'offer'})`,()=>{
  const start=long(wanted,'deposit_rent');
  const changed=changeStorageTerm(start,'short',wanted);
  assert.ok(!changed.longDepositRial);assert.ok(!changed.maxDepositRial);
  assert.ok(!changed.longMonthlyRentRial);assert.ok(!changed.maxRentRial);
  assert.equal(changed.rentalTerm,'short');
  const reverse=changeStorageTerm(short(wanted),'long',wanted);
  assert.ok(!reverse.shortRateRial);assert.ok(!reverse.maxBudgetRial);
  assert.ok(!reverse.securityHoldRial);assert.ok(!reverse.maxSecurityHoldRial);
  assert.equal(reverse.rentalTerm,'long');
 });
 test(`switch finance modes erases stale rent/deposit (${wanted?'wanted':'offer'})`,()=>{
  let x=changeStorageMode(long(wanted),'rent_only',wanted);
  assert.ok(!x[wanted?'maxDepositRial':'longDepositRial']);
  x=changeStorageMode(long(wanted),'full_deposit',wanted);
  assert.ok(!x[wanted?'maxRentRial':'longMonthlyRentRial']);
  assert.ok(!x.longYearlyRentRial);
 });
 test(`change rent unit clears former rent (${wanted?'wanted':'offer'})`,()=>{
  const x=changeStorageUnit(long(wanted),'year',wanted);
  assert.ok(!x[wanted?'maxRentRial':'longMonthlyRentRial']);
  assert.ok(!x.longYearlyRentRial);
  assert.equal(x.longRateUnit,'year');
 });
 test(`short hourly rate is rejected by storage in both layers (${wanted?'wanted':'offer'})`,()=>{
  const x=short(wanted,'hour');
  assert.ok(validateStorageRental(x,wanted));
  assert.ok(validateStorageFinance(x,wanted));
 });
}
test('optional damage/security hold cannot become a long-term lease deposit',()=>{
 const x={...short(),securityHoldRial:'1000000000'};
 const y=changeStorageTerm(x,'long');
 assert.equal(y.securityHoldRial,'');
 assert.ok(!storageFinancialHeadline(y).includes('ضمانت'));
});
test('server strips forged unknown field and stale amounts while retaining typed selected contract',()=>{
 const raw=makeStorageAttributes({...long(),securityHoldRial:'1000',shortRateRial:'900',unknownAuthKey:'PRIVATE'});
 raw.values.rateUnit='hour';raw.values.nestedSecret='X';
 const cleaned=cleanStorageSpaceAttributes(raw,'storage','offer');
 assert.equal(cleaned.values.securityHoldRial,null);
 assert.equal(cleaned.values.shortRateRial,null);
 assert.equal(cleaned.values.nestedSecret,undefined);
 assert.equal(cleaned.values.unknownAuthKey,undefined);
 assert.equal(validateStorageFinance(cleaned.values), '');
});
test('server refuses forged generic monetary headline by providing canonical derived price',()=>{
 const x=long(false,'deposit_rent','month');
 const price=storageFinancePrice(x);
 assert.equal(price.price,'150000000');
 assert.equal(price.priceType,'monthly');
 assert.notEqual(price.price,'1000000000');
 assert.equal(storageFinancePrice(long(false,'full_deposit')).price,'');
});
test('safe request metadata never leaks into edited description or card text',()=>{
 const description=writeWarehouseRequest('یک انبار تمیز برای لوازم نمایشگاهی',long(true));
 const parsed=readWarehouseRequest(description);
 assert.equal(parsed.hasMetadata,true);
 assert.equal(parsed.description,'یک انبار تمیز برای لوازم نمایشگاهی');
 assert.equal(readWantedStorageFinance(description).rentalTerm,'long');
 assert.ok(!parsed.description.includes('FAZAJOO_WAREHOUSE_REQUEST'));
 assert.ok(!storageFinancialHeadline(parsed.data,true).includes('FAZAJOO'));
});
test('malformed metadata cannot crash storage request reader',()=>{
 for(const text of ['', '[FAZAJOO_WAREHOUSE_REQUEST:%GG]', '[FAZAJOO_WAREHOUSE_REQUEST:null]']) {
  const r=readWarehouseRequest(text);assert.equal(r.hasMetadata,false);
 }
});
test('request area is optional and bounds stay validated',()=>{
 assert.equal(warehouseRequestValidation({...wantedBase(),minArea:'',maxArea:''}),'');
 assert.ok(warehouseRequestValidation({...wantedBase(),minArea:'400',maxArea:'300'}));
});
test('RT-00 common adapter sees storage term without confusing wanted budget with owner price',()=>{
 const o=typedOffer(long(false,'deposit_rent'));
 const w=typedWanted(long(true,'deposit_rent'));
 const a=readRentalTermSnapshot(o),b=readRentalTermSnapshot(w);
 assert.equal(a.ok,true,JSON.stringify(a.errors));
 assert.equal(b.ok,true,JSON.stringify(b.errors));
 assert.equal(b.profile.rateAmountRial,null);
 assert.equal(inspectListingRentalAlignment(o,w).status,'compatible_term');
});
test('RT-00 ignores negotiated alternative as automatic compatibility',()=>{
 const o=typedOffer({...short(),canNegotiateOtherTerm:true});
 const w=typedWanted(long(true));
 assert.equal(inspectListingRentalAlignment(o,w).status,'needs_review');
});
test('the interface shares ONE RT-00 based rental fields component, with separate storage options',()=>{
 const c=src('src/components/ParkingRentalFields.jsx');
 const w=src('src/components/WarehouseRequestFields.jsx');
 assert.match(c,/STORAGE_RENTAL_OPTIONS/);
 assert.match(c,/category === "storage"/);
 assert.match(w,/<ParkingRentalFields category="storage"/);
});
test('register and edit both persist and validate typed storage rent without generic final-price input',()=>{
 const add=src('src/pages/AddParking.jsx'),edit=src('src/pages/EditParking.jsx');
 for(const text of [add,edit]) {
  assert.match(text,/validateStorageRental/);
  assert.match(text,/storageListingPrice/);
  assert.match(text,/storageFinancialHeadline/);
  assert.match(text,/storageFinancialRows/);
  assert.match(text,/category="storage" value=\{form\.storageOffer\}/);
  assert.match(text,/writeWarehouseRequest\("", form\.warehouseRequest\)/);
 }
});
test('both cards and both detail pricing zones use specialized deposit + rent without generic price fallback',()=>{
 const c=src('src/components/ParkingCard.jsx');
 const d=src('src/pages/ParkingDetails.jsx');
 assert.match(c,/storageWantedData/);assert.match(c,/storageFinancial\.length/);
 assert.match(c,/storageFinancial\.length \? storageFinancial/);
 assert.equal((d.match(/ShopMoneyRows items=\{storagePriceItems\}/g)||[]).length,2);
 assert.match(d,/category === "storage" && <ParkingRentalBadges category="storage"/);
});
test('storage-specific backend protects both sides and never derives arbitrary generic price',()=>{
 const s=src('backend/src/controllers/spaces.controller.js');
 assert.match(s,/derivedStoragePrice \? derivedStoragePrice\.price/);
 assert.match(s,/derivedStoragePrice \? derivedStoragePrice\.priceType/);
 assert.match(s,/validateStorageFinance\(values,space\.listingType==="wanted"\)/);
 assert.match(s,/readWantedStorageFinance/);
});
test('storage changes do not touch allowed contract periods of shed/shop/land',()=>{
 const terms=JSON.parse(src('shared/rental-term-policy.v1.json')).categories;
 assert.deepEqual(terms.warehouse.rateUnitsByTerm.short,['day','week','month']);
 assert.deepEqual(terms.land.terms,['short','seasonal','long']);
 assert.deepEqual(terms.shop.rateUnitsByTerm.long,['month','year']);
});

test('optional storage area is displayed as a real interval, not guessed area',()=>{
 assert.equal(storageRequestAreaText({minArea:'',maxArea:''}),'');
 assert.match(storageRequestAreaText({minArea:'20',maxArea:'25'}),/از ۲۰ تا ۲۵ مترمربع/);
 assert.match(storageRequestAreaText({minArea:'',maxArea:'25'}),/تا ۲۵ مترمربع/);
});
test('storage card/details/edit previews use the same safe area description',()=>{
 for(const file of ['src/components/ParkingCard.jsx','src/pages/ParkingDetails.jsx','src/pages/AddParking.jsx','src/pages/EditParking.jsx'])
  assert.match(src(file),/storageRequestAreaText/);
});
