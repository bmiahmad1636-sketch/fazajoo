import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getKnownCityCenter } from '../src/utils/mapCityView.js';
import cityCoordinates from '../src/data/iran-cities-with-coordinates.json' with { type: 'json' };

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const add = read('src/pages/AddParking.jsx');
const edit = read('src/pages/EditParking.jsx');
const details = read('src/pages/ParkingDetails.jsx');
const journeyCss = read('src/pages/ListingFormJourneyDS07.css');
const mapPicker = read('src/components/NeshanLocationPicker.jsx');
const cityPicker = read('src/components/IranCityAutocomplete.jsx');
const options = ['parking','storage','warehouse','shop','land','residential','villa','garden','other'];
const offerWidgets = ['ParkingOfferFields','StorageOfferFields','IndustrialOfferFields',
  'LandOfferFields','ResidentialFields','VillaOfferFields','ShopOfferFields','GardenOfferFields','OtherOfferFields'];
const requestWidgets = ['ParkingRequestDetailsFields','WarehouseRequestFields','ShedRequestFields',
  'LandRentalFields','ResidentialRequestFields','VillaRequestFields','GardenRequestFields',
  'ShopRequestFields','OtherRequestFields'];

test('all nine categories retain their offer and request controls', () => {
  for (const c of options) assert.match(add, new RegExp('value: "' + c + '"'), c);
  for (const w of [...offerWidgets, ...requestWidgets]) assert.ok(add.includes('<'+w), w);
});

test('register: city and map precede all specialized offer and request panels', () => {
  const city = add.indexOf('<IranCityAutocomplete');
  const map = add.indexOf('<NeshanLocationPicker');
  const firstOffer = add.indexOf('<ParkingOfferFields');
  const firstWanted = add.indexOf('<ParkingRequestDetailsFields');
  assert.ok(city > 0 && map > city && firstOffer > map && firstWanted > map);
  assert.equal((add.match(/<NeshanLocationPicker/g) || []).length, 1);
  assert.match(add, /cityFlightDelay=\{850\}/);
  assert.match(add, /ref=\{mapJourneyRef\}/);
});

test('edit: base info, saved point, specialty widgets and save stay connected', () => {
  const base = edit.indexOf('{isWanted ? "مشخصات اصلی درخواست" : "مشخصات اصلی آگهی"}');
  const map = edit.indexOf('<NeshanLocationPicker');
  const industrial = edit.indexOf('<IndustrialOfferFields');
  assert.ok(base >= 0 && map > base && industrial > map);
  assert.equal((edit.match(/<NeshanLocationPicker/g) || []).length, 1);
  assert.match(edit, /onSubmit=\{saveEdit\}/);
  assert.match(edit, /onClick=\{resetChanges\}/);
  assert.match(edit, /className="edit-parking-preview"/);
});

test('city choice reveals map only for explicit selection or Enter of complete city', () => {
  assert.match(cityPicker, /onSelect\?\.\(name\)/);
  assert.match(cityPicker, /CITY_NAMES\.includes\(query\)/);
  assert.match(add, /onSelect=\{revealSelectedCity\}/);
  assert.match(add, /scrollIntoView\(\{ behavior: reduced \? "instant" : "smooth", block: "start" \}\)/);
});

test('city animation is a viewport hint; a chosen city does not save a location', () => {
  const cityEffect = mapPicker.slice(mapPicker.indexOf('const savedLng = value?.lng;'), mapPicker.indexOf('}, [city, status, savedLat, savedLng, cityFlightDelay]);'));
  assert.match(cityEffect, /if \(hasSavedPoint\) return undefined/);
  assert.match(cityEffect, /flyToCity\(map, cityCenter, 12\)/);
  assert.doesNotMatch(cityEffect, /onChangeRef\.current|new maplibregl\.Marker|drawPoint\(/);
  assert.match(mapPicker, /map\.on\("click"/);
  assert.match(mapPicker, /onChangeRef\.current\?\.\(\{/);
});

test('city coordinates only from real data; absent city never gets fabricated center', () => {
  for (const known of ['تهران','اصفهان','شیراز']) {
    const center = getKnownCityCenter(known, cityCoordinates);
    assert.ok(center && center.length === 2 && center.every(Number.isFinite), known);
  }
  assert.equal(getKnownCityCenter('شهر ساختگی آزمایشی', cityCoordinates), null);
});

test('listing detail preserves main price and removes duplicate secondary price block', () => {
  assert.match(details, /parking-details-hero__price/);
  assert.match(details, /industrialPriceItems\.length/);
  assert.doesNotMatch(details, /parking-details-feature--shop-money/);
  assert.match(details, /<ShopMoneyRows items=\{industrialPriceItems\}/);
});

test('photo gallery uses compact wrap without touching upload and main photo actions', () => {
  assert.match(journeyCss, /\.multi-image-uploader__grid\s*\{/);
  assert.match(journeyCss, /display:\s*flex;\s*flex-wrap:\s*wrap;/);
  const uploader=read('src/components/ImageUploader.jsx');
  assert.match(uploader, /onUploadComplete/);
  assert.match(uploader, /onMainImageChange/);
  assert.match(uploader, /removeImage\(url\)/);
});

test('desktop sticky preview can work without creating an overflow scrolling ancestor', () => {
  assert.match(journeyCss, /\.edit-parking-page\s*\{\s*overflow:\s*clip;/);
  assert.match(journeyCss, /@media \(min-width: 1051px\)/);
  assert.match(journeyCss, /position:\s*sticky/);
  assert.match(journeyCss, /@media \(max-width: 1050px\)/);
  assert.match(journeyCss, /position:\s*static/);
});

test('DS07 style overrides only targeted listing forms', () => {
  assert.doesNotMatch(journeyCss, /(^|\n)\s*(html|body|:root|\.container|\.parking-card)\s*\{/);
  assert.doesNotMatch(journeyCss, /@import|url\(/);
  assert.match(journeyCss, /prefers-reduced-motion/);
});

test('all financial entry points and detailed field validators remain present', () => {
  for (const field of ['parkingOffer','storageOffer','industrialOffer','landOffer','villaOffer','gardenOffer','shopOffer','residentialOffer','otherOffer','parkingRequestDetails','shedRequest','warehouseRequest']) {
    assert.ok(add.includes(field), field + ' add');
    assert.ok(edit.includes(field), field + ' edit');
  }
  assert.match(add, /createSpace/);
  assert.match(edit, /saveEdit/);
  assert.match(details, /ShopMoneyRows/);
});
