import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
 GARDEN_OFFER_DEFAULT, validateGardenOffer, validateGardenFinancialRent,
 makeGardenAttributes, gardenOfferFromAttributes, gardenListingPrice,
 gardenFinancialRows, gardenFinancialHeadline, gardenFinancialMode
} from '../src/utils/gardenOffer.js';
const require=createRequire(import.meta.url);
const {cleanGardenSpaceAttributes}=require('../backend/src/utils/gardenSpaceAttributes.js');
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const base={...GARDEN_OFFER_DEFAULT,gardenType:'orchard',allowedPurposes:['recreation'],accessRoad:'asphalt'};
const payload=(v={})=>makeGardenAttributes({...base,...v});

test('garden financial mode is a required step-one selection',()=>{
 assert.match(validateGardenOffer(base),/شیوه دریافت/);
 assert.equal(validateGardenOffer({...base,financialMode:'rent_only'}),'');
});
test('rent only has no deposit, numeric rent stays as generic price with its period',()=>{
 const v={...base,financialMode:'rent_only'};
 assert.equal(validateGardenOffer({...v,depositRial:'3000000'}).includes('نباید'),true);
 assert.equal(payload(v).values.depositRial,null);
 assert.deepEqual(gardenListingPrice(v,'۱۲٬۰۰۰٬۰۰۰','weekly'),{price:'12000000',priceType:'weekly'});
 assert.equal(validateGardenFinancialRent(v,'','weekly').includes('مبلغ اجاره'),true);
 assert.equal(validateGardenFinancialRent(v,'12000000','weekly'),'');
});
test('full deposit requires a deposit but must not create generic rental price',()=>{
 const v={...base,financialMode:'full_deposit',depositRial:'1,200,000,000'};
 assert.equal(validateGardenOffer({...v,depositRial:''}).includes('ودیعه'),true);
 assert.equal(validateGardenOffer(v),'');
 assert.deepEqual(gardenListingPrice(v,'30000000','monthly'),{price:'',priceType:'negotiable'});
 const attrs=payload(v);
 assert.equal(attrs.values.depositRial,1200000000);
 assert.deepEqual(gardenFinancialRows(attrs,'','negotiable'),[{label:'رهن کامل',amount:'۱٬۲۰۰٬۰۰۰٬۰۰۰ ریال'}]);
});
test('rent plus deposit has distinct real amounts in card and details',()=>{
 const v={...base,financialMode:'deposit_rent',depositRial:'1,000,000,000'};
 const a=payload(v);
 assert.deepEqual(gardenFinancialRows(a,'15000000','monthly'),[
  {label:'ودیعه',amount:'۱٬۰۰۰٬۰۰۰٬۰۰۰ ریال'},
  {label:'اجاره ماهانه',amount:'۱۵٬۰۰۰٬۰۰۰ ریال'},
 ]);
 assert.match(gardenFinancialHeadline(a,'15000000','monthly'),/ودیعه.*اجاره ماهانه/);
 assert.deepEqual(gardenOfferFromAttributes(a,'15000000','monthly').financialMode,'deposit_rent');
});
test('financial changes sanitize and do not inject stale or forged values',()=>{
 const forged={...payload({financialMode:'rent_only'}),values:{...payload({financialMode:'rent_only'}).values,depositRial:99999999,financialMode:'rent_only',admin:true}};
 const v=cleanGardenSpaceAttributes(forged,'garden','offer').values;
 assert.equal(v.depositRial,null);
 assert.equal(v.admin,undefined);
 const other=cleanGardenSpaceAttributes(payload({financialMode:'full_deposit',depositRial:500000}),'garden','wanted');
 assert.deepEqual(other,{});
});
test('old gardens infer a reasonable edit mode while original fields remain intact',()=>{
 const old=payload({financialMode:'',depositRial:'1000000'});
 const oldDeposit={...old,values:{...old.values,financialMode:null,depositRial:1000000}};
 assert.equal(gardenFinancialMode(oldDeposit,'2000000','monthly'),'deposit_rent');
 assert.equal(gardenFinancialMode(oldDeposit,'','negotiable'),'full_deposit');
 assert.equal(gardenFinancialMode(payload({financialMode:''}),'2000000','daily'),'rent_only');
 assert.deepEqual(gardenFinancialRows(oldDeposit,'2000000','monthly'),[]);
});
test('unavailable rent is never fabricated even when the owner picked deposit+rent',()=>{
 const a=payload({financialMode:'deposit_rent',depositRial:'2000000'});
 assert.deepEqual(gardenFinancialRows(a,'','negotiable'),[
  {label:'ودیعه',amount:'۲٬۰۰۰٬۰۰۰ ریال'},
  {label:'اجاره',amount:'توافقی'},
 ]);
});
test('duplicate access road input is hidden only in new garden offer form and old details retained',()=>{
 const ui=read('src/components/GardenOfferFields.jsx');
 const details=read('src/components/GardenFields.jsx');
 const publicDetails=read('src/pages/ParkingDetails.jsx');
 assert.match(ui,/hideAccessRoad\s*\/>/);
 assert.match(details,/!hideAccessRoad/);
 assert.match(publicDetails,/parking\?\.spaceAttributes\?\.values\?\.accessRoad/);
});
test('final garden rent is conditional on full deposit and wired to server canonical price',()=>{
 const add=read('src/pages/AddParking.jsx');
 const edit=read('src/pages/EditParking.jsx');
 const backend=read('backend/src/controllers/spaces.controller.js');
 for(const jsx of [add,edit]){
  assert.match(jsx,/gardenListingPrice/);
  assert.match(jsx,/validateGardenFinancialRent/);
  assert.match(jsx,/financialMode === "full_deposit"/);
 }
 assert.match(backend,/fullDepositGarden/);
 assert.match(backend,/fullDepositGarden \? ""/);
 assert.match(backend,/fullDepositGarden \? "negotiable"/);
});
test('price fields for requested garden and all unrelated categories remain separate',()=>{
 const card=read('src/components/ParkingCard.jsx');
 const details=read('src/pages/ParkingDetails.jsx');
 assert.match(card,/!isWanted&&category==="garden"\?gardenFinancialHeadline/);
 assert.match(details,/gardenFinancialRows/);
 assert.match(details,/<ShopMoneyRows items=\{gardenPriceRows\} compact \/>/);
 assert.match(card,/gardenBudgetText/);
 assert.match(card,/parking-card__garden-money-row/);
 assert.match(details,/gardenBudgetText/);
});
test('image upload old-image duplicate check has bounded network wait and stage timing',()=>{
 const ui=read('src/components/ImageUploader.jsx');
 assert.match(ui,/EXISTING_IMAGE_HASH_TIMEOUT_MS = 1500/);
 assert.match(ui,/controller\.abort\(\)/);
 assert.match(ui,/Promise\.all\(images\.map\(hashExistingImage\)\)/);
 assert.match(ui,/preparationMs/);
 assert.match(ui,/transferMs/);
 assert.doesNotMatch(ui,/console\.info\([^\n]*file\.name/);
});
