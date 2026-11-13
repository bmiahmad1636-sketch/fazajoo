import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import POLICY from '../shared/rental-term-policy.v1.json' with {type:'json'};
import {SHOP_RENTAL_DEFAULT,SHOP_WANTED_FINANCE_DEFAULT,SHOP_RENTAL_OPTIONS,
  changeShopTerm,changeShopMode,changeShopUnit,pickShopRental,validateShopRental,
  shopRentalListingPrice,shopRentalMoneyRows} from '../src/utils/shopRental.js';
import {SHOP_OFFER_DEFAULT,makeShopAttributes,shopOfferFromAttributes,shopListingPrice,shopFinancialRows,
  shopFinancialHeadline,validateShopOffer} from '../src/utils/shopOffer.js';
import {EMPTY_SHOP_REQUEST,SHOP_FEATURES,writeShopRequest,readShopRequest,shopWantedFinancialRows,
  shopWantedFinancialHeadline,shopRequestAreaText,shopRequestValidation} from '../src/utils/shopRequest.js';
import {toSpaceProfile} from '../src/utils/spaceProfile.js';
import {compareSpaceListings} from '../src/utils/spaceCompatibility.js';
const require=createRequire(import.meta.url);
const {cleanShopFinance,validateShopFinance,shopFinancePrice,readWantedShopFinance}=require('../backend/src/utils/shopRentalFinance.js');
const {cleanShopSpaceAttributes}=require('../backend/src/utils/shopSpaceAttributes.js');
const offer=(v={})=>({...SHOP_OFFER_DEFAULT,spaceType:'street',allowedActivities:['clothing'],transferType:'rent',rentalTerm:'short',shortRateUnit:'day',shortRateRial:'2000000', ...v});
const wanted=(v={})=>({...EMPTY_SHOP_REQUEST,spaceType:'street',activity:'clothing',transferType:'rent',rentalTerm:'short',shortRateUnit:'day',maxBudgetRial:'2500000',...v});
const makeOffer=(v={})=>({category:'shop',listingType:'offer',city:'شهرضا',area:50,priceType:shopListingPrice(offer(v)).priceType,price:shopListingPrice(offer(v)).price,spaceAttributes:makeShopAttributes(offer(v))});
const makeWanted=(v={})=>({category:'shop',listingType:'wanted',city:'شهرضا',area:0,description:writeShopRequest(wanted(v))});
const src=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');

test('F5-04 uses RT-00 shop category; no new term policy or matching engine',()=>{
 assert.equal(SHOP_RENTAL_OPTIONS.category,'shop');
 assert.deepEqual(SHOP_RENTAL_OPTIONS.rateUnitsByTerm,POLICY.categories.shop.rateUnitsByTerm);
 assert.deepEqual(SHOP_RENTAL_OPTIONS.rateUnitsByTerm.short,['day','week','month']);
 assert.deepEqual(SHOP_RENTAL_OPTIONS.rateUnitsByTerm.long,['month','year']);
 assert.equal(src('src/utils/shopRental.js').includes('matchingEngine'),false);
});
for(const wantedSide of [false,true]) {
 for(const unit of ['day','week','month']){
  test(`${wantedSide?'wanted':'offer'} short ${unit}: validated and priced, remains short`,()=>{
   const v=wantedSide?wanted({shortRateUnit:unit}):offer({shortRateUnit:unit});
   assert.equal(validateShopRental(v,wantedSide),'');
   assert.equal(shopRentalListingPrice(v,wantedSide).priceType,({day:'daily',week:'weekly',month:'monthly'})[unit]);
   assert.equal(v.rentalTerm,'short');
  });
 }
 for(const unit of ['month','year']){
  for(const mode of ['rent_only','deposit_rent','full_deposit']) {
   test(`${wantedSide?'wanted':'offer'} long ${unit} ${mode}: correct amount and price`,()=>{
    const rate=unit==='year'?{longYearlyRentRial:'600000000'}:{longMonthlyRentRial:'50000000'};
    const v=wantedSide?wanted({rentalTerm:'long',longRateUnit:unit,financialMode:mode,maxRentRial:'60000000',maxDepositRial:'900000000'}):
      offer({rentalTerm:'long',longRateUnit:unit,financialMode:mode,longDepositRial:'900000000',...rate});
    assert.equal(validateShopRental(v,wantedSide),'');
    const price=shopRentalListingPrice(v,wantedSide);
    if(mode==='full_deposit')assert.deepEqual(price,{price:'',priceType:'negotiable'});
    else assert.equal(price.priceType,unit==='month'?'monthly':'yearly');
    const rows=shopRentalMoneyRows(v,wantedSide);
    assert.equal(rows.some(x=>x.label.includes('رهن')),mode!=='rent_only');
    assert.equal(rows.some(x=>x.label.includes('اجاره')),mode!=='full_deposit');
   });
  }
 }
}
for(const wantedSide of [false,true]){
 test(`${wantedSide?'wanted':'offer'} attributes survive short->long->short`,()=>{
  let v={...(wantedSide?wanted():offer()),spaceType:'mall',floor:'ground',features:['parking','ventilation'],otherActivity:'فروش لوازم'};
  const original={spaceType:v.spaceType,floor:v.floor,features:v.features,otherActivity:v.otherActivity};
  v=changeShopTerm(v,'long',wantedSide);
  assert.equal(v.rentalTerm,'long');
  v=changeShopMode(v,'deposit_rent',wantedSide);
  v=changeShopUnit(v,'year',wantedSide);
  v=changeShopTerm(v,'short',wantedSide);
  for(const [k,x] of Object.entries(original))assert.deepEqual(v[k],x,k);
  assert.equal(v.rentalTerm,'short');
  assert.equal(v.shortRateRial||'','');
  assert.equal(v.maxBudgetRial||'','');
  assert.equal(v.longYearlyRentRial||'','');
 });
 test(`${wantedSide?'wanted':'offer'} unit switch keeps physical details and clears stale rate`,()=>{
  const v0={...(wantedSide?wanted():offer()),spaceType:'booth',features:['parking'],requirements:'ورودی مرکز خرید'};
  const v=changeShopUnit(v0,'month',wantedSide);
  assert.equal(v.spaceType,v0.spaceType);assert.deepEqual(v.features,v0.features);
  assert.equal(v.shortRateUnit,'month');
  assert.equal(vantedRent(v,wantedSide),'');
 });
}
function vantedRent(v,wantedSide){return wantedSide?v.maxBudgetRial:v.shortRateRial;}

