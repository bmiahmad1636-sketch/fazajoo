import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('supply and demand for warehouse remain distinct through both form routes',()=>{
 const add=read('src/pages/AddParking.jsx'), edit=read('src/pages/EditParking.jsx');
 assert.match(add,/form.category === "warehouse" && !isWantedAd && \(/);
 assert.match(add,/<IndustrialOfferFields/);
 assert.match(add,/isWantedAd && form.category === "warehouse"/);
 assert.match(add,/writeShedRequest\("", form.shedRequest\)/);
 assert.match(edit,/parking\?\.category === "warehouse" && !isWanted && \(/);
 assert.match(edit,/<IndustrialOfferFields/);
 assert.match(edit,/isWanted && parking\?\.category === "warehouse"/);
 assert.match(edit,/writeShedRequest\("", form.shedRequest\)/);
});
test('typed industrial attributes persist and are displayed without compulsory final notes',()=>{
 const add=read('src/pages/AddParking.jsx'),edit=read('src/pages/EditParking.jsx'),detail=read('src/pages/ParkingDetails.jsx');
 assert.match(add,/makeIndustrialAttributes\(form.industrialOffer\)/);
 assert.match(edit,/makeIndustrialAttributes\(form.industrialOffer\)/);
 assert.match(edit,/industrialOfferFromAttributes\(parking\?\.spaceAttributes\)/);
 assert.match(add,/\["parking", "storage", "warehouse", "land", "shop", "garden", "residential", "villa"\]\.includes\(form.category\)/);
 assert.match(edit,/\["parking", "storage", "warehouse", "land", "shop", "garden", "residential", "villa"\]\.includes\(parking\?\.category\)/);
 assert.match(detail,/category === "warehouse" && !isWanted && parking\?\.spaceAttributes/);
 assert.match(detail,/ویژگی‌های سوله و کارگاه/);
 assert.match(read('src/components/IndustrialOfferFields.jsx'),/نکات خاص سوله یا کارگاه \(اختیاری\)/);
});
test('server separately sanitizes industrial and storage data only for offer',()=>{
 const c=read('backend/src/controllers/spaces.controller.js');
 assert.match(c,/cleanIndustrialSpaceAttributes\(body.spaceAttributes/);
 assert.match(c,/space.listingType === "offer" && space.category === "warehouse"/);
 assert.match(c,/cleanStorageSpaceAttributes\(body.spaceAttributes/);
});
test('layout uses paired aligned rows and mobile stacking',()=>{
 const css=read('src/components/IndustrialOfferFields.css');
 assert.match(css,/\.fj-io-row\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:640px\)/);
 const form=read('src/components/IndustrialOfferFields.jsx');
 assert.match(form,/fj-io-field/);
 assert.match(form,/aria-expanded/);
});
