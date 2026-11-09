import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeVillaRequest, readVillaRequest, VILLA_REQUEST_LONG_MODES, villaRequestLabel } from "../src/utils/villaRequest.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const jsx = readFileSync(resolve(root, "src/pages/ParkingDetails.jsx"), "utf8");
const cats = ["parking", "storage", "warehouse", "shop", "land", "residential", "villa", "garden", "other"];
const offered = {
  parking: 'category === "parking" && !isWanted', storage: 'category === "storage" && !isWanted',
  warehouse: 'category === "warehouse" && !isWanted', shop: 'category === "shop" && !isWanted',
  land: 'category === "land" && !isWanted', residential: 'category === "residential" && (!isWanted || !residentialWantedData)',
  villa: 'category === "villa" && (!isWanted || !villaWantedData)', garden: '!isWanted && category === "garden"',
  other: '!isWanted && category === "other"',
};
const wanted = {
  parking: 'isWanted && category === "parking"', storage: 'isWanted && category === "storage"',
  warehouse: 'isWanted && category === "warehouse"', shop: 'category === "shop" && isWanted',
  land: 'isWanted && category === "land"', residential: 'isWanted && category === "residential" && residentialWantedData',
  villa: 'isWanted && category === "villa" && villaWantedData', garden: 'isWanted && category === "garden" && gardenWantedData',
  other: 'isWanted && category === "other" && otherWantedData',
};
for (const category of cats) {
  test(`Details coverage: ${category} offer and wanted specialized paths`, () => {
    assert.ok(jsx.includes(offered[category]), `No offer branch: ${category}`);
    assert.ok(jsx.includes(wanted[category]), `No wanted branch: ${category}`);
  });
}
test("Structured villa wanted does not show the old generic villa offer block", () => {
  assert.ok(jsx.includes('{category === "villa" && (!isWanted || !villaWantedData) && ('));
});
test("Structured residential wanted does not show the old generic residential offer block", () => {
  assert.ok(jsx.includes('{category === "residential" && (!isWanted || !residentialWantedData) && ('));
});
test("Wanted villa long-term displays contract mode instead of short-term stay", () => {
  assert.ok(jsx.includes('d.rentalTerm === "long" ? villaRequestLabel(VILLA_REQUEST_LONG_MODES, d.financialMode) : ""'));
  assert.ok(jsx.includes('d.rentalTerm === "long" ? "" : villaRequestLabel(VILLA_REQUEST_STAYS, d.stayType)'));
  for (const [value,label] of VILLA_REQUEST_LONG_MODES) assert.equal(villaRequestLabel(VILLA_REQUEST_LONG_MODES, value),label);
});
test("Wanted villa long-term persisted rent-and-deposit mode survives decoding", () => {
  const note=writeVillaRequest({rentalTerm:"long",financialMode:"deposit_rent",accommodationType:"villa",guests:"5",maxDeposit:"50000000",maxBudget:"6000000"},"note");
  const got=readVillaRequest(note);assert.equal(got.hasMetadata,true);
  assert.equal(got.data.rentalTerm,"long");assert.equal(got.data.financialMode,"deposit_rent");
  assert.equal(got.data.maxBudget,"6000000");assert.equal(got.data.maxDeposit,"50000000");
});
test("Descriptions are independent from specialty sections",()=>{
  const desc=jsx.indexOf('parking-details-section--description');
  const wantedRes=jsx.indexOf('isWanted && category === "residential" && residentialWantedData && (() =>');
  const wantedVilla=jsx.indexOf('isWanted && category === "villa" && villaWantedData && (() =>');
  const wantedGarden=jsx.indexOf('isWanted && category === "garden" && gardenWantedData && (() =>');
  assert.ok(desc>0 && wantedRes>desc && wantedVilla>desc && wantedGarden>desc);
});
