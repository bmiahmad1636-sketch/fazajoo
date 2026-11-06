import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const add=file('src/pages/AddParking.jsx'),edit=file('src/pages/EditParking.jsx'),details=file('src/pages/ParkingDetails.jsx'),ctrl=file('backend/src/controllers/spaces.controller.js'),ui=file('src/components/GardenOfferFields.jsx'),legacy=file('src/components/GardenFields.jsx');
test('garden offer wired to both registration and editing, request isolated',()=>{
 for(const s of [add,edit]){
  assert.match(s,/GardenOfferFields/);assert.match(s,/makeGardenAttributes\(/);assert.match(s,/validateGardenOffer\(/);
  assert.match(s,/GardenRequestFields/);assert.match(s,/writeGardenRequest/);
 }
});
test('existing water, trees, house and climate are retained as gardenDetails',()=>{
 assert.match(ui,/<GardenFields/);
 assert.match(ui,/onDetailsChange/);
 assert.match(legacy,/ClimateFields/);
 for(const s of [add,edit,ctrl])assert.match(s,/gardenDetails/);
});
test('final page only holds price and contact and notes are optional in details',()=>{
 assert.match(add,/"shop", "garden", "residential"\].includes\(form.category\) && !isWantedAd/);
 assert.match(edit,/"shop", "garden", "residential"\].includes\(parking\?\.category\) && !isWanted/);
 assert.match(ui,/نکات خاص باغ \(اختیاری\)/);
 assert.match(ui,/onNoteChange\?\.\(e.target.value\)/);
});
test('server validates new garden offers and sanitizes only supply fields',()=>{
 assert.match(ctrl,/cleanGardenSpaceAttributes/);
 assert.match(ctrl,/space.category === "garden" && space.spaceAttributes\?\.schemaVersion === 1/);
 assert.match(ctrl,/"land","shop","garden"/);
});
test('garden public detail shows typed values and no empty notes section',()=>{
 assert.match(details,/کاربردها و شرایط واگذاری باغ/);
 assert.match(details,/استفاده برای مراسم/);
 assert.match(details,/"shop", "garden", "residential"\].includes\(category\)/);
});
