import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = rel => readFileSync(new URL('../'+rel, import.meta.url),'utf8').replace(/\r\n/g,'\n').replace(/^\uFEFF/,'');
const source=read('src/pages/AddParking.jsx');
const css=read('src/pages/AddParkingPremiumAL01.css');
const hash=s=>createHash('sha256').update(s).digest('hex');
function block(a,b){const start=source.indexOf(a);assert.ok(start>=0,a);const end=source.indexOf(b,start);assert.ok(end>start,b);return source.slice(start,end);}
const protectedBlocks=[
 ['initial form state','const INITIAL_FORM =','const STEPS =','cd22c72b9613dca8e31d20c7a67b653e7d6a051fd4c69ffb96c016f49575c252'],
 ['submission, validation, handlers and step flow','function formatPriceInput','  const al01Steps','e55347a62b883d7b620bf33ab5e788d785d620ab3569464dd2f4b078352d931c'],
 ['map props and point update','<NeshanLocationPicker','</section>','31be337a5ca5dd08f41fa0a93417cb0c8e307f72587a5573f21da62ab3612efc'],
 ['all 18 specialist form branches','{form.category === "parking" && !isWantedAd && (\n                      <ParkingOfferFields','{currentStep === 2 && (','b08b9203cc01c48e5ba5493a2a7107840d8337103ce36742b503601c13895140'],
 ['image upload wiring','<ImageUploader','/>','0f4b6b2f4c9f16b2e3ed31ef0994312cdce944fa513d880042dad69bfe35c7c2'],
 ['video upload wiring','<VideoUploader','/>','d972e39a3aef2824ef72be06071d8dcd17bd36e92219dcb7677645ef0c162814'],
 ['financial preview expression','{/* F505_LAND_PREVIEW_COMPACT_SAFE_20261114','</strong>','8f51fabad5ef4d68d57496ed90917d755c6f47045ebc65505f602ec8029a9e0a'],
 ['contact input','<input\n                            id="phone"','/>','f3d4e931bcc8e898075fecd4b3c9d67df2940dd65d53b05227edb4e18438b66f'],
];
for(const [name,a,b,expected] of protectedBlocks)test(`AL01 preserves ${name}`,()=>assert.equal(hash(block(a,b)),expected));
test('AL01 uses the real two or three stage flow, not independent counters',()=>{assert.match(source,/const al01Steps = isWantedAd \? \[STEPS\[0\], STEPS\[2\]\] : STEPS/);assert.match(source,/aria-current=\{index \+ 1 === displayedStep \? "step"/);});
test('AL01 gives selectable categories and listing modes accessible state',()=>{assert.match(source,/aria-pressed=\{isSelected\}/);for(const mode of ['offer','wanted'])assert.ok(source.includes(`aria-pressed={form.listingType === "${mode}"}`));});
test('AL01 keeps a single city and map, adjacent before specialty fields',()=>{assert.equal((source.match(/<IranCityAutocomplete/g)||[]).length,1);assert.equal((source.match(/<NeshanLocationPicker/g)||[]).length,1);assert.ok(source.indexOf('<IranCityAutocomplete')<source.indexOf('<NeshanLocationPicker'));assert.ok(source.indexOf('<NeshanLocationPicker')<source.indexOf('<ParkingOfferFields'));});
test('AL01 demand art uses existing category-specific assets and a distinct fallback',()=>{assert.match(source,/resolveOtherDemandArt\(form, form.otherRequest\)/);assert.match(source,/GENERAL_ART\[form.category\]/);assert.match(source,/al01DemandArt \? \(/);assert.match(source,/\) : form.imageUrl \? \(/);assert.ok(source.includes('پیش‌نویس'));});
test('AL01 stylesheet is scoped to the add page and retains responsive widths',()=>{assert.match(source,/import "\.\/AddParkingPremiumAL01.css"/);assert.match(source,/className="add-parking-page add-parking-al01"/);assert.doesNotMatch(css,/\.edit-parking-page|@import/);assert.match(css,/@media\(max-width:700px\)/);assert.match(css,/@media\(min-width:1000px\)/);});
test('AL01 final preview has a meaningful image area rather than the old thumbnail',()=>{assert.match(css,/height:clamp\(140px,18vw,220px\) !important/);assert.match(css,/\.al01-demand-art \{ object-fit:contain/);});