test('client and backend short monthly IRR values are canonical',()=>{
 const v=offer({shortRateUnit:'month',shortRateRial:'123456789',securityHoldRial:'1000000'});
 assert.equal(shopListingPrice(v).price,'123456789');
 const attrs=makeShopAttributes(v);
 assert.equal(attrs.values.shortRateUnit,'month');
 const clean=cleanShopSpaceAttributes(attrs,'shop','offer');
 assert.equal(validateShopFinance(clean.values,false),'');
 assert.deepEqual(shopFinancePrice(clean.values,false),{price:'123456789',priceType:'monthly'});
 assert.equal(clean.values.depositRial,null);assert.equal(clean.values.monthlyRentRial,null);
 assert.match(shopFinancialHeadline(attrs),/ماهانه/);
 assert.match(shopFinancialHeadline(attrs),/ضمانت خسارت/);
});
test('request short monthly budget never becomes owner price or mortgage',()=>{
 const v=wanted({shortRateUnit:'month',maxBudgetRial:'85000000',maxSecurityHoldRial:'20000000'});
 const desc=writeShopRequest(v);
 const parsed=readWantedShopFinance(desc);
 assert.equal(validateShopFinance(parsed,true),'');
 assert.equal(shopFinancePrice(parsed,true).priceType,'monthly');
 assert.equal(parsed.maxDepositRial??'','');
 assert.equal(parsed.maxBudgetRial,'85000000');
 const profile=toSpaceProfile({category:'shop',listingType:'wanted',city:'شهرضا',description:desc});
 assert.equal(profile.maxRentRial,85000000);
 assert.equal(profile.maxDepositRial,null);
 assert.equal(profile.fields.securityHoldBudget,20000000);
});
test('full deposit long does not invent monthly rent, and cannot match short',()=>{
 const a=offer({rentalTerm:'long',financialMode:'full_deposit',longDepositRial:'2000000000'});
 const attrs=makeShopAttributes(a);
 assert.equal(shopListingPrice(a).price,'');
 assert.equal(shopFinancialRows(attrs).length,1);
 const profile=toSpaceProfile(makeOffer(a));
 assert.equal(profile.rentRial,null);
 assert.equal(profile.depositRial,2000000000);
 const match=compareSpaceListings(makeWanted(),makeOffer(a));
 assert.ok(match.conflicts.includes('shop-rental-term'));
});
test('short monthly offer and long monthly request conflict even with same rate unit',()=>{
 const res=compareSpaceListings(makeWanted({rentalTerm:'long',longRateUnit:'month',financialMode:'rent_only',maxRentRial:'3000000'}),makeOffer({shortRateUnit:'month'}));
 assert.equal(res.status,'incompatible');assert.ok(res.conflicts.includes('shop-rental-term'));
});
test('alternative shop term is manual review, never automatically compatible',()=>{
 const res=compareSpaceListings(makeWanted({rentalTerm:'long',financialMode:'rent_only',maxRentRial:'3000000'}),makeOffer({canNegotiateOtherTerm:true}));
 assert.equal(res.status,'needs_details');assert.ok(res.unknown.includes('shop-alternative-term-and-price-review'));
});
test('short weekly request against monthly offer needs period review, no fabricated conversion',()=>{
 const res=compareSpaceListings(makeWanted({shortRateUnit:'week'}),makeOffer({shortRateUnit:'month'}));
 assert.equal(res.status,'needs_details');assert.ok(res.unknown.includes('price-period'));
});
test('seller rent is verified based on typed contract, forged old monthly field ignored',()=>{
 const v=offer({rentalTerm:'short',shortRateUnit:'week',shortRateRial:'17000000',monthlyRentRial:'999999999',depositRial:'888888888'});
 const clean=cleanShopSpaceAttributes(makeShopAttributes(v),'shop','offer');
 assert.equal(clean.values.monthlyRentRial,null);
 assert.equal(clean.values.depositRial,null);
 assert.deepEqual(shopFinancePrice(clean.values,false),{price:'17000000',priceType:'weekly'});
});
test('server rejects missing duration, wrong periods and missing financial modes',()=>{
 assert.match(validateShopFinance({shortRateUnit:'month',shortRateRial:'100000'},false),/مدت اصلی/);
 assert.match(validateShopFinance({rentalTerm:'short',shortRateUnit:'hour',shortRateRial:'100000'},false),/دوره کوتاه/);
 assert.match(validateShopFinance({rentalTerm:'long',longRateUnit:'week',financialMode:'rent_only',longMonthlyRentRial:'100000'},false),/دوره بلند/);
 assert.match(validateShopFinance({rentalTerm:'long',longRateUnit:'month',longMonthlyRentRial:'100000'},false),/نوع قرارداد/);
});
test('seller and demand short rates mandatory; invalid deposit optional cannot pass',()=>{
 assert.match(validateShopFinance({rentalTerm:'short',shortRateUnit:'month'},false),/مبلغ/);
 assert.match(validateShopFinance({rentalTerm:'short',shortRateUnit:'month'},true),/بودجه/);
 assert.match(validateShopFinance({rentalTerm:'short',shortRateUnit:'month',shortRateRial:'100000',securityHoldRial:'-1'},false),/ضمانت/);
});
test('legal rights are not treated as lease deposit or rent',()=>{
 const a={...SHOP_OFFER_DEFAULT,spaceType:'street',allowedActivities:['clothing'],transferType:'key_money',rightsType:'key_money',keyMoneyRial:'500000000'};
 assert.equal(validateShopOffer(a),'');
 const attrs=makeShopAttributes(a);
 assert.equal(attrs.values.rentalTerm,undefined);
 assert.equal(attrs.values.monthlyRentRial,null);assert.equal(attrs.values.depositRial,null);
 assert.deepEqual(shopListingPrice(a),{price:'',priceType:'negotiable'});
 assert.match(shopFinancialHeadline(attrs),/واگذاری سرقفلی/);
 const b=writeShopRequest({...wanted({}),transferType:'key_money',rightsType:'key_money',keyMoney:'490000000'});
 const decoded=readShopRequest(b).data;
 assert.equal(decoded.rentalTerm,'');assert.equal(decoded.maxBudgetRial,'');
 assert.match(shopWantedFinancialHeadline(decoded),/سقف بودجه سرقفلی/);
 assert.equal(shopFinancePrice(decoded,true).priceType,'negotiable');
});
test('request encoding keeps shop physical attributes while clearing incompatible finance',()=>{
 const v={...wanted(),spaceType:'mall',floor:'first',features:['parking'],requirements:'جنب راه‌پله',monthlyRent:'9999',deposit:'8888',keyMoney:'7777'};
 const out=readShopRequest(writeShopRequest(v)).data;
 assert.equal(out.spaceType,'mall');assert.deepEqual(out.features,['parking']);
 assert.equal(out.monthlyRent,'');assert.equal(out.deposit,'');assert.equal(out.keyMoney,'');
 assert.equal(out.rentalTerm,'short');assert.equal(out.maxBudgetRial,'2500000');
});
for(const t of [{minArea:'',maxArea:''},{minArea:'20',maxArea:''},{minArea:'',maxArea:'90'},{minArea:'20',maxArea:'90'}]){
 test(`shop optional area ${JSON.stringify(t)} is not an invented exact area`,()=>{
  const display=shopRequestAreaText(t);
  if(!t.minArea&&!t.maxArea)assert.equal(display,'');
  else if(t.minArea&&t.maxArea)assert.match(display,/تا/);
  else assert.match(display,t.minArea?/حداقل/:/حداکثر/);
 });
}
test('shop physical input validates activity, area and legal rights separately',()=>{
 assert.match(shopRequestValidation({...wanted(),spaceType:''}),/نوع فضای/);
 assert.match(shopRequestValidation({...wanted(),activity:''}),/نوع فعالیت/);
 assert.match(shopRequestValidation({...wanted(),minArea:'100',maxArea:'20'}),/متراژ/);
 assert.match(shopRequestValidation({...wanted({transferType:'key_money'}),rightsType:''}),/نوع حق/);
});
test('new shop request / offer form includes both field local error and shared rental fields',()=>{
 const a=src('src/components/ShopOfferFields.jsx'),b=src('src/components/ShopRequestFields.jsx');
 assert.match(a,/ParkingRentalFields category="shop"/);assert.match(b,/ParkingRentalFields category="shop"/);
 assert.match(a,/role="alert"/);assert.match(b,/role="alert"/);
 assert.match(a,/SHOP_DEAL_TYPES/);assert.match(b,/SHOP_DEAL_TYPES/);
 assert.match(a,/واگذاری حق تجاری/);assert.match(b,/shopRightMoneyLabel/);
});
test('form, server, card and details use same financial fields',()=>{
 const files=['src/pages/AddParking.jsx','src/pages/EditParking.jsx'];
 for(const f of files){const txt=src(f); assert.match(txt,/validateShopRental/);assert.match(txt,/shopRentalListingPrice/);assert.match(txt,/rentalError=\{errors.shopRental\}/);assert.match(txt,/shopWantedFinancialHeadline/);}
 assert.match(src('src/components/ParkingCard.jsx'),/shopFinancial/);
 assert.match(src('src/pages/ParkingDetails.jsx'),/shopPriceRows/);
 assert.match(src('backend/src/controllers/spaces.controller.js'),/derivedShopPrice/);
 assert.match(src('backend/src/controllers/spaces.controller.js'),/validateShopFinance\(v,wanted\)/);
});
test('other categories remain on previous RT-00 periods',()=>{
 assert.deepEqual(POLICY.categories.parking.rateUnitsByTerm.short,['hour','day','week']);
 assert.deepEqual(POLICY.categories.storage.rateUnitsByTerm.short,['day','week','month']);
 assert.deepEqual(POLICY.categories.warehouse.rateUnitsByTerm.short,['day','week','month']);
});

