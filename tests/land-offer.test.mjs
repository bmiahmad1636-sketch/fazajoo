import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {LAND_OFFER_DEFAULT,validateLandOffer,makeLandAttributes,landOfferFromAttributes} from '../src/utils/landOffer.js';
import {toSpaceProfile} from '../src/utils/spaceProfile.js';
import {compareSpaceListings} from '../src/utils/spaceCompatibility.js';
import {LAND_PURPOSES} from '../src/utils/landRental.js';
const require=createRequire(import.meta.url);
const {cleanLandSpaceAttributes}=require('../backend/src/utils/landSpaceAttributes.js');
const sample=()=>({...LAND_OFFER_DEFAULT,landType:'prepared',allowedPurposes:['depot','logistics'],accessRoad:'asphalt',legalUse:'industrial',locationType:'industrial',slope:'flat',frontageM:'۲۰٫۵',vehicleAccess:'trailer',waterSources:['well'],features:['fence','electricity','loading'],depositRial:'۱۰۰٬۰۰۰٬۰۰۰'});
const supply=(attrs,area=1200)=>({listingType:'offer',category:'land',city:'شهرضا',area,price:8000000,priceType:'monthly',spaceAttributes:attrs});
const demand=(data={})=>({listingType:'wanted',category:'land',city:'شهرضا',description:`[FAZAJOO_LAND_RENTAL:${encodeURIComponent(JSON.stringify(data))}]`});

