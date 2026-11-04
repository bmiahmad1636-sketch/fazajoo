import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { SHOP_OFFER_DEFAULT,validateShopOffer,makeShopAttributes,shopOfferFromAttributes,shopListingPrice,shopFinancialHeadline,shopMoneyInputDigits,formatShopMoneyInput } from '../src/utils/shopOffer.js';
import { writeShopRequest } from '../src/utils/shopRequest.js';
import { compareSpaceListings } from '../src/utils/spaceCompatibility.js';
const require=createRequire(import.meta.url);
const {cleanShopSpaceAttributes}=require('../backend/src/utils/shopSpaceAttributes.js');
const basic={...SHOP_OFFER_DEFAULT,spaceType:'street',allowedActivities:['clothing'],transferType:'rent'};
const raw=v=>makeShopAttributes({...basic,...v});
const cleaned=v=>cleanShopSpaceAttributes(raw(v),'shop','offer');
const wanted=(v={})=>({category:'shop',listingType:'wanted',city:'شهرضا',description:writeShopRequest({spaceType:'street',activity:'clothing',transferType:'rent',...v})});
const offer=v=>({category:'shop',listingType:'offer',city:'شهرضا',area:45,priceType:'negotiable',spaceAttributes:cleaned(v)});

test('three real offer essentials must be present',()=>{
 assert.equal(validateShopOffer(basic),'');
 assert.match(validateShopOffer({...basic,spaceType:''}),/نوع فضای/);
 assert.match(validateShopOffer({...basic,allowedActivities:[]}),/فعالیت/);
 assert.match(validateShopOffer({...basic,transferType:''}),/واگذاری/);
});
test('commercial rights specify type and other activities require explanation',()=>{
 assert.match(validateShopOffer({...basic,transferType:'key_money'}),/نوع حق/);
 assert.equal(validateShopOffer({...basic,transferType:'key_money',rightsType:'unsure'}),'');
 assert.match(validateShopOffer({...basic,allowedActivities:['other'],otherActivity:'دو'}),/فعالیت/);
});
test('money and frontage use strict bounds and Persian digits',()=>{
 assert.match(validateShopOffer({...basic,depositRial:'-100'}),/ریال/);
 assert.match(validateShopOffer({...basic,frontageM:'1001'}),/بر مغازه/);
 assert.equal(validateShopOffer({...basic,monthlyRentRial:'۱۲٬۵۰۰٬۰۰۰',frontageM:'۴٫۵'}),'');
 const a=makeShopAttributes({...basic,monthlyRentRial:'۱۲٬۵۰۰٬۰۰۰',frontageM:'۴٫۵'}).values;
 assert.equal(a.monthlyRentRial,12500000);
 assert.equal(a.frontageM,4.5);
});
test('different price kinds never overwrite each other',()=>{
 const a=raw({monthlyRentRial:'32000000',depositRial:'250000000',keyMoneyRial:'500000000'}).values;
 assert.equal(a.monthlyRentRial,32000000);assert.equal(a.depositRial,250000000);assert.equal(a.keyMoneyRial,null);
 const b=raw({transferType:'full_deposit',monthlyRentRial:'32000000',depositRial:'900000000'}).values;
 assert.equal(b.monthlyRentRial,null);assert.equal(b.depositRial,900000000);
 const c=raw({transferType:'key_money',rightsType:'unsure',depositRial:'100000000',keyMoneyRial:'480000000'}).values;
 assert.equal(c.depositRial,null);assert.equal(c.keyMoneyRial,480000000);
});
test('generic price only denotes known MONTHLY rent',()=>{
 assert.deepEqual(shopListingPrice({...basic,monthlyRentRial:'22000000'}),{price:'22000000',priceType:'monthly'});
 assert.deepEqual(shopListingPrice({...basic,transferType:'full_deposit',depositRial:'600000000'}),{price:'',priceType:'negotiable'});
 assert.deepEqual(shopListingPrice({...basic,transferType:'key_money',keyMoneyRial:'600000000'}),{price:'',priceType:'negotiable'});
});
test('public price labels are truthful and distinguish rights',()=>{
 assert.match(shopFinancialHeadline(raw({transferType:'key_money',rightsType:'key_money',keyMoneyRial:'5000000'})),/واگذاری حق/);
 assert.match(shopFinancialHeadline(raw({transferType:'full_deposit',depositRial:'5000000'})),/رهن کامل/);
 assert.match(shopFinancialHeadline(raw({monthlyRentRial:'5000000'})),/اجاره ماهانه/);
});
test('server removes forged and unknown fields',()=>{
 const s=cleanShopSpaceAttributes({schemaVersion:1,category:'shop',values:{...raw({}).values,illegalFeature:true,features:['parking','fake'],depositRial:100,otherActivity:'fake'}},'shop','offer');
 assert.equal(s.values.illegalFeature,undefined); assert.deepEqual(s.values.features,['parking']);
 assert.equal(s.values.otherActivity,'');
});
test('server ignores unwanted shop data, invalid category and malformed schema',()=>{
 assert.deepEqual(cleanShopSpaceAttributes(raw({}),'shop','wanted'),{});
 assert.deepEqual(cleanShopSpaceAttributes(raw({}),'land','offer'),{});
 assert.deepEqual(cleanShopSpaceAttributes({schemaVersion:1,category:'shop',values:[]},'shop','offer'),{});
});
test('old shop offer with no structured data remains unknown, never fabricated',()=>{
 const r=compareSpaceListings(wanted(),{category:'shop',listingType:'offer',city:'شهرضا',area:45,priceType:'monthly',price:10000000,shopDetails:{}});
 assert.equal(r.status,'needs_details');assert.ok(r.unknown.includes('shop-transfer'));
});
test('conflicting shop transfer type is incompatible',()=>{
 const r=compareSpaceListings(wanted({transferType:'key_money',rightsType:'unsure'}),offer({transferType:'rent'}));
 assert.equal(r.status,'incompatible');assert.ok(r.conflicts.includes('shop-transfer'));
});
test('known shop activity conflict does not silently match',()=>{
 const r=compareSpaceListings(wanted({activity:'food'}),offer({allowedActivities:['clothing']}));
 assert.equal(r.status,'incompatible');assert.ok(r.conflicts.includes('shop-activity'));
});
test('a known commercial use still requires permit review',()=>{
 const r=compareSpaceListings(wanted({activity:'clothing'}),offer({}));
 assert.equal(r.status,'needs_details');assert.ok(r.unknown.includes('shop-business-permit-review'));
});
test('shop key money never bypasses legal review even when amounts match',()=>{
 const r=compareSpaceListings(wanted({transferType:'key_money',rightsType:'unsure',keyMoney:'500000000'}),offer({transferType:'key_money',rightsType:'unsure',keyMoneyRial:'420000000'}));
 assert.equal(r.status,'needs_details');assert.ok(r.unknown.includes('shop-commercial-rights-legal-review'));
});
test('shop offer round trips through typed attributes',()=>{
 const a=raw({allowedActivities:['food','other'],otherActivity:'کاربری آموزشی',transferType:'rent',monthlyRentRial:40000000,features:['storage'],floor:'ground'});
 const b=shopOfferFromAttributes(a);
 assert.deepEqual(b.allowedActivities,['food','other']);assert.equal(b.floor,'ground');assert.equal(String(b.monthlyRentRial),'40000000');
});
test('other shop type requires detail; irrelevant frontage and elevator disappear on change of type',()=>{
 assert.match(validateShopOffer({...basic,spaceType:'other',otherSpaceType:' ' }),/نوع فضای تجاری دیگر/);
 const d=makeShopAttributes({...basic,spaceType:'mall',frontageM:'17',features:['elevator','parking']}).values;
 assert.equal(d.frontageM,null); assert.deepEqual(d.features,['elevator','parking']);
 const street=makeShopAttributes({...basic,spaceType:'street',frontageM:'17',features:['elevator','parking']}).values;
 assert.equal(street.frontageM,17); assert.deepEqual(street.features,['parking']);
 const server=cleanShopSpaceAttributes({schemaVersion:1,category:'shop',values:{...d,spaceType:'street',features:['elevator','parking']}},'shop','offer');
 assert.deepEqual(server.values.features,['parking']);
});
test('inactive monetary fields are not misvalidated',()=>{
 assert.equal(validateShopOffer({...basic,transferType:'rent',keyMoneyRial:'invalid'}),'');
 assert.equal(validateShopOffer({...basic,transferType:'key_money',rightsType:'unsure',monthlyRentRial:'invalid'}),'');
});

