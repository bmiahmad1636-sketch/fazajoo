import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EMPTY_GARDEN_REQUEST, readGardenRequest, writeGardenRequest, validateGardenRequest} from '../src/utils/gardenRequest.js';

const jsx = readFileSync(new URL('../src/components/GardenRequestFields.jsx', import.meta.url), 'utf8');

test('RT03 conditions hotfix: remove empty optional usage accordion, retain real free-text special conditions', () => {
  assert.doesNotMatch(jsx, /شرایط استفاده \(اختیاری\)/);
  assert.match(jsx, /شرایط خاص \(اختیاری\)/);
  assert.equal((jsx.match(/<details\b/g) || []).length, 2); // features and special conditions only
});

test('RT03 conditions hotfix: event capacity is shown alongside basic request inputs, gated by event purpose', () => {
  const firstGrid = jsx.indexOf('<div style={data.purpose === "other"');
  const field = jsx.indexOf('numberField("ظرفیت تقریبی مهمان‌ها (اختیاری)", "eventGuests"');
  const financialSection = jsx.indexOf('مدت اصلی اجاره موردنیاز');
  assert.ok(firstGrid >= 0 && field > firstGrid && field < financialSection);
  assert.match(jsx.slice(firstGrid, field), /data\.purpose === "event"/);
  assert.equal((jsx.match(/"eventGuests"/g) || []).length, 1);
});

test('RT03 conditions hotfix: event consent/legal note is retained beside capacity', () => {
  assert.match(jsx, /رضایت مالک/);
  assert.match(jsx, /مجوزهای لازم/);
});

test('RT03 conditions hotfix: event count and special notes survive unchanged across persistence', () => {
  const input = {...EMPTY_GARDEN_REQUEST, purpose: 'event', rentalTerm: 'short', minArea: '500',
    shortRateUnit: 'daily', shortMaxBudgetRial: '9000000', eventGuests: '۴۵',
    requirements: 'دسترسی آرام و مناسب سالمندان مهم است.'};
  const metadata = writeGardenRequest(input, 'توضیح عمومی');
  const recovered = readGardenRequest(metadata);
  assert.equal(recovered.hasMetadata, true);
  assert.equal(recovered.data.eventGuests, '45');
  assert.equal(recovered.data.requirements, input.requirements);
  assert.equal(recovered.description, 'توضیح عمومی');
  assert.equal(validateGardenRequest(recovered.data), '');
});

test('RT03 conditions hotfix: other-purpose requests keep free-text notes without event capacity', () => {
  const input = {...EMPTY_GARDEN_REQUEST, purpose: 'recreation', rentalTerm: 'seasonal',
    minArea: '400', seasonalMaxBudgetRial: '120000000', requirements: 'به مسیر ماشین‌رو نیاز دارم.'};
  const recovered = readGardenRequest(writeGardenRequest(input));
  assert.equal(recovered.data.eventGuests, '');
  assert.equal(recovered.data.requirements, input.requirements);
  assert.equal(validateGardenRequest(recovered.data), '');
});
