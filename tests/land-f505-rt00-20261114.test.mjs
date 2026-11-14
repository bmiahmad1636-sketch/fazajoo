import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import POLICY from '../shared/rental-term-policy.v1.json' with {type:'json'};
import {
 LAND_CONTRACT_DEFAULT, validateLandContract,landContractPrice,landContractRows,landContractBadges,
 changeLandTerm,changeLandMode,changeLandUnit,landActiveContract,landMoneyInput,
} from '../src/utils/landContract.js';
import {makeLandAttributes,landOfferFromAttributes} from '../src/utils/landOffer.js';
import {readLandRental,writeLandRental} from '../src/utils/landRental.js';
import {toSpaceProfile} from '../src/utils/spaceProfile.js';
import {compareSpaceListings} from '../src/utils/spaceCompatibility.js';
const require=createRequire(import.meta.url);
const {cleanLandFinance,validateLandFinance,landFinancePrice,readWantedLandFinance}=require('../backend/src/utils/landRentalFinance.js');
const {cleanLandSpaceAttributes}=require('../backend/src/utils/landSpaceAttributes.js');
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const base={...LAND_CONTRACT_DEFAULT,landType:'agricultural',allowedPurposes:['agriculture','depot'],accessRoad:'asphalt',frontageM:'۱۲٫۵',features:['fence'],primaryPurpose:'agriculture', minArea:'100',maxArea:'1000'};
const fixtures=[];
for(const unit of ['day','week','month'])fixtures.push(['short-'+unit,{rentalTerm:'short',shortRateUnit:unit,shortRateRial:'1200000',securityHoldRial:'7000000',maxBudgetRial:'2000000',maxSecurityHoldRial:'9000000'},({day:'daily',week:'weekly',month:'monthly'})[unit]]);
fixtures.push(['seasonal',{rentalTerm:'seasonal',seasonalRateRial:'15000000',maxBudgetRial:'19000000'},'negotiable']);
for(const unit of ['month','year'])for(const mode of ['rent_only','deposit_rent','full_deposit'])fixtures.push(['long-'+unit+'-'+mode,{rentalTerm:'long',longRateUnit:unit,financialMode:mode,longDepositRial:'120000000',longMonthlyRentRial:'2200000',longYearlyRentRial:'25000000',maxRentRial:'30000000',maxDepositRial:'150000000'},mode==='full_deposit'?'negotiable':unit==='year'?'yearly':'monthly']);

