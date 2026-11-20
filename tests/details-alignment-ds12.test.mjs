import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = f => readFileSync(new URL(`../${f}`,import.meta.url),'utf8');
const jsx=read('src/pages/ParkingDetails.jsx');
const css=read('src/pages/ParkingDetailsAlignmentDS12.css');
test('DS12 loads after DS11 and reuses one price element',()=>{
  assert.ok(jsx.indexOf('import "./ParkingDetailsAlignmentDS12.css";')>jsx.indexOf('import "./ParkingDetailsEditorialDS11.css";'));
  assert.equal((jsx.match(/const ds12PriceCard =/g)||[]).length,1);
  assert.equal((jsx.match(/\{ds12PriceCard\}/g)||[]).length,2);
  assert.ok(jsx.indexOf('parking-details-price-placement--hero')<jsx.indexOf('parking-details-content'));
  assert.ok(jsx.indexOf('parking-details-price-placement--sidebar')>jsx.indexOf('<aside className="parking-details-sidebar">'));
});
test('DS12 preserves all finance variants and protected actions',()=>{
  for (const s of ['parkingPriceItems','storagePriceItems','industrialPriceItems','landPriceItems','shopPriceRows','gardenPriceRows','gardenWantedPriceRows','residentialPriceRows','villaWantedPriceRows','villaPriceRows','otherPriceRows','otherWantedPriceRows','formatRialPrice','handleFavorite','handleShare','handlePhoneToggle','handleDelete','handleEdit','TrustSafetyActions','NeshanApproximateMap']) assert.ok(jsx.includes(s),s);
});
test('DS12 desktop alignment and mobile-visible price',()=>{
 for(const s of ['min-width:1001px','max-width:1000px','max-width:760px','parking-details-price-placement--hero { display:none','parking-details-price-placement--sidebar { display:none','margin-top:0 !important','flex:0 0 100%']) assert.ok(css.includes(s),s);
 assert.doesNotMatch(css,/text-overflow:\s*ellipsis|line-clamp|visibility:\s*hidden/);
});
