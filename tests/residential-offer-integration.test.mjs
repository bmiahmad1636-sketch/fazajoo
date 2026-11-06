import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const add=read("src/pages/AddParking.jsx"),edit=read("src/pages/EditParking.jsx");
const ctrl=read("backend/src/controllers/spaces.controller.js");
const ui=read("src/components/ResidentialFields.jsx");
const details=read("src/pages/ParkingDetails.jsx"),card=read("src/components/ParkingCard.jsx");

test("residential supply is independent of demand across create/edit flows",()=>{
  for(const src of [add,edit]){
    assert.match(src,/validateResidentialOffer\(form.residentialOffer, form.residentialDetails, form.area\)/);
    assert.match(src,/makeResidentialAttributes\(form.residentialOffer,form.residentialDetails\)/);
    assert.match(src,/writeResidentialRequest\(form.residentialRequest/);
    assert.match(src,/<ResidentialRequestFields/);
    assert.match(src,/<ResidentialFields/);
    assert.match(src,/residentialListingPrice\(form.residentialOffer,form.residentialDetails\)/);
  }
});
test("residential note is optional and entered only in supplementary section",()=>{
  assert.match(add,/"garden", "residential", "villa"\].includes\(form.category\) && !isWantedAd/);
  assert.match(edit,/"garden", "residential", "villa"\].includes\(parking\?\.category\) && !isWanted/);
  assert.match(ui,/نکات خاص ملک \(اختیاری\)/);
  assert.match(ui,/onNoteChange\?\.\(e.target.value\)/);
  assert.match(details,/"garden", "residential", "villa"\].includes\(category\) && !isWanted && !String\(parking.description/);
});
test("server ignores forged generic rent and separates financial modes",()=>{
  assert.match(ctrl,/cleanResidentialSpaceAttributes\(body.spaceAttributes, "residential", "offer"\)/);
  assert.match(ctrl,/typedResidential\?\.schemaVersion === 1 \? \(residentialRent \? String\(residentialRent\) : ""\)/);
  assert.match(ctrl,/residentialMode === "full_deposit" \? 0 : requestedResidentialRent/);
  assert.match(ctrl,/full_deposit" && \(space.price \|\| space.priceType !== "negotiable"\)/);
  assert.match(ctrl,/"garden","residential","villa"\].includes\(space.category\)/);
});
test("cards and both detail price locations use separate actual amounts",()=>{
  assert.match(card,/residentialFinancialRows\(residentialDetails,parking\?\.spaceAttributes\)/);
  assert.match(card,/gardenPriceRows.length \|\| residentialPriceRows.length/);
  assert.match(details,/residentialFinancialRows\(parking\?\.residentialDetails,parking\?\.spaceAttributes\)/);
  assert.match(details,/ShopMoneyRows items=\{residentialPriceRows\}/);
  assert.match(details,/ShopMoneyRows items=\{residentialPriceRows\} compact/);
  assert.match(details,/residentialPriceRows.map/);
});
test("form keeps existing room, building and climate fields conditional, paired on desktop, stacked on mobile",()=>{
  assert.match(ui,/room/);
  assert.match(ui,/totalFloors/);
  assert.match(ui,/unitsPerFloor/);
  assert.match(ui,/<ClimateFields/);
  const css=read("src/components/ResidentialFields.css");
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:700px\)/);
});
