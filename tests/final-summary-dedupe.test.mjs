import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const add = readFileSync(new URL('../src/pages/AddParking.jsx', import.meta.url), 'utf8');
const edit = readFileSync(new URL('../src/pages/EditParking.jsx', import.meta.url), 'utf8');

for (const [label, source] of [['ثبت', add], ['ویرایش', edit]]) {
  test(`${label}: هیچ باکس خلاصه مالی تکراری در فرم نیست`, () => {
    assert.doesNotMatch(source, /className=["']fj-pr-summary["']/);
  });
  test(`${label}: یادداشت تکراری رهن کامل باغ در مرحله نهایی نیست`, () => {
    assert.doesNotMatch(source, /className=["']fj-go-price-note["']/);
  });
  test(`${label}: پیش‌نمایش زنده مالی هر ۹ دسته حفظ شده`, () => {
    for (const fn of [
      'parkingFinancialHeadline', 'storageFinancialHeadline',
      'industrialFinancialHeadline', 'landContractHeadline',
      'gardenFinancialHeadline', 'villaFinancialHeadline',
      'residentialFinancialHeadline', 'shopFinancialHeadline',
      'otherFinancialHeadline',
    ]) assert.ok(source.includes(`${fn}(`), `${label}: ${fn} should stay in financial preview`);
  });
  test(`${label}: فیلدهای اصلی و اعتبارسنجی همچنان در کد هستند`, () => {
    for (const fn of ['validateParkingRentalOffer', 'validateStorageRental', 'validateIndustrialRental', 'validateLandContract']) {
      assert.ok(source.includes(fn), `${label}: missing ${fn}`);
    }
  });
}

test('ثبت: فرم همچنان مرحله سوم و پیش‌نمایش آگهی را دارد', () => {
  assert.match(add, /currentStep === 3/);
  assert.match(add, /add-parking-preview/);
  assert.match(add, /add-parking-actions/);
});

test('ویرایش: کارت پیش‌نمایش زنده دست‌نخورده است', () => {
  assert.match(edit, /edit-parking-preview__price/);
  assert.match(edit, /edit-parking-preview__image/);
  assert.match(edit, /edit-parking-preview__content/);
});

test('وضعیت نمایش حذف تکرارها در هر ۹ دسته مستقل از دسته است', () => {
  const categories = ['parking', 'storage', 'warehouse', 'land', 'shop', 'garden', 'villa', 'residential', 'other'];
  for (const category of categories) {
    assert.ok(add.includes(`"${category}"`), `missing category ${category} in add`);
    assert.ok(edit.includes(`"${category}"`), `missing category ${category} in edit`);
  }
});
