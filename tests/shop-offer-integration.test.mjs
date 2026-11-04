import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const add=read('../src/pages/AddParking.jsx'), edit=read('../src/pages/EditParking.jsx'), details=read('../src/pages/ParkingDetails.jsx'),card=read('../src/components/ParkingCard.jsx'),controller=read('../backend/src/controllers/spaces.controller.js'),form=read('../src/components/ShopOfferFields.jsx');
test('shop offer has dedicated form in registration and edit, while wanted stays separate',()=>{
 for(const f of [add,edit]){assert.match(f,/ShopOfferFields/);assert.match(f,/shopOffer/);assert.match(f,/ShopRequestFields/);assert.match(f,/makeShopAttributes/);}
});
test('old shop utilities survive as optional shop subform',()=>{
 assert.match(form,/ShopFields/);assert.match(form,/onDetailsChange/);
 assert.match(controller,/shopDetails: body.category === "shop"/);
});
test('new shop avoids compulsory empty final description',()=>{
 assert.match(add,/"land", "shop"\]\.includes\(form\.category\) && !isWantedAd/);
 assert.match(edit,/"land", "shop"\]\.includes\(parking\?\.category\) && !isWanted/);
 assert.match(details,/"land", "shop"\]\.includes\(category\) && !isWanted/);
});
test('seller prices are derived from real finance, and generic public prices are not rights or deposit',()=>{
 assert.match(add,/shopListingPrice\(form\.shopOffer\)/);
 assert.match(edit,/shopListingPrice\(form\.shopOffer\)/);
 assert.match(card,/shopFinancialHeadline/);
 assert.match(details,/shopFinancialHeadline/);
});
test('backend sanitizes typed shop values and rejects incomplete typed offers',()=>{
 assert.match(controller,/cleanShopSpaceAttributes/);
 assert.match(controller,/space.category === "shop" && space.spaceAttributes\?\.schemaVersion === 1/);
});
test('typed shop offer visible in details while old amenities persist',()=>{
 assert.match(details,/ویژگی‌های واقعی فضای تجاری/);
 assert.match(details,/امکانات مغازه/);
 assert.match(details,/سرقفلی/);
});
test('shop form never calls active match engines or writes wanted metadata',()=>{
 assert.doesNotMatch(form,/createNotification|smartSearch|writeShopRequest/);
 assert.match(form,/مجوز صنفی/);
});
test('server derives a single canonical monthly generic price from typed rent, never rights',()=>{
 assert.match(controller,/typedShop\?\.schemaVersion === 1 \? \(shopRent \? String\(shopRent\) : ""\)/);
 assert.match(controller,/shopRent \? "monthly" : "negotiable"/);
});
test('empty legacy shop amenities do not cause an empty detail panel',()=>{
 assert.match(details,/hasShopAmenities &&/);
});
test('shop money input groups digits live; homepage keeps financial headline from structured attributes',()=>{
 assert.match(form,/value=\{formatShopMoneyInput\(value\[key\]\)\}/);
 assert.match(form,/shopMoneyInputDigits\(input\.value\)/);
 assert.match(form,/change\(key,digits\)/);
 assert.match(card,/shopFinancialHeadline\(parking\?\.spaceAttributes\)/);
 assert.match(details,/shopFinancialHeadline\(parking\?\.spaceAttributes\)/);
});
