import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { getKnownCityCenter, normalizeMapCityName } from '../src/utils/mapCityView.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file=(name)=>readFileSync(resolve(root,name),'utf8');

test('city viewport never fabricates listing coordinates',()=>{
  const cities=[{cityName:'تهران',lat:35.69,lng:51.42},{cityName:'نامعتبر',lat:0,lng:0}];
  assert.deepEqual(getKnownCityCenter('تهران', cities),[51.42,35.69]);
  assert.equal(getKnownCityCenter('نامعتبر',cities),null);
  assert.equal(getKnownCityCenter('ناشناخته',cities),null);
  assert.equal(normalizeMapCityName('كاشان'),'کاشان');
});
test('city flight updates only the map viewport; it never saves a listing pin',()=>{
  const picker=file('src/components/NeshanLocationPicker.jsx');
  const afterSavedCoordinates=picker.indexOf('const savedLng = value?.lng;');
  const start=picker.indexOf('useEffect(() => {',afterSavedCoordinates);
  const end=picker.indexOf('}, [city, status, savedLat, savedLng]);',start);
  assert.ok(afterSavedCoordinates>0 && start>afterSavedCoordinates && end>start, 'city-only map effect must be present');
  const cityEffect=picker.slice(start,end);
  assert.match(cityEffect,/getKnownCityCenter\(name, iranCitiesWithCoordinates\)/);
  assert.match(cityEffect,/if \(hasSavedPoint\) return undefined;/);
  assert.match(cityEffect,/flyToCity\(map, cityCenter, 12\)/);
  assert.doesNotMatch(cityEffect,/onChangeRef\.current|onChange\?\.|drawPoint\(|__fazajooDrawPoint|new maplibregl\.Marker/);
  assert.match(picker,/!hasSelectedLocation &&/);
});
test('final offer page hides description while supplementary box retains note',()=>{
  const add=file('src/pages/AddParking.jsx');
  const edit=file('src/pages/EditParking.jsx');
  assert.match(add,/!\(\["parking", "storage", "warehouse", "land", "shop", "garden"\]\.includes\(form\.category\) && !isWantedAd\) && !\(isWantedAd/);
  assert.match(edit,/!\(\["parking", "storage", "warehouse", "land", "shop", "garden"\]\.includes\(parking\?\.category\) && !isWanted\) && !\(isWanted/);
  assert.match(add,/<ParkingOfferFields[^>]*note=\{form\.description\}/);
  assert.match(edit,/<ParkingOfferFields[^>]*note=\{form\.description\}/);
  const comp=file('src/components/ParkingOfferFields.jsx');
  assert.match(comp,/expanded &&/);
  assert.match(comp,/نکات خاص پارکینگ \(اختیاری\)/);
  assert.match(comp,/onNoteChange\?\.\(e\.target\.value\)/);
});
test('backend validates a blank or very short parking offer note correctly',()=>{
  const code=file('backend/src/controllers/spaces.controller.js');
  const section=code.match(/function validate\(space\) \{[\s\S]*?\n\}\n\nasync function list\(/);
  assert.ok(section);
  const validate=new Function('MAX_IMAGES', `${section[0].replace(/\nasync function list\($/, '')}\nreturn validate;`)(8);
  const base={listingType:'offer',category:'parking',spaceAttributes:{schemaVersion:1,values:{vehicleUsage:'car',cover:'covered',access:'anytime',usageNotes:''}},area:15,title:'آگهی پارکینگ',city:'اصفهان',priceType:'monthly',price:100000,phone:'09120000000',description:'',imageUrls:['img'],video:null};
  assert.equal(validate(base),'');
  assert.equal(validate({...base,description:'کوتاه'}),'');
  // Storage offers also have a typed, optional note; legacy storage offers remain editable.
  assert.equal(validate({...base,category:'storage',spaceAttributes:{}}),'');
  assert.equal(validate({...base,category:'warehouse',spaceAttributes:{}}),'');
});
test('public details no-pin state hides map and empty description',()=>{
  const d=file('src/pages/ParkingDetails.jsx');
  assert.match(d,/parking\.location\?\.lat != null &&\s*parking\.location\?\.lng != null && \(/);
  assert.match(d,/نقطه‌ای روی نقشه ثبت نشده است/);
  assert.match(d,/!\(\["parking", "storage", "warehouse", "land", "shop", "garden"\]\.includes\(category\) && !isWanted && !String\(parking\.description \|\| ""\)\.trim\(\)\)/);
});
