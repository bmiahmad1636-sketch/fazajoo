import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import { INDUSTRIAL_OFFER_DEFAULT, validateIndustrialOffer, makeIndustrialAttributes,
 industrialOfferFromAttributes, industrialFeaturesFor } from '../src/utils/industrialOffer.js';
import { toSpaceProfile } from '../src/utils/spaceProfile.js';
import { compareSpaceListings } from '../src/utils/spaceCompatibility.js';
const require = createRequire(import.meta.url);
const {cleanIndustrialSpaceAttributes}=require('../backend/src/utils/industrialSpaceAttributes.js');
const shed=()=>({...INDUSTRIAL_OFFER_DEFAULT,spaceType:'shed',allowedActivities:['production','packaging'],power:'three',powerCapacityKw:'۱۵۰',heightM:'۷٫۵',vehicleAccess:'trailer',flooring:'reinforced',operationHours:'24h',features:['water','loading','crane','fire_safety'],craneCapacityTons:'۵'});
const workshop=()=>({...INDUSTRIAL_OFFER_DEFAULT,spaceType:'workshop',allowedActivities:['repair','metal'],power:'single',vehicleAccess:'van',features:['ventilation','workbench']});
const offer=(attrs,area=800)=>({listingType:'offer',category:'warehouse',city:'اصفهان',area,price:50000000,priceType:'monthly',spaceAttributes:attrs});
const wanted=(v)=>({listingType:'wanted',category:'warehouse',city:'اصفهان',description:`[FAZAJOO_SHED_REQUEST:${encodeURIComponent(JSON.stringify(v))}]`});

