import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PARKING_RENTAL_DEFAULT, PARKING_WANTED_FINANCE_DEFAULT,
  parkingRentalBadges, parkingMoneyRows, parkingFinancialHeadline,
  changeParkingRentalTerm, changeParkingFinancialMode,
} from '../src/utils/parkingRental.js';
import { makeParkingAttributes, PARKING_OFFER_DEFAULT } from '../src/utils/parkingOffer.js';
import { readParkingRequestDetails, writeParkingRequestDetails, EMPTY_PARKING_REQUEST } from '../src/utils/parkingRequestDetails.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { cleanParkingSpaceAttributes } = require('../backend/src/utils/parkingSpaceAttributes.js');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(resolve(root, rel), 'utf8');
const offer = (mode='deposit_rent') => ({ ...PARKING_RENTAL_DEFAULT, rentalTerm:'long', financialMode:mode,
  longRateUnit:'month', longDepositRial:mode==='rent_only'?'':'250000000',
  longMonthlyRentRial:mode==='full_deposit'?'':'18000000', canNegotiateOtherTerm:true });
const wanted = (mode='deposit_rent') => ({ ...PARKING_WANTED_FINANCE_DEFAULT, rentalTerm:'long', financialMode:mode,
  longRateUnit:'month', maxDepositRial:mode==='rent_only'?'':'300000000', maxRentRial:mode==='full_deposit'?'':'20000000' });
