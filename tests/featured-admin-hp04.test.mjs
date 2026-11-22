import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rialDigits, rialGrouped, rialText } from '../src/utils/featuredMoneyHP04.js';
const require = createRequire(import.meta.url);
const { normalizeIranMobile, normalizeOwnerSearch, escapeSqlLike } = require('../backend/src/services/featuredOwnerLookupHP04.js');
const code = (path) => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('price groups large values and preserves server-side ASCII digit data', () => {
  assert.equal(rialGrouped('123456789'), '123,456,789');
  assert.equal(rialText('123456789'), '123,456,789 ریال');
  assert.equal(rialDigits('۱۲٬۳۴۵٬۶۷۸ ریال'), '12345678');
  assert.equal(rialDigits('١٢٣,٤٥٦'), '123456');
  assert.equal(rialDigits('00000010'), '10');
  assert.equal(rialDigits(''), '');
  assert.equal(rialDigits('99999999999999999999').length, 15);
});
test('account phone normalization supports local, Iranian and Persian formats', () => {
  for(const input of ['09121234567','9121234567','+989121234567','00989121234567','۰۹۱۲۱۲۳۴۵۶۷']) {
    assert.equal(normalizeIranMobile(input), '09121234567');
  }
  assert.equal(normalizeIranMobile('0912'), '');
  assert.equal(normalizeIranMobile('03112345678'), '');
  assert.equal(normalizeOwnerSearch('x'.repeat(150)).length,80);
  assert.equal(escapeSqlLike('a%b_c\\d'),'a\\%b\\_c\\\\d');
});
test('owner lookup remains admin-only and never exposed publicly', () => {
  const routes = code('backend/src/routes/featuredShowcase.routes.js');
  assert.match(routes, /router\.use\("\/admin",requireAuth,requireAdmin\)/);
  assert.match(routes, /router\.post\("\/admin\/owner-spaces\/search"/);
  const service = code('backend/src/services/featuredShowcase.service.js');
  const ownerLookup = service.slice(service.indexOf('async function lookupOwnerSpaces'),service.indexOf('async function addBooking'));
  assert.match(ownerLookup,/FROM users WHERE phone=\$1 AND is_active=true/);
  assert.match(ownerLookup,/s\.owner_id=\$1/);
  assert.doesNotMatch(ownerLookup,/s\.phone\s*=|spaces\.phone/i);
  assert.match(ownerLookup,/s\.listing_type='offer'/);
  assert.match(ownerLookup,/s\.status='active'/);
  assert.match(ownerLookup,/legal_hold/);
  assert.match(ownerLookup,/featured_showcase_bookings/);
  assert.match(ownerLookup,/LIMIT \$4 OFFSET \$5/);
  assert.doesNotMatch(ownerLookup,/owner_phone|u\.phone AS/i);
});
test('booking verifies selected ad belongs to searched account, not listing contact', () => {
  const service=code('backend/src/services/featuredShowcase.service.js');
  const booking=service.slice(service.indexOf('async function addBooking'), service.indexOf('async function cancelBooking'));
  assert.match(booking,/normalizeIranMobile\(input\.ownerPhone\)/);
  assert.match(booking,/u\.phone=\$2/);
  assert.match(booking,/s\.legal_hold/);
  assert.match(booking,/manual_verified/);
});
test('UI only submits selected preview, without loading the whole marketplace', () => {
  const ui=code('src/pages/FeaturedShowcaseAdmin.jsx');
  assert.doesNotMatch(ui,/\bgetSpaces\(/);
  assert.match(ui,/findFeaturedOwnerSpaces/);
  assert.match(ui,/<ListingPhoto/);
  assert.match(ui,/selectedSpace\.id !== booking\.spaceId/);
  assert.match(ui,/ownerPhone:lookup\.phone/);
  assert.match(ui,/rialGrouped\(value\)/);
  assert.match(ui,/rialText\(settings\.packagePriceRials\)/);
  assert.match(ui,/target="_blank"/);
});
test('showcase continues to display exactly main image, with gallery on details', () => {
  const publicCode=code('backend/src/services/featuredShowcase.service.js');
  const publicProjection=publicCode.slice(publicCode.indexOf('const publicFields'),publicCode.indexOf('async function current'));
  assert.match(publicProjection,/s\.image_url/);
  assert.match(publicProjection,/s\.image_urls->>0/);
  assert.doesNotMatch(publicProjection,/phone/);
  const component=code('src/components/FeaturedShowcaseHP03.jsx');
  assert.match(component,/placement\.imageUrl/);
  assert.match(component,/to=\{`\/parking\/\$\{encodeURIComponent\(placement\.spaceId\)\}`\}/);
});

test('owner search passes parameterized exact account phone and returns only safe summary', async () => {
  const poolPath=require.resolve('../backend/src/db/pool.js');
  const servicePath=require.resolve('../backend/src/services/featuredShowcase.service.js');
  const existingPool=require.cache[poolPath];
  const existingService=require.cache[servicePath];
  const calls=[];
  let released=false;
  const fakeClient={
    query:async (sql,params)=>{
      calls.push({sql,params});
      if(sql.includes('FROM users WHERE phone=')) return {rowCount:1,rows:[{id:'user-1',full_name:'کاربر آزمایشی'}]};
      if(sql.includes('FROM spaces s')) return {rowCount:1,rows:[{
        id:'space-1',title:'سوله آزمایشی',city:'اصفهان',category:'warehouse',
        category_label:'سوله',image_url:'https://example.invalid/cover.jpg',image_count:10,
      }]};
      throw new Error('Unexpected SQL in lookup');
    },
    release:()=>{released=true;}
  };
  try {
    require.cache[poolPath]={id:poolPath,filename:poolPath,loaded:true,exports:{pool:{connect:async()=>fakeClient}}};
    delete require.cache[servicePath];
    const svc=require(servicePath);
    const data=await svc.lookupOwnerSpaces({phone:'۰۹۱۲۱۲۳۴۵۶۷',search:'سوله',offset:0});
    assert.equal(data.ownerFound,true);
    assert.equal(data.spaces.length,1);
    assert.equal(data.spaces[0].imageCount,10);
    assert.deepEqual(Object.keys(data.spaces[0]).sort(),['category','categoryLabel','city','id','imageCount','imageUrl','title'].sort());
    assert.equal(calls[0].params[0],'09121234567');
    assert.equal(calls[1].params[0],'user-1');
    assert.equal(calls[1].params[2],'%سوله%');
    assert.equal(calls[1].params[3],21);
    assert.equal(calls[1].params[4],0);
    assert.equal(released,true);
  } finally {
    if(existingPool) require.cache[poolPath]=existingPool; else delete require.cache[poolPath];
    if(existingService) require.cache[servicePath]=existingService; else delete require.cache[servicePath];
  }
});
