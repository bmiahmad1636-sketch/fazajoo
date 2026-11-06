import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  VILLA_OFFER_DEFAULT,villaOfferFromAttributes,validateVillaOffer,makeVillaAttributes,
  villaMoneyInput,villaFinancialRows
} from '../src/utils/villaOffer.js';
import { writeVillaRequest } from '../src/utils/villaRequest.js';
import { compareSpaceListings } from '../src/utils/spaceCompatibility.js';
import { toSpaceProfile } from '../src/utils/spaceProfile.js';
const require=createRequire(import.meta.url);
const {cleanVillaSpaceAttributes}=require('../backend/src/utils/villaSpaceAttributes.js');
const base={accommodationType:'villa',otherType:'',availableStays:['daily','weekly'],privacy:'private',extraFeatures:[],depositRial:''};
const details={capacity:'6',bedrooms:'2',pool:true,heatedPool:false,parking:true,yard:true,heatingSystems:['gasHeater'],extraGuestPrice:'1000000'};
const attributes=(v=base,d=details)=>makeVillaAttributes(v,d);
const offer=(v=base,d=details)=>({listingType:'offer',category:'villa',city:'شهرضا',area:150,priceType:'daily',price:'15000000',villaDetails:d,spaceAttributes:cleanVillaSpaceAttributes(attributes(v,d),'villa','offer',d)});
const wanted=(v={})=>({listingType:'wanted',category:'villa',city:'شهرضا',description:writeVillaRequest({accommodationType:'villa',stayType:'daily',guests:'4',pricePeriod:'daily',maxBudget:'20000000',...v})});
test('Phase08: new offers never preselect a stay method without owner confirmation',()=>{
 assert.deepEqual(VILLA_OFFER_DEFAULT.availableStays,[]);
 assert.deepEqual(villaOfferFromAttributes({}).availableStays,[]);
 assert.match(validateVillaOffer({...base,availableStays:[]},details,150),/شیوه اقامت/);
});
test('Phase08: type, stay, privacy, area and real capacity must be supplied',()=>{
 assert.equal(validateVillaOffer(base,details,150),'');
 assert.match(validateVillaOffer({...base,accommodationType:''},details,150),/نوع اقامتگاه/);
 assert.match(validateVillaOffer({...base,privacy:''},details,150),/حریم خصوصی/);
 assert.match(validateVillaOffer(base,{...details,capacity:'0'},150),/ظرفیت/);
 assert.match(validateVillaOffer(base,{...details,capacity:'-4'},150),/ظرفیت/);
 assert.match(validateVillaOffer(base,details,0),/متراژ/);
 assert.match(validateVillaOffer(base,{...details,bedrooms:'31'},150),/اتاق‌خواب/);
});
test('Phase08: other accommodation text is required and meaningful',()=>{
 assert.match(validateVillaOffer({...base,accommodationType:'other',otherType:'کم'},details,150),/نوع اقامتگاه دیگر/);
 assert.equal(validateVillaOffer({...base,accommodationType:'other',otherType:'اقامتگاه سنتی'},details,150),'');
 assert.equal(attributes({...base,accommodationType:'villa',otherType:'واحد نامربوط'}).values.otherType,'');
});
test('Phase08: pool extra may not claim an unprovided pool',()=>{
 assert.match(validateVillaOffer({...base,extraFeatures:['indoor_pool']},{...details,pool:false},150),/استخر/);
 assert.match(validateVillaOffer(base,{...details,pool:false,heatedPool:true},150),/استخر/);
 assert.equal(validateVillaOffer({...base,extraFeatures:['gazebo']},details,150),'');
});
test('Phase08: Persian money is grouped in UI and stored as ungrouped IRR',()=>{
 assert.equal(villaMoneyInput('۱۲٬۵۰۰٬۰۰۰'),'12,500,000');
 const a=attributes({...base,depositRial:'۱۲٬۵۰۰٬۰۰۰'});
 assert.equal(a.values.depositRial,12500000);
 assert.match(validateVillaOffer({...base,depositRial:'100000000000000000'},details,150),/ودیعه/);
});
test('Phase08: typed supply survives server sanitization without unknown or forged features',()=>{
 const a=attributes({...base,extraFeatures:['gazebo','indoor_pool','bogus']});
 a.values.admin=true;a.values.features.push('admin');
 const x=cleanVillaSpaceAttributes(a,'villa','offer',details);
 assert.equal(x.values.admin,undefined);
 assert.equal(x.values.features.includes('admin'),false);
 assert.equal(cleanVillaSpaceAttributes({...a,values:{...a.values,features:['pool','heated_pool','wifi']}},'villa','offer',{capacity:6}).values.features.includes('pool'),false);
 assert.equal(x.values.features.includes('pool'),true);
 assert.equal(x.values.features.includes('gazebo'),true);
 assert.equal(x.values.accommodationType,'villa');
});
test('Phase08: demand, wrong categories and malformed typed values are never trusted',()=>{
 const a=attributes();
 assert.deepEqual(cleanVillaSpaceAttributes(a,'villa','wanted'),{});
 assert.deepEqual(cleanVillaSpaceAttributes(a,'garden','offer'),{});
 assert.deepEqual(cleanVillaSpaceAttributes({schemaVersion:1,category:'villa',values:[]},'villa','offer'),{});
});
test('Phase08: edit adapter round trips selected values and never infers legacy values',()=>{
 const a=attributes({...base,accommodationType:'cottage',availableStays:['weekend','weekly'],privacy:'shared',depositRial:'2000000'});
 const r=villaOfferFromAttributes(a);
 assert.equal(r.accommodationType,'cottage');
 assert.deepEqual(r.availableStays,['weekend','weekly']);
 assert.equal(r.privacy,'shared');
 assert.equal(r.depositRial,'2000000');
 assert.equal(villaOfferFromAttributes({}).accommodationType,'');
});
test('Phase08: deposit is separately labeled and daily rate never silently becomes monthly',()=>{
 const a=attributes({...base,depositRial:'12000000'});
 const rows=villaFinancialRows(a,'15000000','daily');
 assert.equal(rows.length,2);
 assert.match(rows[0].label,/شبانه/);
 assert.match(rows[1].label,/ودیعه/);
 assert.equal(rows[0].amount.includes('۱۲'),false);
 const monthly=villaFinancialRows(a,'15000000','monthly');
 assert.match(monthly[0].label,/ماهانه/);
});
test('Phase08: offer and wanted villa properties can be compared without guessing',()=>{
 const result=compareSpaceListings(wanted(),offer());
 assert.equal(result.status,'compatible');
 assert.ok(result.matched.includes('villa-type'));
 assert.ok(result.matched.includes('villa-stay'));
 assert.ok(result.matched.includes('capacity'));
});
test('Phase08: a known different accommodation type is incompatible',()=>{
 const result=compareSpaceListings(wanted({accommodationType:'cottage'}),offer());
 assert.equal(result.status,'incompatible');
 assert.ok(result.conflicts.includes('villa-type'));
});
test('Phase08: other types cannot be auto-matched by the generic other ID',()=>{
 const o=offer({...base,accommodationType:'other',otherType:'خانه روستایی خاص'});
 const w=wanted({accommodationType:'other',otherType:'کلبه ساحلی خاص'});
 const result=compareSpaceListings(w,o);
 assert.equal(result.status,'needs_details');
 assert.ok(result.unknown.includes('villa-other-type-review'));
});
test('Phase08: weekend cannot be silently assumed from daily availability',()=>{
 const result=compareSpaceListings(wanted({stayType:'weekend'}),offer({...base,availableStays:['daily']}));
 assert.equal(result.status,'needs_details');
 assert.ok(result.unknown.includes('villa-weekend-review'));
});
test('Phase08: privacy requirement is reviewed when offer is uncertain',()=>{
 const o=offer({...base,privacy:'unknown'});
 const result=compareSpaceListings(wanted({privacyRequired:true}),o);
 assert.equal(result.status,'needs_details');
 assert.ok(result.unknown.includes('villa-privacy'));
});
test('Phase08: data from old unstructured villa offers remains unknown, not falsely incompatible',()=>{
 const old={...offer()};delete old.spaceAttributes;
 const result=compareSpaceListings(wanted({privacyRequired:true}),old);
 assert.equal(result.status,'needs_details');
 assert.ok(result.unknown.includes('villa-privacy'));
 assert.ok(result.unknown.includes('villa-type'));
 const profile=toSpaceProfile(old);assert.equal(profile.hasStructuredDetails,false);
});
