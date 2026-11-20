import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validateVillaOffer } from '../src/utils/villaOffer.js';
import { EMPTY_VILLA_REQUEST, validateVillaRequest, villaRequestAreaText, writeVillaRequest, readVillaRequest } from '../src/utils/villaRequest.js';
import { validateVillaOfferAreaDS11, VILLA_AREA_REQUIRED_DS11 } from '../src/utils/villaAreaDS11.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (file) => readFileSync(resolve(root, file),'utf8');
const add = source('src/pages/AddParking.jsx');
const offer = source('src/components/VillaOfferFields.jsx');
const wanted = source('src/components/VillaRequestFields.jsx');
const css = source('src/components/VillaAreaDS11.css');

const supply = {
  accommodationType:'villa', privacy:'private', rentalTerm:'short', availableStays:['daily'],
  depositRial:''
};
const details = {capacity:4,bedrooms:2,pool:false,heatedPool:false};
const demand = {...EMPTY_VILLA_REQUEST, accommodationType:'villa', guests:'4', rentalTerm:'short',
  stayType:'daily', pricePeriod:'daily', maxBudget:'15000000'};

test('DS11: missing, invalid and non-positive supply area fails at first step', () => {
  for(const value of ['',null,undefined,'0','-8','Infinity','abc']) {
    assert.equal(validateVillaOfferAreaDS11(value),VILLA_AREA_REQUIRED_DS11);
  }
  for(const value of ['250','250.5',250]) {
    assert.equal(validateVillaOfferAreaDS11(value),'');
  }
});
test('DS11: area requirement matches existing villa offer validator', () => {
  assert.equal(validateVillaOffer(supply,details,0),VILLA_AREA_REQUIRED_DS11);
  assert.equal(validateVillaOffer(supply,details,250),'');
});
test('DS11: no hidden generic area field for either villa path', () => {
  assert.match(add,/\|\| form\.category === "villa" \|\|/);
  assert.match(add,/validateVillaOfferAreaDS11\(form\.area\)/);
  assert.match(add,/if \(villaAreaError\) newErrors\.area = villaAreaError/);
  assert.match(add,/err !== VILLA_AREA_REQUIRED_DS11/);
  assert.match(add,/form\.category !== "villa" &&\s*form\.area &&/);
});
test('DS11: villa supply area input is visible in the specialized form',()=>{
  assert.match(add,/area=\{form\.area\} areaError=\{errors\.area\}/);
  assert.match(add,/onAreaChange=\{\(area\) =>/);
  assert.match(offer,/typeof onAreaChange === "function" &&/);
  assert.match(offer,/htmlFor="fj-villa-offer-area-input"/);
  assert.match(offer,/id="fj-villa-offer-area-input" name="area"/);
  assert.match(offer,/required value=\{area \?\? ""\}/);
});
test('DS11: supply error is immediately under the visible input with aria link',()=>{
  assert.match(offer,/aria-invalid=\{Boolean\(areaError\)\}/);
  assert.match(offer,/aria-describedby=\{areaError \? "fj-villa-offer-area-error" : undefined\}/);
  assert.match(offer,/id="fj-villa-offer-area-error" className="fj-villa-area-ds11__error" role="alert"/);
  assert.match(offer,/getElementById\("fj-villa-offer-area"\)\?\.scrollIntoView/);
});
test('DS11: request villa area is optional and not silently required', () => {
  assert.equal(validateVillaRequest({...demand,minArea:'',maxArea:''}),'');
  assert.equal(villaRequestAreaText({...demand,minArea:'',maxArea:''}),'');
  assert.equal(validateVillaRequest({...demand,minArea:'200',maxArea:''}),'');
  assert.equal(validateVillaRequest({...demand,minArea:'',maxArea:'400'}),'');
});
test('DS11: invalid request area range produces a localized error',()=>{
  assert.match(validateVillaRequest({...demand,minArea:'500',maxArea:'200'}),/متراژ/);
  assert.match(validateVillaRequest({...demand,minArea:'1000001',maxArea:''}),/متراژ/);
  assert.match(wanted,/error\.includes\("متراژ"\)/);
  assert.match(wanted,/id="fj-villa-request-area-error" className="residential-request__error" role="alert"/);
  assert.match(wanted,/!contractError && !areaError/);
});
test('DS11: wanted min and max inputs are outside optional accordion, once each',()=>{
  const areaStart=wanted.indexOf('id="fj-villa-request-area"');
  const foldStart=wanted.indexOf('<details className="residential-request__fold">');
  assert.ok(areaStart>0 && areaStart<foldStart);
  assert.equal((wanted.match(/id="fj-villa-request-min-area"/g)||[]).length,1);
  assert.equal((wanted.match(/id="fj-villa-request-max-area"/g)||[]).length,1);
  assert.match(wanted,/محدوده متراژ دلخواه <span>اختیاری<\/span>/);
});
test('DS11: demand area storage contract preserved',()=>{
  const written=writeVillaRequest({...demand,minArea:'200',maxArea:'500'});
  const parsed=readVillaRequest(written).data;
  assert.equal(parsed.minArea,'200');
  assert.equal(parsed.maxArea,'500');
  assert.equal(validateVillaRequest(parsed),'');
});
test('DS11: unrelated rental pricing, gallery, and API persistence logic unchanged',()=>{
  assert.match(add,/shouldAskVillaShortRateAtFirstStep/);
  assert.match(add,/villaListingPrice\(form\.villaOffer,form\.price,form\.priceType\)/);
  assert.match(add,/villaRequestAreaText\(form\.villaRequest\)/);
  assert.match(add,/makeVillaAttributes\(form\.villaOffer,form\.villaDetails\)/);
  assert.match(add,/imageUrls: isWantedAd/);
});
test('DS11: styles are scoped to villa classes and mobile',()=>{
  assert.match(css,/\.fj-villa-area-ds11/);
  assert.match(css,/\.fj-villa-request-area-ds11/);
  assert.match(css,/@media \(max-width: 540px\)/);
  assert.doesNotMatch(css,/(^|\n)\s*(body|input|html|main)\s*\{/);
});
