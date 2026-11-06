import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RENTAL_TERM_SCHEMA_VERSION, getRentalOptions, parseRialAmount,
  validateRentalTermProfile, assessRentalTermAlignment, getTermBadgeState
} from '../shared/rental-term-core.mjs';
const policy = JSON.parse(readFileSync(new URL('../shared/rental-term-policy.v1.json', import.meta.url), 'utf8'));
const keys = ['parking','storage','warehouse','shop','land','residential','villa','garden','other'];
const offer = (primaryTerm, extra={}) => ({category:'villa', primaryTerm, ...extra});
const wanted = (primaryTerm, extra={}) => ({category:'villa', primaryTerm, ...extra});

test('policy has nine categories and stable version', () => {
  assert.equal(policy.schemaVersion, RENTAL_TERM_SCHEMA_VERSION);
  assert.deepEqual(Object.keys(policy.categories), keys);
  assert.equal(policy.status, 'foundation-only-not-connected-to-live-forms');
});
for (const key of keys) {
  test(`${key}: all configured units belong to available terms`, () => {
    const c = getRentalOptions(policy, key);
    assert.ok(c.terms.length >= 2);
    assert.ok(c.terms.every(t => Object.keys(c.rateUnitsByTerm).includes(t)));
    for (const [term, units] of Object.entries(c.rateUnitsByTerm)) {
      assert.ok(c.terms.includes(term));
      assert.ok(units.length);
      assert.equal(new Set(units).size, units.length);
      for (const unit of units) assert.ok(policy.rateUnits[unit]);
    }
  });
}
test('term never inferred from monthly unit', () => {
  const r = validateRentalTermProfile({category:'villa',side:'offer',rateUnit:'month'},policy);
  assert.equal(r.value.primaryTerm, null); assert.ok(r.errors.includes('rate_unit_not_allowed_for_term'));
});
test('new listing requires explicit term while legacy stays unknown', () => {
  const raw={category:'villa', side:'offer'};
  assert.equal(validateRentalTermProfile(raw,policy).value.primaryTerm,null);
  assert.ok(validateRentalTermProfile(raw,policy,{requireTerm:true}).errors.includes('term_required'));
});
test('villa night rate is short only', () => {
  assert.ok(validateRentalTermProfile({category:'villa',side:'offer',primaryTerm:'short',rateUnit:'night',rateAmountRial:'۱۰۰٬۰۰۰'},policy).ok);
  assert.ok(validateRentalTermProfile({category:'villa',side:'offer',primaryTerm:'long',rateUnit:'night'},policy).errors.includes('rate_unit_not_allowed_for_term'));
});
test('monthly rate allowed for short and long, distinct contracts', () => {
  for (const primaryTerm of ['short','long']) assert.ok(validateRentalTermProfile({category:'villa',side:'offer',primaryTerm,rateUnit:'month'},policy).ok);
});
test('seasonal unit allowed for land and garden, not villa', () => {
  for (const category of ['garden','land']) assert.ok(validateRentalTermProfile({category,side:'offer',primaryTerm:'seasonal',rateUnit:'season'},policy).ok);
  assert.ok(!validateRentalTermProfile({category:'villa',side:'offer',primaryTerm:'seasonal',rateUnit:'season'},policy).ok);
});
test('permission absent is unknown, not an implicit owner yes', () => {
  assert.equal(validateRentalTermProfile({category:'villa',side:'offer',primaryTerm:'short'},policy).value.canNegotiateOtherTerm,null);
  assert.equal(getTermBadgeState(offer('short'),policy).alternative.checkmarks,0);
});
test('explicit consent only accepts boolean true', () => {
  const base={category:'villa',side:'offer',primaryTerm:'short'};
  assert.ok(validateRentalTermProfile({...base,canNegotiateOtherTerm:'true'},policy).errors.includes('consent_must_be_boolean'));
  assert.ok(validateRentalTermProfile({...base,canNegotiateOtherTerm:true},policy).ok);
  assert.ok(validateRentalTermProfile({...base,canNegotiateOtherTerm:false},policy).ok);
});
test('wanted cannot opt in on behalf of property owner', () => {
  assert.ok(validateRentalTermProfile({category:'villa',side:'wanted',primaryTerm:'short',canNegotiateOtherTerm:true},policy).errors.includes('alternative_consent_not_allowed'));
});
test('seasonal does not manufacture alternative short/long consent', () => {
  assert.ok(validateRentalTermProfile({category:'land',side:'offer',primaryTerm:'seasonal',canNegotiateOtherTerm:true},policy).errors.includes('alternative_consent_not_allowed'));
});
test('security hold never substitutes for lease deposit', () => {
  assert.ok(validateRentalTermProfile({category:'villa',side:'offer',primaryTerm:'short',securityHoldRial:'۵۰٬۰۰۰٬۰۰۰'},policy).ok);
  assert.ok(validateRentalTermProfile({category:'villa',side:'offer',primaryTerm:'short',leaseDepositRial:50000000},policy).errors.includes('lease_deposit_requires_long_term'));
  assert.ok(validateRentalTermProfile({category:'villa',side:'offer',primaryTerm:'long',securityHoldRial:50000000},policy).errors.includes('security_hold_requires_short_term'));
});
test('long-term deposit and monthly rent retained separately', () => {
  const r=validateRentalTermProfile({category:'villa',side:'offer',primaryTerm:'long',leaseDepositRial:'2,000,000,000',monthlyRentRial:'15000000'},policy);
  assert.equal(r.value.leaseDepositRial,2000000000);assert.equal(r.value.monthlyRentRial,15000000);
});
for (const [source, expected] of [['۱۲۳٬۴۵۶',123456],['١٢٣,٤٥٦',123456],['0',0],[0,0],['123.45',null],['1e8',null],[true,null],['-123',null],[null,null],['',null],[Number.MAX_SAFE_INTEGER+1,null]]) {
  test(`parse Rial input: ${String(source)}`,()=>assert.equal(parseRialAmount(source),expected));
}
test('alternate terms always require review, never automatic match',()=>{
  const r=assessRentalTermAlignment(offer('short',{canNegotiateOtherTerm:true}), wanted('long'),policy);
  assert.equal(r.status,'needs_review'); assert.equal(r.reason,'alternative_requires_owner_agreement');
});
test('short and long with no consent are incompatible',()=>{
  assert.equal(assessRentalTermAlignment(offer('short'),wanted('long'),policy).status,'incompatible_term');
});
test('legacy unknown not auto-matched',()=>{
  assert.equal(assessRentalTermAlignment(offer(null),wanted('long'),policy).status,'needs_review');
});
test('same primary term only yields term-compatible signal',()=>{
  const r=assessRentalTermAlignment(offer('long'),wanted('long'),policy);
  assert.deepEqual(r,{status:'compatible_term',reason:'same_primary_term',scope:'term_only'});
});
test('different categories do not match even if same term',()=>{
  assert.equal(assessRentalTermAlignment({category:'villa',primaryTerm:'short'},{category:'residential',primaryTerm:'short'},policy).status,'incompatible_term');
});
test('unknown category never falsely matches',()=>{
  assert.equal(assessRentalTermAlignment({category:'unknown',primaryTerm:'short'},wanted('short'),policy).status,'needs_review');
});
test('Other spaces need manual review even when duration agrees',()=>{
  assert.equal(assessRentalTermAlignment({category:'other',primaryTerm:'short'},{category:'other',primaryTerm:'short'},policy).status,'needs_review');
});
test('price unit mismatch is not auto-converted',()=>{
  assert.equal(assessRentalTermAlignment(offer('short',{rateUnit:'night'}),wanted('short',{rateUnit:'week'}),policy).status,'needs_review');
});
test('rental badges reflect two ticks, one tick, or greyed out',()=>{
  const enabled=getTermBadgeState(offer('short',{canNegotiateOtherTerm:true}),policy);
  const disabled=getTermBadgeState(offer('long',{canNegotiateOtherTerm:false}),policy);
  assert.equal(enabled.primary.checkmarks,2);
  assert.equal(enabled.alternative.checkmarks,1);
  assert.equal(disabled.primary.checkmarks,2);
  assert.equal(disabled.alternative.checkmarks,0);
});
test('seasonal without opposite short/long has no rental toggle badges',()=>{
  assert.equal(getTermBadgeState({category:'garden',primaryTerm:'seasonal'},policy),null);
});
test('no price rate without a unit',()=>{
  assert.ok(validateRentalTermProfile({category:'parking',side:'offer',primaryTerm:'short',rateAmountRial:'1000'},policy).errors.includes('rate_unit_required_for_rate_amount'));
});