test('shop wanted metadata stays within backend 5000-char cap for maximum Persian input',()=>{
 const v={...wanted(),activity:'other',otherActivity:'ز'.repeat(100),requirements:'گ'.repeat(500),
 features:SHOP_FEATURES.map(([k])=>k),floor:'ground',locationPreference:'main',
 minArea:'123',maxArea:'999',frontage:'15',shortRateUnit:'month'};
 const encoded=writeShopRequest(v);
 assert.ok(encoded.length<=4800,`encoded metadata overflow ${encoded.length}`);
 const d=readShopRequest(encoded).data;
 assert.equal(d.requirements,v.requirements);assert.equal(d.otherActivity,v.otherActivity);
 assert.deepEqual(d.features,v.features);assert.equal(d.rentalTerm,'short');
 assert.equal(shopRequestValidation(v),'');
});
test('shop wanted metadata size error must render beneath conditions textarea',()=>{
 const huge={...wanted(),requirements:'ع'.repeat(1500)};
 assert.match(shopRequestValidation(huge),/متن شرایط خاص/);
 assert.match(src('src/components/ShopRequestFields.jsx'),/warn\(show\("متن شرایط خاص"\)\)/);
});

test('other commercial space type asks for description beneath its own field',()=>{
 const incomplete={...wanted(),spaceType:'other',otherSpaceType:''};
 assert.match(shopRequestValidation(incomplete),/نوع فضای تجاری دیگر/);
 const valid={...incomplete,otherSpaceType:'فضای خدماتی اختصاصی'};
 assert.equal(shopRequestValidation(valid),'');
 assert.equal(readShopRequest(writeShopRequest(valid)).data.otherSpaceType,valid.otherSpaceType);
 assert.match(src('src/components/ShopRequestFields.jsx'),/otherSpaceError/);
 assert.match(src('src/pages/ParkingDetails.jsx'),/شرح نوع دیگر/);
});
test('other commercial type is a manual review, not an automatic false match',()=>{
 const want=makeWanted({spaceType:'other',otherSpaceType:'فضای خدماتی'});
 const have=makeOffer({spaceType:'other',otherSpaceType:'غرفه نمایشگاهی'});
 const result=compareSpaceListings(want,have);
 assert.equal(result.status,'needs_details');
 assert.ok(result.unknown.includes('shop-other-space-type-review'));
 assert.ok(!result.matched.includes('space-type'));
});
