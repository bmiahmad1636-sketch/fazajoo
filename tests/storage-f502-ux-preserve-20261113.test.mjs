import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { STORAGE_OFFER_DEFAULT, validateStorageOffer, makeStorageAttributes, storageOfferFromAttributes } from '../src/utils/storageOffer.js';
import { EMPTY_WAREHOUSE_REQUEST, warehouseRequestValidation, writeWarehouseRequest, readWarehouseRequest } from '../src/utils/warehouseRequest.js';
import { changeStorageTerm, changeStorageMode, changeStorageUnit, storageFinancialHeadline } from '../src/utils/storageRental.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = p => readFileSync(resolve(root,p),'utf8');
const offer = () => ({ ...STORAGE_OFFER_DEFAULT, rentalTerm:'long', financialMode:'deposit_rent', longRateUnit:'month', longMonthlyRentRial:'10000000', longDepositRial:'200000000', spaceType:'container', allowedPurposes:['commercial','equipment'], otherPurpose:'', access:'24h', heightM:'3.5', vehicleAccess:'truck', loadingMethod:'ramp', features:['security','power'], canNegotiateOtherTerm:true });
const request = () => ({ ...EMPTY_WAREHOUSE_REQUEST, rentalTerm:'long', financialMode:'deposit_rent', longRateUnit:'month', maxRentRial:'10000000', maxDepositRial:'200000000', purpose:'commercial', spaceType:'indoor', minArea:'25', maxArea:'60', access:'office', features:['security','truck'], requirements:'تحویل هنگام روز' });
const offerDetails=['spaceType','allowedPurposes','otherPurpose','access','heightM','vehicleAccess','loadingMethod','features','canNegotiateOtherTerm'];
const requestDetails=['purpose','otherPurpose','spaceType','minArea','maxArea','access','features','requirements'];
const unchanged = (before,after,keys) => { for(const key of keys) assert.deepEqual(after[key],before[key],`lost storage detail: ${key}`); };
for(const [label, wanted, factory, details] of [['offer',false,offer,offerDetails],['wanted',true,request,requestDetails]]) {
  test(`${label} switching long to short retains every category-specific field`,()=>{
    const a=factory(),b=changeStorageTerm(a,'short',wanted);
    unchanged(a,b,details);
    assert.equal(b.rentalTerm,'short');
    assert.equal(b.financialMode,'');
    assert.equal(b[wanted?'maxRentRial':'longMonthlyRentRial'],'');
    assert.equal(b[wanted?'maxDepositRial':'longDepositRial'],'');
    assert.ok(!storageFinancialHeadline(b,wanted).includes('200,000,000'));
  });
  test(`${label} switching short to long keeps specs and clears stale short amounts`,()=>{
    const a={...factory(),rentalTerm:'short',shortRateUnit:'week',...(wanted?{maxBudgetRial:'800000',maxSecurityHoldRial:'500000'}:{shortRateRial:'800000',securityHoldRial:'500000'})};
    const b=changeStorageTerm(a,'long',wanted);
    unchanged(a,b,details);
    assert.equal(b[wanted?'maxBudgetRial':'shortRateRial'],'');
    assert.equal(b[wanted?'maxSecurityHoldRial':'securityHoldRial'],'');
  });
  for(const mode of ['rent_only','full_deposit'])test(`${label} switching financial mode ${mode} retains storage details`,()=>{
    const a=factory(),b=changeStorageMode(a,mode,wanted);
    unchanged(a,b,details);
    assert.equal(b.financialMode,mode);
    if(mode==='rent_only')assert.equal(b[wanted?'maxDepositRial':'longDepositRial'],'');
    if(mode==='full_deposit')assert.equal(b[wanted?'maxRentRial':'longMonthlyRentRial'],'');
  });
  test(`${label} changing billing unit retains storage details but clears previous rent`,()=>{
    const a=factory(),b=changeStorageUnit(a,'year',wanted);
    unchanged(a,b,details);
    assert.equal(b.longRateUnit,'year');
    assert.equal(b[wanted?'maxRentRial':'longMonthlyRentRial'],'');
  });
  test(`${label} reselecting the same unit cannot erase category-specific details`,()=>{
    const a=factory(),b=changeStorageUnit(a,'month',wanted);
    unchanged(a,b,details);
  });
  test(`${label} domain details survive serialize/parse after contract switch`,()=>{
    const b=changeStorageTerm(factory(),'short',wanted);
    const r=wanted?readWarehouseRequest(writeWarehouseRequest('متن آزاد',b)).data:storageOfferFromAttributes(makeStorageAttributes(b));
    unchanged(b,r,details);
  });
}
test('offer required commodity category validation stays intact',()=>{
  assert.equal(validateStorageOffer({...offer(),allowedPurposes:[]}), 'حداقل یک نوع کالای قابل نگهداری را انتخاب کنید.');
});
test('wanted required purpose validation stays intact',()=>{
  assert.equal(warehouseRequestValidation({...request(),purpose:''}), 'کاربری انبار موردنیاز را انتخاب کنید.');
});
test('offer purpose error is rendered inside the commodity group, not only after rental section',()=>{
  const s=src('src/components/StorageOfferFields.jsx');
  assert.match(s,/purposeError && <small role="alert" className="fj-po-error">\{error\}<\/small>/);
  assert.ok(s.indexOf('purposeError && <small') < s.indexOf('ساعت دسترسی به انبار'));
  assert.match(s,/!\(typeError \|\| purposeError \|\| otherPurposeError \|\| accessError\)/);
});
test('request purpose error is directly below the select and not duplicated at form bottom',()=>{
  const s=src('src/components/WarehouseRequestFields.jsx');
  assert.match(s,/select\("کاربری انبار \*", "purpose"[^\n]+purposeError \? error : ""/);
  assert.match(s,/inlineError && <small role="alert"/);
  assert.match(s,/error && !purposeError && !otherPurposeError/);
});
test('the shared rental form is restricted to storage-specific note and keeps parking behavior',()=>{
  const s=src('src/components/ParkingRentalFields.jsx');
  assert.match(s,/storage \? "با تغییر مدت یا نوع قرارداد، مشخصات انبار حفظ می‌شوند/);
  assert.match(s,/"مبالغ تنها برای همین مدت قرارداد ثبت می‌شوند/);
});