for (const term of ['short','long']) for (const wantedSide of [false,true]) {
  test(`selected ${term} term ${wantedSide?'wanted':'offer'} remains the only confirmed term`,()=>{
    const val={rentalTerm:term, canNegotiateOtherTerm:false};
    assert.deepEqual(parkingRentalBadges(val,wantedSide).map(x=>x.state),[wantedSide?'requested':'primary']);
    assert.equal(parkingRentalBadges(val,wantedSide)[0].label,term==='short'?'کوتاه‌مدت':'بلندمدت');
  });
  test(`negotiable second term ${term} ${wantedSide?'wanted':'offer'} never becomes a second confirmed term`,()=>{
    const data=parkingRentalBadges({rentalTerm:term,canNegotiateOtherTerm:true},wantedSide);
    assert.deepEqual(data.map(x=>x.state),wantedSide?['requested']:['primary','possible']);
    if(!wantedSide) assert.notEqual(data[0].term,data[1].term);
  });
}
for(const mode of ['rent_only','deposit_rent','full_deposit']) for (const wantedSide of [false,true]) {
  test(`monetary rows for ${wantedSide?'wanted':'offer'} ${mode} show only accurate contract amounts`,()=>{
    const values=wantedSide?wanted(mode):offer(mode);
    const rows=parkingMoneyRows(values,wantedSide);
    assert.ok(rows.length);
    assert.ok(rows.every(x=>x.amount.includes('ریال')));
    assert.ok(rows.every(x=>!['مدت قرارداد','نوع قرارداد'].includes(x.label)));
    assert.equal(rows.some(x=>x.label.includes('رهن')),mode!=='rent_only');
    assert.equal(rows.some(x=>x.label.includes('اجاره')),mode!=='full_deposit');
    if(mode==='deposit_rent') assert.equal(rows.length,2);
    const headline=parkingFinancialHeadline(values,wantedSide);
    assert.ok(headline.includes('ریال'));
    assert.equal(headline.includes('نوع قرارداد'),false);
    assert.equal(headline.includes('مدت قرارداد'),false);
  });
}
for (const wantedSide of [false,true]) {
  test(`short-term ${wantedSide?'wanted':'offer'} keeps damage hold separate from rent and fully visible`,()=>{
    const values=wantedSide? {...PARKING_WANTED_FINANCE_DEFAULT,rentalTerm:'short',shortRateUnit:'hour',maxBudgetRial:'3200000',maxSecurityHoldRial:'6000000'}
      :{...PARKING_RENTAL_DEFAULT,rentalTerm:'short',shortRateUnit:'hour',shortRateRial:'3000000',securityHoldRial:'5000000'};
    assert.equal(parkingMoneyRows(values,wantedSide).length,2);
    assert.ok(parkingFinancialHeadline(values,wantedSide).includes('ضمانت خسارت / ودیعه'));
  });
}
test('backend-sanitized offer keeps BOTH rent and deposit for the same active contract',()=>{
  const raw={...PARKING_OFFER_DEFAULT,...offer(),vehicleUsage:'car',cover:'covered',access:'anytime'};
  const saved=cleanParkingSpaceAttributes(makeParkingAttributes(raw),'parking','offer').values;
  assert.equal(saved.longDepositRial,250000000);
  assert.equal(saved.longMonthlyRentRial,18000000);
  assert.equal(parkingMoneyRows(saved).length,2);
});
test('serialized wanted request keeps BOTH max rent and max deposit for the same active contract',()=>{
  const saved=readParkingRequestDetails(writeParkingRequestDetails({...EMPTY_PARKING_REQUEST,...wanted()},'car','')).data;
  assert.equal(saved.maxDepositRial,'300000000');
  assert.equal(saved.maxRentRial,'20000000');
  assert.equal(parkingMoneyRows(saved,true).length,2);
});
test('changing term clears all amounts and alternative stays a negotiation, not a second contract',()=>{
  const val=changeParkingRentalTerm(offer(),'short');
  assert.equal(val.longDepositRial,'');
  assert.equal(val.longMonthlyRentRial,'');
  assert.equal(parkingRentalBadges(val).length,2);
  const again=changeParkingFinancialMode(offer(),'rent_only');
  assert.equal(again.longDepositRial,'');
});
test('short and clear owner consent; no jargon in checkbox caption',()=>{
  const text=read('src/components/ParkingRentalFields.jsx');
  assert.match(text,/برای اجاره با مدت دیگر هم امکان مذاکره دارم/);
  assert.doesNotMatch(text,/درباره نوع مدت دیگر هم با توافق جداگانه مذاکره می‌کنم/);
  assert.match(text,/قیمت جداگانه‌ای برای آن ثبت نشده است/);
});
test('optional security hold help is a separate styled sentence, not glued onto optional label',()=>{
  const jsx=read('src/components/ParkingRentalFields.jsx');
  const css=read('src/components/ParkingRentalFields.css');
  assert.match(jsx,/fj-pr-field__hint/);
  assert.match(jsx,/این مبلغ اختیاری است/);
  assert.match(css,/\.fj-pr-field__hint\s*\{display:block/);
});
test('ready-to-publish preview uses parking finance, not empty generic form.price',()=>{
  const form=read('src/pages/AddParking.jsx');
  assert.match(form,/form\.category === "parking"\s*\? \(parkingFinancialHeadline\(isWantedAd \? form\.parkingRequestDetails : form\.parkingOffer, isWantedAd\)/);
  assert.ok(form.indexOf('form.category === "parking"\n                                ? (parkingFinancialHeadline')<form.indexOf('form.price ? `${formatPriceInput(form.price)} ریال` : "قیمت آگهی"'));
});
test('card price shows ONLY money rows and term badges reside beneath city',()=>{
  const card=read('src/components/ParkingCard.jsx');
  assert.match(card,/parkingFinancial = category === "parking" \? parkingMoneyRows/);
  assert.match(card,/<ParkingRentalBadges[\s\S]*?wanted=\{isWanted\} compact/);
  assert.doesNotMatch(card,/parkingTermLabel/);
});
test('both detail price locations show complete specialist amounts, not just generic monthly rate',()=>{
  const details=read('src/pages/ParkingDetails.jsx');
  assert.match(details,/parkingPriceItems = category === "parking" \? parkingMoneyRows/);
  const matches=details.match(/ShopMoneyRows items=\{parkingPriceItems\} compact stacked|ShopMoneyRows items=\{parkingPriceItems\} stacked/g)||[];
  assert.equal(matches.length,2);
  assert.match(details,/<ParkingRentalBadges[\s\S]*?wanted=\{isWanted\}/);
});
test('financial mode has its own specialist section, without repeating term and type inside price',()=>{
  const details=read('src/pages/ParkingDetails.jsx');
  assert.equal((details.match(/\["نوع قرارداد بلندمدت", PARKING_MODES\.find/g)||[]).length,3);
  assert.ok(parkingMoneyRows(offer()).every(x=>x.label!=='نوع قرارداد'));
  assert.ok(parkingMoneyRows(wanted(),true).every(x=>x.label!=='نوع قرارداد'));
});
test('the four older category rental badges retain their own unchanged components',()=>{
  const c=read('src/components/ParkingCard.jsx');
  const d=read('src/pages/ParkingDetails.jsx');
  for(const name of ['VillaRentalBadges','ResidentialRentalBadges','GardenRentalBadges','OtherRentalBadges']){
    assert.match(c,new RegExp(`<${name}`));
    assert.match(d,new RegExp(`<${name}`));
  }
});