test('F5-05 extends only land in shared policy, no extra engine',()=>{
 assert.deepEqual(POLICY.categories.land.rateUnitsByTerm.short,['day','week','month']);
 assert.deepEqual(POLICY.categories.land.rateUnitsByTerm.seasonal,['season']);
 assert.deepEqual(POLICY.categories.land.rateUnitsByTerm.long,['month','year']);
 assert.match(read('src/utils/landContract.js'),/validateRentalTermProfile/);
 assert.doesNotMatch(read('src/utils/landContract.js'),/matchScore|createNotificationsForNewOffer/);
});
for(const [name,fields,priceType] of fixtures){
 for(const wanted of [false,true])test(`F5-05 ${name} ${wanted?'wanted':'offer'}: UI + backend same terms, prices and active values`,()=>{
  const v={...base,...fields};
  assert.equal(validateLandContract(v,wanted),'');
  const active=landActiveContract(v,wanted);
  const server=cleanLandFinance(active,wanted);
  assert.equal(server.financeSchemaVersion,1);
  assert.equal(validateLandFinance(server,wanted),'');
  const uiPrice=landContractPrice(v,wanted),backendPrice=landFinancePrice(server,wanted);
  assert.deepEqual(backendPrice,uiPrice);
  assert.equal(uiPrice.priceType,priceType);
  assert.ok(landContractRows(v,wanted).length>=2);
  assert.ok(landContractBadges(v,wanted).length>0);
  assert.equal(uiPrice.priceType==='negotiable',uiPrice.price==='');
  if(fields.rentalTerm==='seasonal'){
   assert.match(landContractRows(v,wanted).map(x=>x.label).join(' '),/فصل/);
   assert.notEqual(landContractRows(v,wanted).find(x=>x.label.includes('فصل'))?.amount,'اجاره ماهانه');
  }
  if(fields.financialMode==='full_deposit'){
    assert.ok(landContractRows(v,wanted).some(x=>x.label.includes('رهن')));
    assert.ok(!landContractRows(v,wanted).some(x=>x.label.includes('اجاره /')));
  }
 });
}
test('F5-05 offer: typed attributes survive backend whitelist and edit restoration',()=>{
 const v={...base,rentalTerm:'short',shortRateUnit:'month',shortRateRial:'۲٬۴۰۰٬۰۰۰',securityHoldRial:'۱۰۰۰۰۰'};
 const attrs=makeLandAttributes(v);
 const safe=cleanLandSpaceAttributes(attrs,'land','offer');
 assert.equal(safe.values.shortRateRial,2400000);
 assert.equal(safe.values.securityHoldRial,100000);
 assert.equal(safe.values.frontageM,12.5);
 assert.equal(safe.values.depositRial,null);
 assert.equal(safe.values.canNegotiateOtherTerm,false);
 const edit=landOfferFromAttributes(safe);
 assert.equal(edit.shortRateRial,2400000);
 assert.equal(edit.shortRateUnit,'month');
 assert.equal(edit.landType,'agricultural');
 assert.deepEqual(edit.allowedPurposes,['agriculture','depot']);
});
test('F5-05 wanted metadata roundtrips without losing physical criteria or typed finance',()=>{
 const data={...base,rentalTerm:'long',longRateUnit:'year',financialMode:'deposit_rent',maxDepositRial:'5000000',maxRentRial:'12000000',purposeDetails:{agriculture:{detail:'زراعت'}},requirements:'رفت‌وآمد تراکتور'};
 const desc=writeLandRental(data,'توضیح آزاد');
 assert.deepEqual(readWantedLandFinance(desc).rentalTerm,'long');
 const {data:read,description,hasMetadata}=readLandRental(desc);
 assert.equal(hasMetadata,true);assert.equal(description,'توضیح آزاد');
 assert.equal(read.maxDepositRial,'5000000');assert.equal(read.purposeDetails.agriculture.detail,'زراعت');
 assert.equal(read.requirements,'رفت‌وآمد تراکتور');
 assert.equal(validateLandFinance(read,true),'');
});
test('F5-05 preserve physical data, clean only obsolete money on term/mode/unit switch',()=>{
 const v={...base,rentalTerm:'short',shortRateUnit:'day',shortRateRial:'70000',securityHoldRial:'1000000',canNegotiateOtherTerm:true};
 const changed=changeLandTerm(v,'long');
 assert.equal(changed.landType,'agricultural');assert.equal(changed.frontageM,'۱۲٫۵');
 assert.deepEqual(changed.features,['fence']);assert.equal(changed.shortRateRial,'');
 assert.equal(changed.canNegotiateOtherTerm,true);
 const mode=changeLandMode({...changed,longDepositRial:'900000',longMonthlyRentRial:'50000'},'full_deposit');
 assert.equal(mode.longDepositRial,'');assert.equal(mode.longMonthlyRentRial,'');
 assert.equal(mode.frontageM,'۱۲٫۵');
 const unit=changeLandUnit({...v,shortRateRial:'90000'},'month');
 assert.equal(unit.shortRateRial,'');assert.equal(unit.frontageM,'۱۲٫۵');
});
test('F5-05 validation rejects empty, forged and malformed financial contracts before publish',()=>{
 assert.match(validateLandContract(base,false),/مدت/);
 assert.match(validateLandFinance({...base,financeSchemaVersion:1},false),/مدت/);
 assert.match(validateLandContract({...base,rentalTerm:'short',shortRateUnit:'month',shortRateRial:'-1'}),/مبلغ/);
 assert.match(validateLandFinance({...base,rentalTerm:'short',shortRateUnit:'month',shortRateRial:'-1'},false),/مبلغ/);
 assert.match(validateLandContract({...base,rentalTerm:'long',financialMode:'full_deposit',longDepositRial:''}),/رهن/);
 assert.equal(landMoneyInput('۴٬۸۰۰٬۰۰۰'),'4800000');
});
test('F5-05 crop share is separate: never invent monthly rent or auto-match',()=>{
 const crop={...base,rentalTerm:'',transactionKind:'crop_share',cropShareNotes:'سهم طرفین و تعهدات برداشت محصول پس از توافق بررسی می‌شود.'};
 assert.equal(validateLandContract(crop,true),'');
 assert.equal(validateLandFinance(crop,true),'');
 assert.deepEqual(landFinancePrice(crop,true),{price:'',priceType:'negotiable'});
 const wanted={category:'land',listingType:'wanted',city:'شهرضا',description:writeLandRental(crop)};
 const offer={category:'land',listingType:'offer',city:'شهرضا',area:500,price:'1000000',priceType:'monthly',spaceAttributes:makeLandAttributes({...base,rentalTerm:'short',shortRateUnit:'month',shortRateRial:'1000000'})};
 const match=compareSpaceListings(wanted,offer);
 assert.notEqual(match.status,'match');
 assert.ok(match.unknown.includes('land-crop-share-legal-review'));
});
test('F5-05 no false period match between seasonal and monthly land contracts',()=>{
 const wanted={category:'land',listingType:'wanted',city:'شهرضا',description:writeLandRental({...base,rentalTerm:'seasonal',maxBudgetRial:'10000000'})};
 const offer={category:'land',listingType:'offer',city:'شهرضا',area:500,price:'1000000',priceType:'monthly',spaceAttributes:makeLandAttributes({...base,rentalTerm:'short',shortRateUnit:'month',shortRateRial:'1000000'})};
 const result=compareSpaceListings(wanted,offer);
 assert.ok(result.conflicts.includes('land-primary-term'));
});
test('F5-05 every UI and server integration path references the same contract',()=>{
 for(const p of ['src/pages/AddParking.jsx','src/pages/EditParking.jsx']){
  const src=read(p);assert.match(src,/validateLandContract/);assert.match(src,/landContractPrice/);assert.match(src,/landContractRows/);
 }
 assert.match(read('src/components/ParkingCard.jsx'),/landContractMoneyRows/);
 assert.match(read('src/pages/ParkingDetails.jsx'),/landContractMoneyRows/);
 assert.match(read('backend/src/controllers/spaces.controller.js'),/validateLandFinance/);
 assert.match(read('backend/src/controllers/spaces.controller.js'),/derivedLandPrice/);
});
