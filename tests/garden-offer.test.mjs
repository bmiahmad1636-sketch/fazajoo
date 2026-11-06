import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { GARDEN_OFFER_DEFAULT,validateGardenOffer,makeGardenAttributes,gardenOfferFromAttributes,formatGardenMoneyInput,gardenMoneyInputDigits } from '../src/utils/gardenOffer.js';
import { writeGardenRequest } from '../src/utils/gardenRequest.js';
import { compareSpaceListings } from '../src/utils/spaceCompatibility.js';
const require=createRequire(import.meta.url);
const { cleanGardenSpaceAttributes }=require('../backend/src/utils/gardenSpaceAttributes.js');
const base={...GARDEN_OFFER_DEFAULT,gardenType:'orchard',allowedPurposes:['orchard','recreation'],accessRoad:'dirt',financialMode:'rent_only'};
const attrs=(v={})=>makeGardenAttributes({...base,...v});
const cleaned=(v={})=>cleanGardenSpaceAttributes(attrs(v),'garden','offer');
const offer=(v={})=>({listingType:'offer',category:'garden',city:'شهرضا',area:800,priceType:'daily',price:'10000000',gardenDetails:{water:true,waterSource:'well',fenced:true},spaceAttributes:cleaned(v)});
const wanted=(v={})=>({listingType:'wanted',category:'garden',city:'شهرضا',description:writeGardenRequest({purpose:'orchard',minArea:'500',pricePeriod:'daily',maxBudget:'20000000',...v})});
test('three essential answers must be provided',()=>{
 assert.equal(validateGardenOffer(base),'');
 assert.match(validateGardenOffer({...base,gardenType:''}),/نوع باغ/);
 assert.match(validateGardenOffer({...base,allowedPurposes:[]}),/کاربرد/);
 assert.match(validateGardenOffer({...base,accessRoad:''}),/راه دسترسی/);
});
test('other purpose requires meaningful text',()=>{
 assert.match(validateGardenOffer({...base,allowedPurposes:['other'],otherPurpose:'س'}),/کاربرد دیگر/);
 assert.equal(validateGardenOffer({...base,allowedPurposes:['other'],otherPurpose:'نگهداری نهال'}),'');
});
test('event capacity and deposit are optional but checked if supplied',()=>{
 assert.equal(validateGardenOffer({...base,allowedPurposes:['event'],eventCapacity:''}),'');
 assert.match(validateGardenOffer({...base,allowedPurposes:['event'],eventCapacity:'-3'}),/ظرفیت/);
 assert.match(validateGardenOffer({...base,depositRial:'10000000000000000'}),/ودیعه/);
 assert.equal(attrs({allowedPurposes:['event'],eventCapacity:'۴۰',financialMode:'deposit_rent',depositRial:'۱۲٬۰۰۰٬۰۰۰'}).values.eventCapacity,40);
 assert.equal(attrs({allowedPurposes:['event'],eventCapacity:'۴۰',financialMode:'deposit_rent',depositRial:'۱۲٬۰۰۰٬۰۰۰'}).values.depositRial,12000000);
});
test('after removing event, event capacity is not saved as a false feature',()=>{
 assert.equal(attrs({eventCapacity:'50',allowedPurposes:['orchard']}).values.eventCapacity,null);
 assert.equal(cleaned({eventCapacity:'50',allowedPurposes:['orchard']}).values.eventCapacity,null);
});
test('owner and server drop unknown fields and forged features',()=>{
 const s=cleanGardenSpaceAttributes({schemaVersion:1,category:'garden',values:{...attrs().values,admin:true,features:['parking','fake'],eventCapacity:100}},'garden','offer');
 assert.equal(s.values.admin,undefined);
 assert.deepEqual(s.values.features,['parking']);
 assert.equal(s.values.eventCapacity,null);
});
test('wanted data does not get stamped as supplied features',()=>{
 assert.deepEqual(cleanGardenSpaceAttributes(attrs(),'garden','wanted'),{});
 assert.deepEqual(cleanGardenSpaceAttributes(attrs(),'land','offer'),{});
 assert.deepEqual(cleanGardenSpaceAttributes({schemaVersion:1,category:'garden',values:[]},'garden','offer'),{});
});
test('garden supply round trips with conditional fields',()=>{
 const a=attrs({rentalDuration:'weekend',privacy:'private',features:['gazebo','parking'],allowedPurposes:['event','other'],otherPurpose:'همایش گروهی',eventCapacity:'50'});
 const b=gardenOfferFromAttributes(a);
 assert.equal(b.rentalDuration,'weekend');assert.equal(b.privacy,'private');
 assert.deepEqual(b.allowedPurposes,['event','other']);assert.equal(b.eventCapacity,'50');
});
test('known different purpose is incompatible, old offers remain unknown',()=>{
 const bad=compareSpaceListings(wanted({purpose:'event'}),offer());
 assert.equal(bad.status,'incompatible');assert.ok(bad.conflicts.includes('garden-purpose'));
 const legacy=compareSpaceListings(wanted(),{listingType:'offer',category:'garden',city:'شهرضا',area:800,priceType:'daily',price:10000000,gardenDetails:{}});
 assert.ok(legacy.unknown.includes('garden-purpose'));
});
test('events require separate legal review, even if owner accepts them',()=>{
 const r=compareSpaceListings(wanted({purpose:'event',eventGuests:'20'}),offer({allowedPurposes:['event'],eventCapacity:'40'}));
 assert.equal(r.status,'needs_details');assert.ok(r.unknown.includes('garden-event-legal-review'));
 assert.ok(r.matched.includes('capacity'));
});
test('water, duration and privacy requirements do not silently pass',()=>{
 const w=wanted({waterPreference:'well',duration:'monthly',privacyRequired:true});
 const r=compareSpaceListings(w,offer({rentalDuration:'daily',privacy:'shared'}));
 assert.equal(r.status,'incompatible');assert.ok(r.conflicts.includes('garden-duration'));
 assert.ok(r.conflicts.includes('garden-privacy'));assert.ok(r.matched.includes('garden-water'));
});
test('request for other garden purpose stays manual, not auto-compatible',()=>{
 const r=compareSpaceListings(wanted({purpose:'other',otherPurpose:'نگهداری درختان خاص'}),offer({allowedPurposes:['other'],otherPurpose:'نگهداری نهال'}));
 assert.equal(r.status,'needs_details');assert.ok(r.unknown.includes('garden-other-purpose-review'));
});

test('garden deposit groups digits live without mutating stored amount',()=>{
 assert.equal(formatGardenMoneyInput('۱۲٬۰۰۰٬۰۰۰'),'12,000,000');
 assert.equal(gardenMoneyInputDigits('١٬٢٠٠٬٠٠٠'),'1200000');
 assert.equal(attrs({financialMode:'deposit_rent',depositRial:'12,000,000'}).values.depositRial,12000000);
});
test('irrigation is a known existing feature and unknown privacy is not a confirmed rejection',()=>{
 const sample=offer({allowedPurposes:['orchard'],privacy:'unknown'});
 sample.gardenDetails.irrigation='drip';
 const r=compareSpaceListings(wanted({privacyRequired:true,features:['irrigation']}),sample);
 assert.equal(r.status,'needs_details');
 assert.ok(r.unknown.includes('garden-privacy'));
 assert.ok(r.matched.includes('feature:irrigation'));
});
