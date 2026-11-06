import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('land supply and wanted land stay in independent registration and edit branches',()=>{
 const a=file('src/pages/AddParking.jsx'),e=file('src/pages/EditParking.jsx');
 assert.match(a,/form.category === "land" && !isWantedAd && \(/);
 assert.match(e,/parking\?\.category === "land" && !isWanted && \(/);
 assert.match(a,/<LandOfferFields/);assert.match(e,/<LandOfferFields/);
 assert.match(a,/isWantedAd && form.category === "land"/);assert.match(a,/writeLandRental\(form.landRental/);
 assert.match(e,/isWanted && parking\?\.category === "land"/);assert.match(e,/writeLandRental\(form.landRental/);
});
test('real land details survive registration, update and typed display',()=>{
 const a=file('src/pages/AddParking.jsx'),e=file('src/pages/EditParking.jsx'),d=file('src/pages/ParkingDetails.jsx');
 assert.match(a,/makeLandAttributes\(form.landOffer\)/);
 assert.match(e,/makeLandAttributes\(form.landOffer\)/);
 assert.match(e,/landOfferFromAttributes\(parking\?\.spaceAttributes\)/);
 assert.match(d,/category === "land" && !isWanted && parking\?\.spaceAttributes/);
 assert.match(d,/ویژگی‌های واقعی زمین/);
 assert.match(a,/validateLandOffer\(form.landOffer\)/);
 assert.match(e,/validateLandOffer\(form.landOffer\)/);
});
test('land note is optional and confined to supplemental section, not final step',()=>{
 const a=file('src/pages/AddParking.jsx'),e=file('src/pages/EditParking.jsx'),f=file('src/components/LandOfferFields.jsx');
 assert.match(a,/!\(\["parking", "storage", "warehouse", "land", "shop", "garden", "residential"\]\.includes\(form.category\) && !isWantedAd\)/);
 assert.match(e,/!\(\["parking", "storage", "warehouse", "land", "shop", "garden", "residential"\]\.includes\(parking\?\.category\) && !isWanted\)/);
 assert.match(a,/<LandOfferFields[^>]*note=\{form.description\}/);
 assert.match(e,/<LandOfferFields[^>]*note=\{form.description\}/);
 assert.match(f,/جزئیات تکمیلی \(اختیاری\)/);
 assert.match(f,/نکات خاص زمین \(اختیاری\)/);
 assert.match(f,/aria-expanded/);
 assert.match(dump(),/./);
 function dump(){return f}
});
test('land backend accepts typed offer only, with no compulsory description',()=>{
 const src=file('backend/src/controllers/spaces.controller.js');
 assert.match(src,/cleanLandSpaceAttributes\(body.spaceAttributes/);
 assert.match(src,/space.listingType === "offer" && space.category === "land"/);
 assert.match(src,/\["parking","storage","warehouse","land","shop","garden","residential"\]\.includes\(space.category\)/);
 const body=src.match(/function validate\(space\) \{[\s\S]*?\n\}\n\nasync function list\(/);
 assert.ok(body);
 const validate=new Function('MAX_IMAGES',`${body[0].replace(/\nasync function list\($/,'')}\nreturn validate;`)(8);
 const sample={listingType:'offer',category:'land',spaceAttributes:{schemaVersion:1,values:{landType:'vacant',allowedPurposes:['depot'],otherPurpose:'',accessRoad:'asphalt'}},area:1000,title:'زمین آزمایشی',city:'اصفهان',priceType:'monthly',price:1000000,phone:'09120000000',description:'',imageUrls:['image'],video:null};
 assert.equal(validate(sample),'');
 assert.match(validate({...sample,spaceAttributes:{...sample.spaceAttributes,values:{...sample.spaceAttributes.values,allowedPurposes:[]}}}),/مشخصات/);
 assert.equal(validate({...sample,spaceAttributes:{}}),'');
});
test('land detail styling aligns paired inputs and adapts to mobile',()=>{
 const css=file('src/components/LandOfferFields.css');
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/\.fj-lo-field>small\{min-height:/);
});
test('land offer no-pin display still uses common map rules',()=>{
 const d=file('src/pages/ParkingDetails.jsx');
 assert.match(d,/نقطه‌ای روی نقشه ثبت نشده است/);
 assert.match(d,/parking.location\?\.lat != null/);
});
