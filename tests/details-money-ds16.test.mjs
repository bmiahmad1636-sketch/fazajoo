import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {residentialDemandCardRows} from '../src/utils/unifiedCardModel.js';
import {writeResidentialRequest,readResidentialRequest,residentialRequestBudgetText} from '../src/utils/residentialRequest.js';
import {formatRialPrice} from '../src/utils/priceFormatter.js';
const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');
const jsx=read('src/pages/ParkingDetails.jsx');
const css=read('src/pages/ParkingDetailsMoneyDS16.css');
const base={rentalTerm:'long',paymentType:'both',deposit:'1000000000',monthlyRent:'30000000'};
const rial=n=>`${n.toLocaleString('fa-IR')} ریال`;
for(const [type,labels,amounts] of [
 ['both',['حداکثر ودیعه','سقف اجاره ماهانه'],[1000000000,30000000]],
 ['deposit',['حداکثر ودیعه'],[1000000000]],
 ['rent',['سقف اجاره ماهانه'],[30000000]],
])test(`residential demand ${type}: preserve active financial limits`,()=>{
 const d=readResidentialRequest(writeResidentialRequest({...base,paymentType:type})).data;
 assert.deepEqual(residentialDemandCardRows(d),labels.map((label,i)=>({label,amount:rial(amounts[i])})));
});
for(const unit of ['night','week','month'])test(`residential short ${unit}: no stale long amounts`,()=>{
 const d={...base,rentalTerm:'short',shortRateUnit:unit,shortMaxBudgetRial:'۱۲٬۳۴۵٬۶۷۸'};
 const result=residentialDemandCardRows(d);assert.equal(result.length,1);assert.equal(result[0].amount,rial(12345678));
 assert.match(result[0].label, /سقف هزینه/);
});
test('residential rows preserve actual saved budget and Persian/Arabic/Latin input',()=>{
 for(const v of ['1000000000','۱٬۰۰۰٬۰۰۰٬۰۰۰','١٬٠٠٠٬٠٠٠٬٠٠٠']){
 const d={...base,deposit:v};assert.equal(residentialDemandCardRows(d)[0].amount,rial(1000000000));
 assert.match(residentialRequestBudgetText(d),/۱٬۰۰۰٬۰۰۰٬۰۰۰/);
 }
});
test('empty or invalid term keeps fallback, no synthetic price',()=>{
 assert.deepEqual(residentialDemandCardRows({}),[]);
 assert.deepEqual(residentialDemandCardRows({rentalTerm:'short',shortRateUnit:'invalid',shortMaxBudgetRial:100}),[]);
 assert.equal(formatRialPrice('',{priceType:'negotiable'}),'توافقی');
});
test('all shared price branches remain; residential demand uses independent rows before fallback',()=>{
 const block=jsx.slice(jsx.indexOf('const ds12PriceCard ='),jsx.indexOf('\n  return (\n    <main className="parking-details-page">',jsx.indexOf('const ds12PriceCard =')));
 for(const k of ['parkingPriceItems','storagePriceItems','industrialPriceItems','landPriceItems','shopPriceRows','gardenPriceRows','gardenWantedPriceRows','residentialPriceRows','residentialWantedPriceRows','villaWantedPriceRows','villaPriceRows','otherPriceRows','otherWantedPriceRows'])assert.ok(block.includes(`items={${k}}`),k);
 assert.match(block,/items=\{residentialWantedPriceRows\} stacked/);
 assert.ok(block.includes('residentialBudgetText || formatRialPrice'));
 assert.equal((jsx.match(/\{ds12PriceCard\}/g)||[]).length,2);
});
test('typography fix loaded after DS15 and scoped to shared detail price only',()=>{
 assert.ok(jsx.indexOf('import "./ParkingDetailsMoneyDS16.css";')>jsx.indexOf('import "./ParkingDetailsTitleCityDS15.css";'));
 assert.match(css,/\.parking-details-page \.parking-details-hero__price > strong,/);
 assert.match(css,/\.parking-details-page \.parking-details-hero__price \.parking-details-shop-money__amount/);
 assert.match(css,/font-variant-numeric:\s*normal/);
 assert.doesNotMatch(css,/overflow:\s*hidden|text-overflow|line-clamp|display:\s*none/);
});
