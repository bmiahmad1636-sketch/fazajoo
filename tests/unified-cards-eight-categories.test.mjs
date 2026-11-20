import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {getUnifiedCardModel,GENERAL_CATEGORIES,GENERAL_ART,residentialDemandCardRows} from '../src/utils/unifiedCardModel.js';

const req=(category,term='long')=>({id:'t-1',title:'فضای نمونه',city:'شیراز',category,listingType:'wanted',status:'active',price:'',spaceAttributes:null});
const offer=category=>({...req(category),listingType:'offer',city:'اصفهان'});

test('exactly eight distinct non-industrial categories are supported',()=>{
 assert.equal(GENERAL_CATEGORIES.length,8);
 assert.ok(!GENERAL_CATEGORIES.includes('warehouse'));
 assert.equal(new Set(Object.values(GENERAL_ART)).size,8);
 for(const category of GENERAL_CATEGORIES){
  assert.equal(typeof GENERAL_ART[category],'string');
  const name=GENERAL_ART[category].split('/').at(-1);
  const artwork=path.join('public','images',name);
  assert.equal(fs.existsSync(artwork),true,`Missing demand illustration for ${category}`);
  const svg=fs.readFileSync(artwork,'utf8');
  assert.ok(svg.includes('<svg')&&svg.includes('</svg>'));
  assert.ok(!svg.includes('به دنبال اجاره'));
 }
});

test('all eight demand cards use one actual selected term, never both',()=>{
 for(const category of GENERAL_CATEGORIES){
  const m=getUnifiedCardModel(req(category),{
    request:{rentalTerm:'long',transferType:'rent'},termDeclared:true,categoryLabel:'فضای موردنظر',
    moneyRows:[{label:'سقف اجاره / ماه',amount:'۲۰۰٬۰۰۰ ریال'}],areaText:'۱۰۰ تا ۱۵۰ مترمربع'
  });
  assert.equal(m.badges.length,1,category);
  assert.match(m.badges[0].label,/بلندمدت/);
  assert.equal(m.badges[0].ticks,'');
  assert.equal(m.title,'فضای نمونه / شیراز');
  assert.equal(m.moneyRows[0].amount,'۲۰۰٬۰۰۰ ریال');
 }
});

test('a request without an explicitly saved rental term has no invented term badge',()=>{
 for(const category of GENERAL_CATEGORIES){
  const model=getUnifiedCardModel(req(category),{
    request:{rentalTerm:'long'},termDeclared:false,categoryLabel:'نمونه'
  });
  assert.deepEqual(model.badges,[]);
 }
});

test('shop commercial rights are not a rental period',()=>{
 const l=req('shop');
 assert.deepEqual(getUnifiedCardModel(l,{request:{transferType:'key_money',rentalTerm:'long'},termDeclared:true}).badges,[]);
 const o=offer('shop');o.spaceAttributes={values:{transferType:'key_money',rentalTerm:'long'}};
 assert.deepEqual(getUnifiedCardModel(o).badges,[]);
});

test('negotiation ticks reflect owner consent, not an invented second confirmed contract',()=>{
 const l=offer('parking');l.spaceAttributes={values:{rentalTerm:'long',canNegotiateOtherTerm:true}};
 const model=getUnifiedCardModel(l,{moneyRows:[{label:'اجاره / ماه',amount:'۵۰۰٬۰۰۰ ریال'}]});
 assert.equal(model.badges.length,2);
 assert.deepEqual(model.badges.map(x=>x.ticks),['✓✓','✓']);
 l.spaceAttributes.values.canNegotiateOtherTerm=false;
 const without=getUnifiedCardModel(l);
 assert.equal(without.badges.length,1);
 assert.equal(without.badges[0].ticks,'✓✓');
});

test('land crop-share is not mislabeled as monthly rent',()=>{
 const l=offer('land');l.spaceAttributes={values:{transactionKind:'crop_share',rentalTerm:''}};
 const model=getUnifiedCardModel(l,{moneyRows:[{label:'نوع توافق',amount:'مشارکت در محصول'}]});
 assert.deepEqual(model.badges,[]);
 assert.deepEqual(model.moneyRows,[{label:'نوع توافق',amount:'مشارکت در محصول'}]);
});

test('registered area and money are preserved without conversions',()=>{
 const model=getUnifiedCardModel(offer('villa'),{
  areaText:'۱۲۰ تا ۲۰۰ مترمربع', moneyRows:[
   {label:'اجاره شبانه',amount:'۱٬۰۰۰٬۰۰۰ ریال'},
   {label:'ضمانت خسارت',amount:'۲٬۰۰۰٬۰۰۰ ریال'}
  ]
 });
 assert.equal(model.areaText,'۱۲۰ تا ۲۰۰ مترمربع');
 assert.deepEqual(model.moneyRows.map(x=>x.label),['اجاره شبانه','ضمانت خسارت']);
 assert.equal(model.moneyRows[1].amount,'۲٬۰۰۰٬۰۰۰ ریال');
});

test('residential request budget honors its actual payment mode and period',()=>{
 assert.deepEqual(residentialDemandCardRows({rentalTerm:'short',shortRateUnit:'night',shortMaxBudgetRial:'900000'}),
 [{label:'سقف هزینه شبانه',amount:'۹۰۰٬۰۰۰ ریال'}]);
 assert.deepEqual(residentialDemandCardRows({rentalTerm:'long',paymentType:'deposit',deposit:'30000000',monthlyRent:'400000'}),
 [{label:'حداکثر ودیعه',amount:'۳۰٬۰۰۰٬۰۰۰ ریال'}]);
 assert.deepEqual(residentialDemandCardRows({rentalTerm:'long',paymentType:'rent',deposit:'30000000',monthlyRent:'400000'}),
 [{label:'سقف اجاره ماهانه',amount:'۴۰۰٬۰۰۰ ریال'}]);
});

test('missing prices or areas do not become fabricated zeros or unwanted fees',()=>{
 const m=getUnifiedCardModel(req('other'),{});
 assert.deepEqual(m.moneyRows,[]);
 assert.equal(m.areaText,'');
});

test('existing compact design and both mobile and reduced-motion rules remain in place',()=>{
 const css=fs.readFileSync('src/components/IndustrialCardPilot.css','utf8');
 const added=fs.readFileSync('src/components/UnifiedSpaceCard.css','utf8');
 assert.ok(css.includes('FAZAJOO_INDUSTRIAL_CARD_COMPACT15_V1_START'));
 assert.ok(css.includes('@media (max-width: 540px)'));
 assert.ok(css.includes('prefers-reduced-motion'));
 assert.ok(added.includes('fj-unified-card'));
});

test('routing keeps warehouse on the signed-off pilot and sends other 8 categories to the unified card',()=>{
 const s=fs.readFileSync('src/components/ParkingCard.jsx','utf8');
 const warehouse=s.indexOf('if (category === "warehouse")');
 const other=s.indexOf('if (GENERAL_CATEGORIES.includes(category))');
 assert.ok(warehouse>0&&other>warehouse);
 for(const category of GENERAL_CATEGORIES) assert.ok(s.includes(category+':'));
});
