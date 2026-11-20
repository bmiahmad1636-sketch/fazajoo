import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveOtherDemandArt, OTHER_DEMAND_ART_GROUPS } from '../src/utils/otherDemandArt.js';
import { GENERAL_ART, getUnifiedCardModel } from '../src/utils/unifiedCardModel.js';

const wanted=(title='درخواست فضای مناسب')=>({
  id:'other-req-1', title, city:'اصفهان', category:'other', listingType:'wanted',
  status:'active', price:'', spaceAttributes:null,
});
const demand=(title,requestText='')=>getUnifiedCardModel(wanted(title),{
  request:{rentalTerm:'long',requestText},termDeclared:true,
  categoryLabel:'سایر فضاها',areaText:'از ۳۰۰ مترمربع',
  moneyRows:[{label:'حداکثر اجاره ماهانه',amount:'۱۰۰٬۰۰۰٬۰۰۰ ریال'}]
});

const examples=[
  ['گاوداری بزرگ','livestock'],['مرغداری صنعتی','livestock'],
  ['گاوداري ۳۰۰۰ متری','livestock'],['گاوداری در فضای روستایی','livestock'],
  ['استخر پرورش ماهی','aquaculture'],['مرکز آبزی‌پروری','aquaculture'],
  ['گلخانه هیدروپونیک','greenhouse'],['نهالستان گل و گیاه','greenhouse'],
  ['باشگاه بدنسازی','sports'],['استخر شنا سرپوشیده','sports'],
  ['پیست کارتینگ','sports'],['کارگاه قالیشویی','workshop'],
  ['تعمیرگاه خودرو','workshop'],['سالن همایش','events'],
  ['فضای نمایشگاه','events'],['پانسیون حیوانات','care'],
  ['مهدکودک','care'],['محوطه دپو','logistics'],['توقفگاه کامیون','logistics'],
];

test('eight purposeful illustrations exist and are valid public SVG assets',()=>{
 assert.equal(OTHER_DEMAND_ART_GROUPS.length,8);
 assert.equal(new Set(OTHER_DEMAND_ART_GROUPS.map(g=>g.id)).size,8);
 for (const g of OTHER_DEMAND_ART_GROUPS){
  const artwork=path.join('public','images',`fj-demand-other-${g.id}.svg`);
  assert.ok(fs.existsSync(artwork),artwork);
  const svg=fs.readFileSync(artwork,'utf8');
  assert.match(svg,/^<svg /);assert.match(svg,/<\/svg>$/);
  assert.ok(!svg.includes('<script'),artwork);
  assert.ok(!svg.includes('به دنبال اجاره'),artwork);
 }
});

test('all requested space examples select a category illustration',()=>{
 for(const [title,id] of examples){
  const m=demand(title);
  assert.equal(m.image,`/images/fj-demand-other-${id}.svg`,title);
  assert.equal(m.title,`${title} / اصفهان`);
  assert.deepEqual(m.moneyRows,[{label:'حداکثر اجاره ماهانه',amount:'۱۰۰٬۰۰۰٬۰۰۰ ریال'}]);
  assert.equal(m.areaText,'از ۳۰۰ مترمربع');
  assert.deepEqual(m.badges.map(x=>x.label),['بلندمدت']);
 }
});

test('explicit title is preferred over text of supplementary request notes',()=>{
 const listing=wanted('فضای گلخانه');
 assert.equal(resolveOtherDemandArt(listing,{requestText:'انبار وسایل باشگاه ورزشی'}).id,'greenhouse');
});

test('typed request text works when the ad title is generic',()=>{
 const m=demand('فضای موردنیاز','برای راه‌اندازی استخر پرورش ماهی با آب مناسب درخواست فضا دارم');
 assert.equal(m.image,'/images/fj-demand-other-aquaculture.svg');
});

test('ambiguity falls back to general illustration, not a misleading random group',()=>{
 for (const s of ['فضای چندمنظوره خاص','استخر ویژه','پرورش قارچ','گاوچرانی','', 'سایر فضاها']){
  assert.equal(demand(s).image,GENERAL_ART.other,s);
 }
 assert.equal(resolveOtherDemandArt({},{}).src,GENERAL_ART.other);
});

test('no artwork mapping affects other eight categories or supply',()=>{
 const l=wanted('استخر پرورش ماهی');
 l.listingType='offer';
 assert.equal(getUnifiedCardModel(l).image,GENERAL_ART.other);
 for(const category of ['parking','storage','shop','land','residential','villa','garden']){
  const listing={...wanted('گاوداری'),category};
  assert.equal(getUnifiedCardModel(listing).image,GENERAL_ART[category]);
 }
});

test('no rental or finance mutation and no unknown term invention',()=>{
 const m=getUnifiedCardModel(wanted('گلخانه'),{categoryLabel:'سایر',request:{requestText:'گلخانه',rentalTerm:'long'},termDeclared:false,
  moneyRows:[{label:'ودیعه',amount:'۲٬۰۰۰٬۰۰۰ ریال'}]});
 assert.deepEqual(m.badges,[]);
 assert.equal(m.moneyRows[0].amount,'۲٬۰۰۰٬۰۰۰ ریال');
});

test('artwork does not rely on fetch, randomness, API or user-provided URL',()=>{
 const src=fs.readFileSync('src/utils/otherDemandArt.js','utf8');
 assert.ok(!/\bfetch\(|\bMath\.random|https?:\/\//.test(src));
 for(const [title] of examples){
  const ref=resolveOtherDemandArt(wanted(title));
  assert.match(ref.src,/^\/images\/fj-demand-other-[a-z]+\.svg$/);
 }
});
