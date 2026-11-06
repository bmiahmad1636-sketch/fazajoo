import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  RESIDENTIAL_OFFER_DEFAULT, validateResidentialOffer, makeResidentialAttributes,
  residentialFinancialHeadline, residentialFinancialRows, residentialListingPrice,
  residentialDetailsForActiveContract,
} from '../src/utils/residentialOffer.js';
const read = (p) => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base={propertyType:'apartment', deposit:'950000000', monthlyRent:'400000000'};
const rentOnly={...RESIDENTIAL_OFFER_DEFAULT,rentalTerm:'long',financialMode:'rent_only'};
const fullDeposit={...RESIDENTIAL_OFFER_DEFAULT,rentalTerm:'long',financialMode:'full_deposit'};
const depositRent={...RESIDENTIAL_OFFER_DEFAULT,rentalTerm:'long',financialMode:'deposit_rent'};
const short={...RESIDENTIAL_OFFER_DEFAULT,rentalTerm:'short',shortRateUnit:'night',shortRateRial:'16000000',securityHoldRial:'50000000'};

test('RT01 UI hotfix: rent-only edit never asks to clear an invisible legacy deposit',()=>{
  assert.match(validateResidentialOffer(rentOnly,base,85),/ودیعه/); // raw stale data remains invalid
  assert.equal(validateResidentialOffer(rentOnly,residentialDetailsForActiveContract(rentOnly,base),85),'');
  const cleaned=residentialDetailsForActiveContract(rentOnly,base);
  assert.equal(cleaned.deposit,'');
  assert.equal(cleaned.monthlyRent,base.monthlyRent);
  assert.equal(base.deposit,'950000000'); // no mutation of original data
  const attrs=makeResidentialAttributes(rentOnly,cleaned);
  const headline=residentialFinancialHeadline(cleaned,attrs);
  assert.match(headline,/اجاره ماهانه/);
  assert.ok(!headline.includes('ودیعه'));
  assert.equal(residentialListingPrice(rentOnly,cleaned).price,'400000000');
});
test('RT01 UI hotfix: full-deposit edit clears stale hidden monthly rent only',()=>{
  assert.match(validateResidentialOffer(fullDeposit,base,85),/اجاره/);
  assert.equal(validateResidentialOffer(fullDeposit,residentialDetailsForActiveContract(fullDeposit,base),85),'');
  const cleaned=residentialDetailsForActiveContract(fullDeposit,base);
  assert.equal(cleaned.deposit,base.deposit);
  assert.equal(cleaned.monthlyRent,'');
  assert.equal(residentialListingPrice(fullDeposit,cleaned).price,'');
  assert.match(residentialFinancialHeadline(cleaned,makeResidentialAttributes(fullDeposit,cleaned)),/رهن کامل/);
});
test('RT01 UI hotfix: deposit plus rent retains both displayed amounts',()=>{
  const cleaned=residentialDetailsForActiveContract(depositRent,base);
  assert.deepEqual(cleaned,base);
  assert.equal(residentialFinancialRows(cleaned,makeResidentialAttributes(depositRent,cleaned)).length,2);
});
test('RT01 UI hotfix: short-term edit clears unrelated mortgage values and preserves damages',()=>{
  const cleaned=residentialDetailsForActiveContract(short,base);
  assert.equal(cleaned.deposit,'');assert.equal(cleaned.monthlyRent,'');
  assert.equal(residentialListingPrice(short,cleaned).price,'16000000');
  const attrs=makeResidentialAttributes(short,cleaned);
  const rows=residentialFinancialRows(cleaned,attrs);
  assert.deepEqual(rows.map(x=>x.label),['اجاره شبانه','ودیعه / ضمانت خسارت (قابل استرداد طبق توافق)']);
  assert.equal(rows.some(x=>x.label==='رهن کامل'),false);
});
test('RT01 UI hotfix: add and edit previews use live dedicated residential headline',()=>{
  const add=read('src/pages/AddParking.jsx');
  const edit=read('src/pages/EditParking.jsx');
  for(const s of [add,edit]) {
    assert.match(s,/residentialFinancialHeadline\(residentialDetailsForActiveContract\(form\.residentialOffer, form\.residentialDetails\), makeResidentialAttributes\(form\.residentialOffer, form\.residentialDetails\)\)/);
    assert.match(s,/residentialDetailsForActiveContract\(form\.residentialOffer, form\.residentialDetails\)/);
  }
  assert.match(edit,/residentialDetailsForActiveContract\(residentialOfferFromAttributes\(parking\?\.spaceAttributes,parking\?\.residentialDetails\)/);
  const fields=read('src/components/ResidentialFields.jsx');
  assert.match(fields,/ودیعه \/ ضمانت خسارت \(اختیاری، ریال\)/);
});
