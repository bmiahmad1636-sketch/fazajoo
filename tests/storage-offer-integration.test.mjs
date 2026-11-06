import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('storage offer is rendered in registration and edit but wanted stays in its independent branch',()=>{
 const add=read('src/pages/AddParking.jsx');const edit=read('src/pages/EditParking.jsx');
 assert.match(add,/form.category === "storage" && !isWantedAd && \(/);
 assert.match(add,/<StorageOfferFields/);
 assert.match(add,/isWantedAd && form.category === "storage"/);
 assert.match(edit,/parking\?\.category === "storage" && !isWanted && \(/);
 assert.match(edit,/<StorageOfferFields/);
 assert.match(edit,/isWanted && parking\?\.category === "storage"/);
});
test('registration and edit save structured storage details without moving request metadata',()=>{
 const a=read('src/pages/AddParking.jsx');const e=read('src/pages/EditParking.jsx');
 assert.match(a,/makeStorageAttributes\(form\.storageOffer\)/);
 assert.match(e,/makeStorageAttributes\(form\.storageOffer\)/);
 assert.match(a,/writeWarehouseRequest\("", form\.warehouseRequest\)/);
 assert.match(e,/writeWarehouseRequest\("", form\.warehouseRequest\)/);
});
test('storage offers no longer require an empty final description',()=>{
 const a=read('src/pages/AddParking.jsx');const e=read('src/pages/EditParking.jsx');
 assert.match(a,/!\(\["parking", "storage", "warehouse", "land", "shop", "garden", "residential", "villa"\]\.includes\(form\.category\) && !isWantedAd\)/);
 assert.match(e,/!\(\["parking", "storage", "warehouse", "land", "shop", "garden", "residential", "villa"\]\.includes\(parking\?\.category\) && !isWanted\)/);
 assert.match(read('src/components/StorageOfferFields.jsx'),/نکات خاص انبار \(اختیاری\)/);
});
test('public storage detail section shows typed offers and no fake empty description',()=>{
 const p=read('src/pages/ParkingDetails.jsx');
 assert.match(p,/category === "storage" && !isWanted && parking\?\.spaceAttributes/);
 assert.match(p,/ویژگی‌های انبار/);
 assert.match(p,/!\(\["parking", "storage", "warehouse", "land", "shop", "garden", "residential", "villa"\]\.includes\(category\) && !isWanted/);
});
test('server validates and sanitizes storage attributes on offer only',()=>{
 const b=read('backend/src/controllers/spaces.controller.js');
 assert.match(b,/cleanStorageSpaceAttributes\(body\.spaceAttributes/);
 assert.match(b,/space\.listingType === "offer" && space\.category === "storage"/);
});