test('industrial offer requires real type, activity and power',()=>{
 const v=shed();
 assert.match(validateIndustrialOffer({...v,spaceType:''}),/نوع فضا/);
 assert.match(validateIndustrialOffer({...v,allowedActivities:[]}),/فعالیت/);
 assert.match(validateIndustrialOffer({...v,power:''}),/برق/);
 assert.equal(validateIndustrialOffer(v),'');
});
test('shed and workshop activities and features are specialized, not conflated',()=>{
 assert.equal(validateIndustrialOffer(workshop()),'');
 assert.ok(!industrialFeaturesFor('workshop').some(([id])=>id==='crane'));
 assert.ok(industrialFeaturesFor('shed').some(([id])=>id==='crane'));
 const a=makeIndustrialAttributes({...workshop(),allowedActivities:['production','metal']});
 assert.deepEqual(a.values.allowedActivities,['metal']);
});
test('specialized other activity needs a meaningful description',()=>{
 assert.match(validateIndustrialOffer({...shed(),allowedActivities:['other'],otherActivity:''}),/حداقل/);
 assert.equal(validateIndustrialOffer({...shed(),allowedActivities:['other'],otherActivity:'مونتاژ تجهیزات خاص'}),'');
});
test('farsi digits and decimals, optional height and crane capacity are parsed',()=>{
 const attr=makeIndustrialAttributes(shed());
 assert.equal(attr.values.heightM,7.5);
 assert.equal(attr.values.powerCapacityKw,150);
 assert.equal(attr.values.craneCapacityTons,5);
 assert.deepEqual(attr.category,'warehouse');
 assert.equal(industrialOfferFromAttributes(attr).powerCapacityKw,'150');
 assert.equal(industrialOfferFromAttributes({category:'storage'}).spaceType,'');
 assert.equal(validateIndustrialOffer({...shed(),heightM:'abc'}).length>0,true);
 assert.equal(validateIndustrialOffer({...shed(),powerCapacityKw:'25000'}).length>0,true);
});
test('non-three-phase power erases irrelevant capacity',()=>{
 assert.equal(makeIndustrialAttributes({...workshop(),powerCapacityKw:'120'}).values.powerCapacityKw,null);
 assert.equal(makeIndustrialAttributes({...workshop(),features:[],craneCapacityTons:''}).values.craneCapacityTons,null);
});
test('server removes forged attributes and forbidden features',()=>{
 const attr=makeIndustrialAttributes(shed());
 attr.values.features.push('fake','soundproof','crane');
 attr.values.allowedActivities.push('metal','production');
 attr.values.ownerPhone='sensitive';
 const safe=cleanIndustrialSpaceAttributes(attr,'warehouse','offer');
 assert.deepEqual(safe.values.allowedActivities,['production','packaging']);
 assert.deepEqual(safe.values.features,['water','loading','crane','fire_safety']);
 assert.equal(safe.values.ownerPhone,undefined);
});
test('server enforces category and side, and cannot invent unknown data',()=>{
 const attr=makeIndustrialAttributes(shed());
 assert.deepEqual(cleanIndustrialSpaceAttributes(attr,'warehouse','wanted'),{});
 assert.deepEqual(cleanIndustrialSpaceAttributes(attr,'storage','offer'),{});
 assert.deepEqual(cleanIndustrialSpaceAttributes({...attr,category:'parking'},'warehouse','offer'),{});
 const safe=cleanIndustrialSpaceAttributes({...attr,values:{...attr.values,heightM:500,powerCapacityKw:20001,craneCapacityTons:1000}},'warehouse','offer');
 assert.equal(safe.values.heightM,null);
 assert.equal(safe.values.powerCapacityKw,null);
 assert.equal(safe.values.craneCapacityTons,null);
});
test('a complete shed offer matches exact activity, height, power and access',()=>{
 const attr=cleanIndustrialSpaceAttributes(makeIndustrialAttributes(shed()),'warehouse','offer');
 const result=compareSpaceListings(wanted({spaceType:'shed',activity:'production',minArea:'600',maxArea:'1000',minHeight:'6',power:'three',powerCapacity:'100',access:'truck',features:['crane','water']}),offer(attr));
 assert.equal(result.status,'compatible',JSON.stringify(result));
});
test('insufficient height, capacity or space-type are concrete incompatibilities',()=>{
 const attrs=makeIndustrialAttributes(shed());
 const checks=[
  {d:{spaceType:'workshop',activity:'repair'},field:'space-type'},
  {d:{spaceType:'shed',activity:'production',minHeight:'8'},field:'industrial-min-height'},
  {d:{spaceType:'shed',activity:'production',power:'three',powerCapacity:'200'},field:'industrial-power-capacity'},
 ];
 for(const {d,field} of checks){const result=compareSpaceListings(wanted(d),offer(attrs));assert.equal(result.status,'incompatible');assert.ok(result.conflicts.includes(field));}
});
test('legacy shed advertisements and missing features are unknown, never false',()=>{
 const result=compareSpaceListings(wanted({spaceType:'shed',activity:'production',features:['crane']}),offer({}));
 assert.equal(result.status,'needs_details');
 const withoutCrane=makeIndustrialAttributes({...shed(),features:['water'],craneCapacityTons:''});
 const res=compareSpaceListings(wanted({spaceType:'shed',activity:'production',features:['crane']}),offer(withoutCrane));
 assert.equal(res.status,'needs_details');
 assert.ok(res.unknown.includes('feature:crane'));
});
test('other activity, contract duration and prose constraints require manual review',()=>{
 const attrs=makeIndustrialAttributes({...shed(),allowedActivities:['other'],otherActivity:'انبارداری ماشین‌آلات صنعتی'});
 const res=compareSpaceListings(wanted({spaceType:'shed',activity:'other',otherActivity:'ساخت تجهیزات سفارشی',duration:'long',requirements:'اجازه نصب خط تولید'}),offer(attrs));
 assert.equal(res.status,'needs_details');
 for(const name of ['industrial-other-activity-review','industrial-duration-review','industrial-special-conditions-review'])assert.ok(res.unknown.includes(name));
});
test('typed attributes never include free-form note or precise location',()=>{
 const attrs=makeIndustrialAttributes(shed());
 assert.equal(JSON.stringify(attrs).includes('نکات خاص'),false);
 assert.equal(JSON.stringify(toSpaceProfile(offer(attrs))).includes('ownerPhone'),false);
});

test('three-phase only cannot be claimed compatible with single-phase request',()=>{
 const attrs=makeIndustrialAttributes(shed());
 const result=compareSpaceListings(wanted({spaceType:'shed',activity:'production',power:'single'}),offer(attrs));
 assert.equal(result.status,'incompatible');
 assert.ok(result.conflicts.includes('industrial-power'));
 assert.equal(compareSpaceListings(wanted({spaceType:'shed',activity:'production',power:'single'}),offer(makeIndustrialAttributes({...shed(),power:'both'}))).status,'compatible');
});