test('money fields show live grouping but persist unformatted digits',()=>{
 assert.equal(formatShopMoneyInput('1000000000'),'1,000,000,000');
 assert.equal(formatShopMoneyInput('۱۲۳۴۵۶۷۸۹'),'123,456,789');
 assert.equal(formatShopMoneyInput('١٢٣٬٤٥٦٬٧٨٩'),'123,456,789');
 assert.equal(shopMoneyInputDigits('۱,۲۳۴,۵۶۷'),'1234567');
 assert.equal(formatShopMoneyInput(''),'');
 const result=raw({depositRial:'1,000,000,000',monthlyRentRial:'10,000,000'}).values;
 assert.equal(result.depositRial,1000000000);
 assert.equal(result.monthlyRentRial,10000000);
});
test('rent plus deposit headline displays both real amounts on card and details',()=>{
 const attributes=raw({depositRial:'1000000000',monthlyRentRial:'10000000'});
 const heading=shopFinancialHeadline(attributes);
 assert.match(heading,/ودیعه/);
 assert.match(heading,/اجاره ماهانه/);
 assert.match(heading,/۱٬۰۰۰٬۰۰۰٬۰۰۰/);
 assert.match(heading,/۱۰٬۰۰۰٬۰۰۰/);
 assert.ok(heading.indexOf('ودیعه')<heading.indexOf('اجاره ماهانه'));
});
test('missing security deposit is not represented as zero and rights stay separate',()=>{
 const heading=shopFinancialHeadline(raw({monthlyRentRial:'9000000',depositRial:''}));
 assert.match(heading,/اجاره ماهانه/);
 assert.doesNotMatch(heading,/ودیعه/);
 const right=shopFinancialHeadline(raw({transferType:'key_money',rightsType:'key_money',keyMoneyRial:'300000000'}));
 assert.match(right,/واگذاری حق/);
 assert.doesNotMatch(right,/اجاره ماهانه|ودیعه/);
});