test('land offer requires real type, confirmed uses and road access',()=>{
 const v=sample();assert.match(validateLandOffer({...v,landType:''}),/وضعیت/);
 assert.match(validateLandOffer({...v,allowedPurposes:[]}),/حداقل/);
 assert.match(validateLandOffer({...v,accessRoad:''}),/راه دسترسی/);
 assert.equal(validateLandOffer(v),'');
 assert.equal(validateLandOffer({...v,accessRoad:'unknown'}),'');
});
test('other land use requires a meaningful owner explanation',()=>{
 assert.match(validateLandOffer({...sample(),allowedPurposes:['other'],otherPurpose:''}),/حداقل/);
 assert.equal(validateLandOffer({...sample(),allowedPurposes:['other'],otherPurpose:'نمایش تجهیزات سنگین'}),'');
 assert.equal(makeLandAttributes({...sample(),otherPurpose:'بی ربط'}).values.otherPurpose,'');
});
test('land uses exactly demand purpose identifiers without making a legal assertion',()=>{
 const attr=makeLandAttributes(sample());
 const id=new Set(LAND_PURPOSES.map(([id])=>id));
 assert.ok(attr.values.allowedPurposes.every(x=>id.has(x)));
 assert.equal(attr.values.landType,'prepared');
 assert.equal(attr.values.legalUse,'industrial');
 assert.equal(attr.values.permitApproved,undefined);
});
test('Persian digits and formatted numbers are preserved as typed numeric values',()=>{
 const attr=makeLandAttributes(sample());
 assert.equal(attr.values.frontageM,20.5);
 assert.equal(attr.values.depositRial,100000000);
 const restored=landOfferFromAttributes(attr);
 assert.equal(restored.frontageM,'20.5');
 assert.equal(restored.depositRial,'100000000');
 assert.equal(validateLandOffer({...sample(),frontageM:'40000'}).length>0,true);
 assert.equal(validateLandOffer({...sample(),depositRial:'1.3'}).length>0,true);
});
test('water none and water-source selections cannot be contradictory',()=>{
 assert.match(validateLandOffer({...sample(),waterSources:['none','well']}),/هم‌زمان/);
 assert.deepEqual(makeLandAttributes({...sample(),waterSources:['none','well']}).values.waterSources,['none']);
 assert.deepEqual(makeLandAttributes({...sample(),waterSources:['well','fake','well']}).values.waterSources,['well']);
});
test('backend strips forged legal assertions, private data and invalid numeric amounts',()=>{
 const attrs=makeLandAttributes(sample());
 attrs.values.allowedPurposes.push('fake');
 attrs.values.features.push('camera','fence');
 attrs.values.waterSources.push('fake');
 attrs.values.legalUse='not_verified';
 attrs.values.ownerPhone='sensitive';
 attrs.values.depositRial=-123;
 const clean=cleanLandSpaceAttributes(attrs,'land','offer');
 assert.deepEqual(clean.values.allowedPurposes,['depot','logistics']);
 assert.deepEqual(clean.values.features,['fence','electricity','loading']);
 assert.deepEqual(clean.values.waterSources,['well']);
 assert.equal(clean.values.legalUse,null);
 assert.equal(clean.values.depositRial,null);
 assert.equal(clean.values.ownerPhone,undefined);
});
test('backend does not persist supply contract on demand or mismatched category',()=>{
 const attr=makeLandAttributes(sample());
 assert.deepEqual(cleanLandSpaceAttributes(attr,'land','wanted'),{});
 assert.deepEqual(cleanLandSpaceAttributes(attr,'storage','offer'),{});
 assert.deepEqual(cleanLandSpaceAttributes({...attr,category:'garden'},'land','offer'),{});
});
test('land request and supply expose comparable typed semantics while permit needs review',()=>{
 const land=supply(makeLandAttributes(sample()));
 const wanted=demand({primaryPurpose:'depot',minArea:'۱۰۰۰',maxArea:'۱۵۰۰',legalUse:'industrial',locationType:'industrial',features:['fence'],rentPeriod:'monthly',rent:'10000000',deposit:'150000000'});
 const profile=toSpaceProfile(land);
 assert.equal(profile.depositRial,100000000);
 assert.equal(profile.fields.accessRoad,'asphalt');
 const result=compareSpaceListings(wanted,land);
 assert.equal(result.status,'needs_details',JSON.stringify(result));
 assert.ok(result.matched.includes('land-purpose'));
 assert.ok(result.matched.includes('land-legal-use'));
 assert.ok(result.matched.includes('land-location-type'));
 assert.ok(result.matched.includes('deposit-irr'));
 assert.ok(result.matched.includes('rent-irr'));
 assert.ok(result.unknown.includes('land-permit-review'));
});
test('concrete land purpose or zoning conflicts are flagged, not silently accepted',()=>{
 const attr=makeLandAttributes(sample());
 const mismatches=[
  ['other-purpose',{primaryPurpose:'tourism'},'land-purpose'],
  ['wrong-legal',{primaryPurpose:'depot',legalUse:'residential'},'land-legal-use'],
  ['wrong-location',{primaryPurpose:'depot',locationType:'rural'},'land-location-type'],
 ];
 for(const [name,w,code] of mismatches){const r=compareSpaceListings(demand(w),supply(attr));assert.equal(r.status,'incompatible',name);assert.ok(r.conflicts.includes(code),name);}
});
test('legacy land supply and free-text Other request never become verified matches',()=>{
 const unknown=compareSpaceListings(demand({primaryPurpose:'depot'}),supply({}));
 assert.equal(unknown.status,'needs_details');assert.ok(unknown.unknown.includes('land-purpose'));
 const other=compareSpaceListings(demand({primaryPurpose:'other',otherPurpose:'آزمایش تجهیزات'}),supply(makeLandAttributes({...sample(),allowedPurposes:['other'],otherPurpose:'فضای نمایشگاه'})));
 assert.equal(other.status,'needs_details');assert.ok(other.unknown.includes('land-other-purpose-review'));
});
test('no invented map coordinates, notes or legal permits in typed land attributes',()=>{
 const attrs=makeLandAttributes({...sample(),description:'private note',lat:32.01,lng:51.5});
 const text=JSON.stringify(attrs);
 assert.ok(!text.includes('private note'));
 assert.ok(!text.includes('32.01'));
 assert.ok(!text.includes('51.5'));
 assert.ok(!text.includes('permitApproved'));
});
test('seasonal land rental request cannot be compared to monthly supply merely by amount',()=>{
 const r=compareSpaceListings(demand({primaryPurpose:'depot',rentPeriod:'seasonal',rent:'3000000'}),supply(makeLandAttributes(sample())));
 assert.equal(r.status,'needs_details');assert.ok(r.unknown.includes('price-period'));
});

test('agriculture-only details are conditional, with no stale crops on unrelated land',()=>{
 const agri=makeLandAttributes({...sample(),landType:'agricultural',allowedPurposes:['agriculture'],crops:['wheat','saffron'],irrigation:'drip'});
 assert.deepEqual(agri.values.crops,['wheat','saffron']);assert.equal(agri.values.irrigation,'drip');
 const non=makeLandAttributes({...sample(),landType:'vacant',allowedPurposes:['parking'],crops:['wheat'],irrigation:'drip'});
 assert.deepEqual(non.values.crops,[]);assert.equal(non.values.irrigation,null);
 const server=cleanLandSpaceAttributes({...non,values:{...non.values,crops:['wheat'],irrigation:'drip'}},'land','offer');
 assert.deepEqual(server.values.crops,[]);assert.equal(server.values.irrigation,null);
});
test('no confirmed water and confirmed water feature cannot coexist',()=>{
 assert.match(validateLandOffer({...sample(),waterSources:['none'],features:['water']}),/هم‌زمان/);
 const safe=cleanLandSpaceAttributes(makeLandAttributes({...sample(),waterSources:['none'],features:['water']}),'land','offer');
 assert.deepEqual(safe.values.waterSources,['none']);assert.ok(!safe.values.features.includes('water'));
});
