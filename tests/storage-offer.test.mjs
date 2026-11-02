import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { STORAGE_OFFER_DEFAULT, validateStorageOffer, makeStorageAttributes, storageOfferFromAttributes } from '../src/utils/storageOffer.js';
import { toSpaceProfile } from '../src/utils/spaceProfile.js';
import { compareSpaceListings } from '../src/utils/spaceCompatibility.js';
const require=createRequire(import.meta.url);
const {cleanStorageSpaceAttributes}=require('../backend/src/utils/storageSpaceAttributes.js');
const v=()=>({...STORAGE_OFFER_DEFAULT,spaceType:'indoor',allowedPurposes:['personal','commercial'],access:'24h',features:['power','dry'],heightM:'۳٫۵',vehicleAccess:'truck',loadingMethod:'ground'});
const offer=attrs=>({listingType:'offer',category:'storage',city:'شهرضا',area:150,price:10000000,priceType:'monthly',spaceAttributes:attrs});
const wanted=(detail)=>({listingType:'wanted',category:'storage',city:'شهرضا',description:`[FAZAJOO_WAREHOUSE_REQUEST:${encodeURIComponent(JSON.stringify(detail))}]`});
test('three essential storage offer sections are required',()=>{
 assert.match(validateStorageOffer({...v(),spaceType:''}),/نوع فضای/);
 assert.match(validateStorageOffer({...v(),allowedPurposes:[]}),/حداقل یک/);
 assert.match(validateStorageOffer({...v(),access:''}),/زمان دسترسی/);
 assert.equal(validateStorageOffer(v()),'');
});
test('other stored purpose requires a meaningful explanation',()=>{
 assert.ok(validateStorageOffer({...v(),allowedPurposes:['other'],otherPurpose:''}));
 assert.equal(validateStorageOffer({...v(),allowedPurposes:['other'],otherPurpose:'محصولات نمایشگاهی'}),'');
});
test('height is optional and only applicable to a roofed space',()=>{
 assert.ok(validateStorageOffer({...v(),heightM:'۰٫۷'}));
 assert.ok(validateStorageOffer({...v(),heightM:'21'}));
 assert.ok(validateStorageOffer({...v(),heightM:'abc'}));
 assert.equal(validateStorageOffer({...v(),spaceType:'outdoor',heightM:'abc'}),'');
 assert.equal(makeStorageAttributes({...v(),spaceType:'outdoor'}).values.heightM,null);
});
test('serialized warehouse offer is typed as storage and round trips',()=>{
 const out=makeStorageAttributes(v());
 assert.deepEqual([out.schemaVersion,out.category],[1,'storage']);
 assert.equal(out.values.heightM,3.5);
 assert.deepEqual(storageOfferFromAttributes(out).allowedPurposes,['personal','commercial']);
 assert.equal(storageOfferFromAttributes({category:'parking',values:out.values}).spaceType,'');
});
test('explicit vehicle/loading options derive positive demand-compatible features',()=>{
 const f=makeStorageAttributes(v()).values.features;
 assert.ok(f.includes('truck'));assert.ok(f.includes('ground'));
 assert.ok(f.includes('power'));assert.ok(f.includes('dry'));
 const f2=makeStorageAttributes({...v(),vehicleAccess:'none',loadingMethod:'stairs',features:[]}).values.features;
 assert.ok(!f2.includes('truck')&&!f2.includes('ground'));
});
test('server sanitizes unknown fields and forged features',()=>{
 const raw=makeStorageAttributes(v());
 raw.values.features.push('fake','guard','guard');
 raw.values.allowedPurposes.push('unknown','commercial');
 raw.values.ownerPhone='private';
 const safe=cleanStorageSpaceAttributes(raw,'storage','offer');
 assert.deepEqual(safe.values.allowedPurposes,['personal','commercial']);
 assert.ok(!safe.values.features.includes('fake'));
 assert.equal(safe.values.features.filter(x=>x==='guard').length,1);
 assert.equal(safe.values.ownerPhone,undefined);
});
test('server ignores storage attributes on wanted and mismatching categories',()=>{
 const attrs=makeStorageAttributes(v());
 assert.deepEqual(cleanStorageSpaceAttributes(attrs,'storage','wanted'),{});
 assert.deepEqual(cleanStorageSpaceAttributes(attrs,'warehouse','offer'),{});
 assert.deepEqual(cleanStorageSpaceAttributes({...attrs,category:'parking'},'storage','offer'),{});
});
test('server does not accept forged derived features',()=>{
 const attrs=makeStorageAttributes({...v(),vehicleAccess:'none',loadingMethod:'stairs',features:[]});
 attrs.values.features=['truck','ground','security'];
 const safe=cleanStorageSpaceAttributes(attrs,'storage','offer');
 assert.deepEqual(safe.values.features,['security']);
});
test('server ignores outdoor height and clamps out of range values',()=>{
 assert.equal(cleanStorageSpaceAttributes(makeStorageAttributes({...v(),spaceType:'outdoor'}),'storage','offer').values.heightM,null);
 const attrs=makeStorageAttributes(v());attrs.values.heightM=40;
 assert.equal(cleanStorageSpaceAttributes(attrs,'storage','offer').values.heightM,null);
});
test('a known matching storage request can be classified compatible',()=>{
 const attrs=cleanStorageSpaceAttributes(makeStorageAttributes(v()),'storage','offer');
 const outcome=compareSpaceListings(wanted({purpose:'commercial',spaceType:'indoor',access:'office',minArea:'100',maxArea:'200',features:['dry','truck','ground']}),offer(attrs));
 assert.equal(outcome.status,'compatible',JSON.stringify(outcome));
});
test('known conflicting purpose and type are incompatible',()=>{
 const attrs=cleanStorageSpaceAttributes(makeStorageAttributes(v()),'storage','offer');
 const outcome=compareSpaceListings(wanted({purpose:'food',spaceType:'outdoor'}),offer(attrs));
 assert.equal(outcome.status,'incompatible');
 assert.ok(outcome.conflicts.includes('space-type'));
 assert.ok(outcome.conflicts.includes('storage-purpose'));
});
test('unknown attributes of a legacy storage offer never become a false negative',()=>{
 const outcome=compareSpaceListings(wanted({purpose:'commercial',spaceType:'indoor',access:'office'}),offer({}));
 assert.equal(outcome.status,'needs_details');
});
test('different categories cannot match despite same city and area',()=>{
 const attrs=makeStorageAttributes(v());
 assert.equal(compareSpaceListings(wanted({purpose:'personal'}),{...offer(attrs),category:'warehouse'}).status,'incompatible');
});
test('notes stay outside structured searchable fields',()=>{
 const attrs=makeStorageAttributes(v());
 assert.equal(JSON.stringify(attrs).includes('نکات خاص'),false);
 assert.equal(storageOfferFromAttributes(attrs).features.includes('dry'),true);
});
test('request features absent from offer are unknown rather than confirmed unavailable',()=>{
 const attrs=makeStorageAttributes({...v(),features:[],vehicleAccess:'',loadingMethod:''});
 const result=compareSpaceListings(wanted({purpose:'personal',features:['temperature']}),offer(attrs));
 assert.equal(result.status,'needs_details');
 assert.ok(result.unknown.includes('feature:temperature'));
});

test('other storage goods are never automatically declared compatible',()=>{
 const a=makeStorageAttributes({...v(),allowedPurposes:['other'],otherPurpose:'وسایل نمایشگاهی'});
 const result=compareSpaceListings(wanted({purpose:'other',otherPurpose:'تجهیزات پزشکی'}),offer(a));
 assert.equal(result.status,'needs_details');
 assert.ok(result.unknown.includes('storage-other-purpose-review'));
});
