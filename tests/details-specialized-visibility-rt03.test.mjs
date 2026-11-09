import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const detailSource = readFileSync(resolve(projectRoot, 'src/pages/ParkingDetails.jsx'), 'utf8');

const descriptionStart = detailSource.indexOf('{!(["parking", "storage", "warehouse", "land", "shop", "garden", "residential", "villa"].includes(category)');
const descriptionEnd = detailSource.indexOf('</article>\n              )}', descriptionStart);
const locationStart = detailSource.indexOf('<article className="parking-details-location">');

// The old bug: all specialized sections were nested inside the optional free-text
// description article, so a garden without a description showed only city/area/price.
test('RT03 detail: free-text description is its own optional section', () => {
  assert.ok(descriptionStart > 0, 'description conditional exists');
  assert.ok(descriptionEnd > descriptionStart, 'description article closes');
  assert.ok(detailSource.slice(descriptionStart, descriptionEnd).includes('parking-details-description'));
  assert.ok(descriptionEnd < locationStart, 'description closes before location');
});

for (const [kind, expression] of [
  ['garden offer', '!isWanted && category === "garden" && parking?.spaceAttributes?.schemaVersion === 1'],
  ['garden wanted', 'isWanted && category === "garden" && gardenWantedData'],
  ['residential', 'category === "residential" && ('],
  ['villa', 'category === "villa" && ('],
  ['shop offer', 'category === "shop" && !isWanted && parking?.spaceAttributes?.schemaVersion===1'],
  ['shop wanted', 'category === "shop" && isWanted && (()=>'],
]) {
  test(`RT03 detail: ${kind} section is not hidden by missing free-text description`, () => {
    const start = detailSource.lastIndexOf(expression, locationStart);
    assert.ok(start > descriptionEnd, `${kind} appears after closing description condition`);
    assert.ok(start < locationStart, `${kind} appears before the map/location block`);
  });
}

test('RT03 detail: real garden attributes render as readable fields and amenities', () => {
  const start = detailSource.indexOf('!isWanted && category === "garden" && parking?.spaceAttributes?.schemaVersion === 1');
  const end = detailSource.indexOf('{category === "garden" && (!isWanted', start);
  const block = detailSource.slice(start, end);
  assert.ok(block.includes('parking.spaceAttributes.values'));
  for (const key of ['gardenType', 'allowedPurposes', 'accessRoad', 'rentalTerm', 'privacy', 'features', 'eventCapacity']) {
    assert.ok(block.includes(key), `garden offer shows ${key}`);
  }
});

test('RT03 detail: wanted garden fields render independently of encoded description', () => {
  const start = detailSource.lastIndexOf('isWanted && category === "garden" && gardenWantedData', locationStart);
  const end = detailSource.indexOf('!isWanted && category === "garden"', start);
  const block = detailSource.slice(start, end);
  for (const key of ['purpose','rentalTerm','eventGuests','features','requirements']) assert.ok(block.includes(key));
});
