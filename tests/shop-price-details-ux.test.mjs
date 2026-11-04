import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shopFinancialRows, shopFinancialHeadline } from '../src/utils/shopOffer.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const attrs=(transferType,values={})=>({schemaVersion:1,category:'shop',values:{transferType,...values}});

test('deposit and monthly rent render as separate real amounts',()=>{
 const data=attrs('rent',{depositRial:10000000000,monthlyRentRial:10000000});
 assert.deepEqual(shopFinancialRows(data),[
  {label:'ودیعه',amount:'۱۰٬۰۰۰٬۰۰۰٬۰۰۰ ریال'},
  {label:'اجاره ماهانه',amount:'۱۰٬۰۰۰٬۰۰۰ ریال'}
 ]);
 assert.match(shopFinancialHeadline(data),/ودیعه/);
});
test('missing deposit never becomes a fabricated amount',()=>{
 assert.deepEqual(shopFinancialRows(attrs('rent',{monthlyRentRial:10000000})),[
  {label:'اجاره ماهانه',amount:'۱۰٬۰۰۰٬۰۰۰ ریال'}
 ]);
 assert.deepEqual(shopFinancialRows(null),[]);
});
test('full deposit and business rights remain exclusive, never shown as monthly rent',()=>{
 assert.deepEqual(shopFinancialRows(attrs('full_deposit',{depositRial:500000000,monthlyRentRial:25000000})),[
  {label:'رهن کامل',amount:'۵۰۰٬۰۰۰٬۰۰۰ ریال'}
 ]);
 assert.deepEqual(shopFinancialRows(attrs('key_money',{keyMoneyRial:300000000})),[
  {label:'مبلغ واگذاری حق',amount:'۳۰۰٬۰۰۰٬۰۰۰ ریال'}
 ]);
});
test('hero and compact main info both use separated finance rows without changing other categories',()=>{
 const jsx=read('../src/pages/ParkingDetails.jsx');
 assert.match(jsx,/shopPriceRows = !isWanted && category === "shop"/);
 assert.match(jsx,/<ShopMoneyRows items=\{shopPriceRows\} \/>/);
 assert.match(jsx,/<ShopMoneyRows items=\{shopPriceRows\} compact \/>/);
 assert.match(jsx,/otherBudgetText \|\| gardenBudgetText/);
 const css=read('../src/pages/ParkingDetails.css');
 assert.match(css,/parking-details-hero__price--shop/);
 assert.match(css,/parking-details-feature--shop-money/);
 assert.match(css,/overflow-wrap: anywhere/);
});
