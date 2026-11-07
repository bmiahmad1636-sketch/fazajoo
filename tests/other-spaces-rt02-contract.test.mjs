import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {
 OTHER_OFFER_DEFAULT,makeOtherAttributes,otherOfferFromAttributes,validateOtherOffer,otherListingPrice,
 otherFinancialRows,otherFinancialHeadline,otherRentalBadges
} from '../src/utils/otherOffer.js';
import {
 EMPTY_OTHER_REQUEST,readOtherRequest,writeOtherRequest,validateOtherRequest,otherRequestBudgetText,otherWantedListingPrice
} from '../src/utils/otherRequest.js';
import {toSpaceProfile,readDemandMetadata} from '../src/utils/spaceProfile.js';
import {compareSpaceListings} from '../src/utils/spaceCompatibility.js';
import {readRentalTermSnapshot,inspectListingRentalAlignment} from '../src/utils/rentalTermBridge.js';
const require=createRequire(import.meta.url);
const {cleanOtherSpaceAttributes}=require('../backend/src/utils/otherSpaceAttributes.js');
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const short=(extra={})=>({...OTHER_OFFER_DEFAULT,usage:'ضبط پادکست و تولید محتوا',layout:'indoor',access:'independent',features:['electricity','internet'],rentalTerm:'short',shortRateUnit:'daily',shortRateRial:'25000000',securityHoldRial:'40000000',...extra});
const long=(extra={})=>({...OTHER_OFFER_DEFAULT,usage:'استفاده از سالن برای کارهای هنری',layout:'mixed',rentalTerm:'long',financialMode:'deposit_rent',longDepositRial:'1500000000',longMonthlyRentRial:'95000000',...extra});
const attrs=d=>cleanOtherSpaceAttributes(makeOtherAttributes(d),'other','offer');
const offer=(d,extra={})=>({listingType:'offer',category:'other',city:'شهرضا',customCategory:'استودیو',title:'استودیو برای کار',area:75,price:otherListingPrice(d).price,priceType:otherListingPrice(d).priceType,spaceAttributes:attrs(d),...extra});
const wanted=(term,extra={})=>({listingType:'wanted',category:'other',city:'شهرضا',customCategory:'استودیو',description:writeOtherRequest({...EMPTY_OTHER_REQUEST,rentalTerm:term,requestText:'یک استودیوی آرام و مجهز برای ضبط برنامه‌های صوتی لازم دارم',...extra})});

test('RT02 offer short rate persists separately from long rent/deposit',()=>{
 assert.equal(validateOtherOffer(short(),75,'استودیو'),'');
 assert.deepEqual(otherListingPrice(short()),{price:'25000000',priceType:'daily'});
 assert.deepEqual(otherListingPrice(short({shortRateUnit:'weekly'})),{price:'25000000',priceType:'weekly'});
 assert.deepEqual(otherListingPrice(short({shortRateUnit:'monthly'})),{price:'25000000',priceType:'monthly'});
 const a=attrs(short());assert.equal(a.values.shortRateRial,25000000);
 assert.equal(a.values.securityHoldRial,40000000);assert.equal(a.values.longDepositRial,null);
 assert.equal(a.values.longMonthlyRentRial,null);
});
test('RT02 offer financial labels: short deposit is damage hold, not lease mortgage',()=>{
 const rows=otherFinancialRows(attrs(short()));assert.equal(rows.length,2);
 assert.match(rows[0].label,/اجاره روزانه/);
 assert.match(rows[1].label,/ودیعه \/ ضمانت خسارت/);
 assert.ok(!rows.some(x=>x.label==='رهن کامل'));
});
test('RT02 long deposit + monthly rent stay two money rows',()=>{
 assert.equal(validateOtherOffer(long(),75,'فضای تمرین'),'');
 assert.deepEqual(otherListingPrice(long()),{price:'95000000',priceType:'monthly'});
 assert.deepEqual(otherFinancialRows(attrs(long())).map(x=>x.label),['ودیعه','اجاره ماهانه']);
});
test('RT02 full lease deposit never becomes a generic monthly rental price',()=>{
 const o=long({financialMode:'full_deposit',longMonthlyRentRial:'300000000'});
 assert.equal(validateOtherOffer(o,50,'استودیو'),'');
 assert.deepEqual(otherListingPrice(o),{price:'',priceType:'negotiable'});
 const a=attrs(o);assert.equal(a.values.longMonthlyRentRial,null);
 assert.deepEqual(otherFinancialRows(a).map(x=>x.label),['رهن کامل']);
 assert.match(otherFinancialHeadline(a),/رهن کامل/);
});
test('RT02 rent only excludes hidden irrelevant long deposit',()=>{
 const a=attrs(long({financialMode:'rent_only',longDepositRial:'300000000'}));
 assert.equal(a.values.longDepositRial,null);
 assert.deepEqual(otherFinancialRows(a).map(x=>x.label),['اجاره ماهانه']);
});
test('RT02 invalid offer cannot be published without explicit type/amount',()=>{
 assert.match(validateOtherOffer(OTHER_OFFER_DEFAULT,55,'استودیو'),/کاربرد|مدت/);
 assert.match(validateOtherOffer(short({shortRateRial:''}),55,'استودیو'),/مبلغ/);
 assert.match(validateOtherOffer(short({layout:''}),55,'استودیو'),/سرپوشیده/);
 assert.match(validateOtherOffer(short(),0,'استودیو'),/متراژ/);
 assert.match(validateOtherOffer(short(),10,'سا'),/نام فضای/);
 assert.match(validateOtherOffer(long({financialMode:''}),10,'استودیو'),/روش مالی/);
 assert.match(validateOtherOffer(long({longDepositRial:''}),10,'استودیو'),/ودیعه/);
});
test('RT02 old other offer has no fabricated contract or badges',()=>{
 assert.equal(otherOfferFromAttributes(null).rentalTerm,'');
 assert.equal(otherOfferFromAttributes({schemaVersion:1,category:'parking',values:{rentalTerm:'short'}}).rentalTerm,'');
 assert.deepEqual(otherRentalBadges(null),[]);
 const p=toSpaceProfile({listingType:'offer',category:'other',city:'شهرضا',price:'2000000',priceType:'monthly'});
 assert.equal(p.fields.rentalTerm,undefined);assert.equal(readRentalTermSnapshot({listingType:'offer',category:'other'}).profile.primaryTerm,null);
});
test('RT02 owner opt-in two check / one check / inactive states',()=>{
 const a=attrs(short({canNegotiateOtherTerm:true}));
 assert.deepEqual(otherRentalBadges(a).map(x=>[x.label,x.state]),[['کوتاه‌مدت','primary'],['بلندمدت','possible']]);
 assert.deepEqual(otherRentalBadges(attrs(long())).map(x=>x.state),['primary','inactive']);
 assert.deepEqual(otherRentalBadges(attrs(long({canNegotiateOtherTerm:true}))).map(x=>x.state),['primary','possible']);
});
test('RT02 server strips forged price, consent, irrelevant fields and unknown keys',()=>{
 const raw=makeOtherAttributes(short());raw.values.canNegotiateOtherTerm='true';raw.values.shortRateRial='bad';
 raw.values.securityHoldRial='-50';raw.values.longDepositRial='200000000';raw.values.admin=true;
 raw.values.features=['internet','fake','internet'];
 const a=cleanOtherSpaceAttributes(raw,'other','offer');
 assert.equal(a.values.canNegotiateOtherTerm,false);
 assert.equal(a.values.shortRateRial,null);assert.equal(a.values.securityHoldRial,null);
 assert.equal(a.values.longDepositRial,null);assert.equal(a.values.admin,undefined);
 assert.deepEqual(a.values.features,['internet']);
 assert.deepEqual(cleanOtherSpaceAttributes(raw,'other','wanted'),{});
});
test('RT02 edit hydration round trip preserves typed short/long states',()=>{
 const s=otherOfferFromAttributes(attrs(short({canNegotiateOtherTerm:true})));
 assert.equal(s.rentalTerm,'short');assert.equal(s.securityHoldRial,'40000000');assert.equal(s.canNegotiateOtherTerm,true);
 const l=otherOfferFromAttributes(attrs(long({financialMode:'full_deposit'})));
 assert.equal(l.rentalTerm,'long');assert.equal(l.longMonthlyRentRial,'');
});
test('RT02 wanted short budget writes period and keeps deposit separate',()=>{
 const input={...EMPTY_OTHER_REQUEST,rentalTerm:'short',pricePeriod:'weekly',maxBudget:'90000000',requestText:'یک فضای آموزش و تمرین صدا برای چند روز لازم دارم',maxDepositRial:'50000000'};
 assert.equal(validateOtherRequest(input),'');
 const written=writeOtherRequest(input);const read=readOtherRequest(written);
 assert.equal(read.hasMetadata,true);assert.equal(read.data.rentalTerm,'short');
 assert.equal(read.data.maxDepositRial,'');assert.equal(read.data.maxBudget,'90000000');
 assert.deepEqual(otherWantedListingPrice(read.data),{price:'90000000',priceType:'weekly'});
 assert.match(otherRequestBudgetText(read.data),/هفتگی/);
});
test('RT02 wanted long deposit ceiling is not monthly-rent asking price',()=>{
 const d={...EMPTY_OTHER_REQUEST,rentalTerm:'long',financialMode:'full_deposit',requestText:'برای یک دوره طولانی سالن تمرین مناسب می‌خواهم',maxDepositRial:'2000000000'};
 assert.equal(validateOtherRequest(d),'');
 assert.deepEqual(otherWantedListingPrice(d),{price:'',priceType:'negotiable'});
 assert.match(otherRequestBudgetText(d),/رهن کامل/);
 const r=readOtherRequest(writeOtherRequest(d));assert.equal(r.data.maxMonthlyRentRial,'');
});
test('RT02 wanted long deposit+monthly cap both survive independently',()=>{
 const d={...EMPTY_OTHER_REQUEST,rentalTerm:'long',financialMode:'deposit_rent',maxDepositRial:'500000000',maxMonthlyRentRial:'50000000',maxBudget:'8000000',requestText:'سالن تمرین برای قرارداد بلندمدت لازم دارم'};
 const r=readOtherRequest(writeOtherRequest(d));
 assert.equal(r.data.maxBudget,'');assert.equal(r.data.maxDepositRial,'500000000');
 assert.equal(r.data.maxMonthlyRentRial,'50000000');assert.deepEqual(otherWantedListingPrice(r.data),{price:'50000000',priceType:'monthly'});
 const p=toSpaceProfile(wanted('long',d));assert.equal(p.maxRentRial,50000000);assert.equal(p.maxDepositRial,500000000);
});
test('RT02 previous flexible requests remain unknown and now require explicit short/long selection',()=>{
 const d={...EMPTY_OTHER_REQUEST,rentalTerm:'flexible',requestText:'برای ضبط و تمرین به یک فضای چندمنظوره نیاز دارم',maxBudget:'50000000'};
 assert.match(validateOtherRequest(d),/نوع مدت/);
 const r=readOtherRequest(writeOtherRequest(d));
 assert.equal(r.data.rentalTerm,'');
 assert.equal(otherWantedListingPrice(r.data).price,'');
 assert.equal(otherRequestBudgetText(r.data),'مدت اجاره هنوز مشخص نشده');
 assert.equal(readRentalTermSnapshot(wanted('flexible')).profile.primaryTerm,null);
});
test('RT02 old wanted duration days is short, months remains explicitly unknown',()=>{
 const prefix='[FAZAJOO_OTHER_WANTED:';
 const tag=x=>prefix+encodeURIComponent(JSON.stringify({requestText:'برای کارگاه به فضایی مناسب احتیاج دارم',...x}))+']';
 assert.equal(readOtherRequest(tag({duration:'days'})).data.rentalTerm,'short');
 assert.equal(readOtherRequest(tag({duration:'long'})).data.rentalTerm,'long');
 assert.equal(readOtherRequest(tag({duration:'months'})).data.rentalTerm,'');
 assert.equal(readOtherRequest('درخواست قدیمی بدون متادیتا').data.rentalTerm,'');
});
test('RT02 matching different terms conflicts without owner consent, but requires review with consent',()=>{
 const d=wanted('long',{financialMode:'rent_only',maxMonthlyRentRial:'30000000'});
 const no=compareSpaceListings(d,offer(short({canNegotiateOtherTerm:false})));
 assert.equal(no.status,'incompatible');assert.ok(no.conflicts.includes('other-rental-term'));
 const yes=compareSpaceListings(d,offer(short({canNegotiateOtherTerm:true})));
 assert.equal(yes.status,'needs_details');assert.ok(yes.unknown.includes('other-alternative-term-and-price-review'));
 assert.ok(!yes.conflicts.includes('other-rental-term'));
 assert.ok(!yes.conflicts.includes('rent-irr'));
});
test('RT02 even approved alternative never overrides city mismatch',()=>{
 const r=compareSpaceListings(wanted('long'),offer(short({canNegotiateOtherTerm:true}),{city:'اهواز'}));
 assert.equal(r.status,'incompatible');assert.ok(r.conflicts.includes('city'));
});
test('RT02 same-term comparison never bypasses manual review for free-text spaces',()=>{
 const r=compareSpaceListings(wanted('short',{pricePeriod:'daily',maxBudget:'30000000'}),offer(short()));
 assert.equal(r.status,'needs_details');assert.ok(r.unknown.includes('other-space-manual-review'));
 assert.ok(r.matched.includes('other-rental-term'));
});
test('RT02 rental bridge separates optional consent from confirmed offer price',()=>{
 const listing=offer(short({canNegotiateOtherTerm:true}));
 const snap=readRentalTermSnapshot(listing);
 assert.equal(snap.profile.primaryTerm,'short');assert.equal(snap.profile.securityHoldRial,40000000);
 assert.equal(snap.profile.leaseDepositRial,null);assert.equal(snap.profile.rateUnit,'day');
 const verdict=inspectListingRentalAlignment(listing,wanted('long'));
 assert.equal(verdict.status,'needs_review');
});
test('RT02 form wired to add/edit, detail, offer/wanted and read-only matcher',()=>{
 const a=source('src/pages/AddParking.jsx'),e=source('src/pages/EditParking.jsx');
 const c=source('src/components/ParkingCard.jsx'),d=source('src/pages/ParkingDetails.jsx');
 const backend=source('backend/src/controllers/spaces.controller.js');
 for(const f of [a,e]){
  assert.match(f,/<OtherOfferFields/);assert.match(f,/<OtherRequestFields/);
  assert.match(f,/makeOtherAttributes/);assert.match(f,/otherWantedListingPrice/);
  assert.match(f,/otherFinancialHeadline/);
 }
 for(const f of [c,d]){assert.match(f,/OtherRentalBadges/);assert.match(f,/otherPriceRows/);}
 assert.match(backend,/cleanOtherSpaceAttributes/);
 assert.match(source('src/utils/spaceCompatibility.js'),/other-alternative-term-and-price-review/);
});

// Exercise the real server clean/validate path without connecting to services.
import {runInNewContext} from 'node:vm';
const controllerPath=new URL('../backend/src/controllers/spaces.controller.js',import.meta.url);
const srvRequire=createRequire(controllerPath);
const dummy={exports:{}};
runInNewContext(source('backend/src/controllers/spaces.controller.js')+'\nmodule.exports.__otherTest={clean,validate};',{
 module:dummy,console,Buffer,setTimeout,
 require:(name)=>name==='../db/pool'?{query:async()=>({rows:[]})}:name.startsWith('../services/')?{}:srvRequire(name),
},{filename:controllerPath.pathname,timeout:2000});
const {clean:serverClean,validate:serverValidate}=dummy.exports.__otherTest;
const url='https://example.com/other-space.jpg';
const body=(d,extra={})=>({listingType:'offer',category:'other',title:'استودیوی ضبط و تمرین',city:'شهرضا',area:75,customCategory:'استودیو',categoryLabel:'استودیو',
 imageUrl:url,imageUrls:[url],phone:'09132222453',price:'9999999999',priceType:'monthly',spaceAttributes:makeOtherAttributes(d),description:'',...extra});

test('RT02 actual backend clean+validate short ignores forged generic monthly price',()=>{
 const v=serverClean(body(short()));
 assert.equal(v.price,'25000000');assert.equal(v.priceType,'daily');
 assert.equal(v.spaceAttributes.values.securityHoldRial,40000000);
 assert.equal(serverValidate(v),'');
});
test('RT02 actual backend clean+validate full deposit never advertises it as rent',()=>{
 const v=serverClean(body(long({financialMode:'full_deposit'})));
 assert.equal(v.price,'');assert.equal(v.priceType,'negotiable');
 assert.equal(v.spaceAttributes.values.longMonthlyRentRial,null);
 assert.equal(serverValidate(v),'');
});
test('RT02 actual backend clean+validate deposit+rent uses only monthly rent as price',()=>{
 const v=serverClean(body(long()));
 assert.equal(v.price,'95000000');assert.equal(v.priceType,'monthly');
 assert.equal(v.spaceAttributes.values.longDepositRial,1500000000);
 assert.equal(serverValidate(v),'');
});
test('RT02 server rejects tampered typed fields; keeps old untyped ads editable',()=>{
 const v=serverClean(body(short()));v.price='1';
 assert.match(serverValidate(v),/قیمت/);
 const old=serverClean(body(short(),{spaceAttributes:null,description:'یک فضای کاربری مناسب برای واگذاری'}));
 assert.equal(old.spaceAttributes?.schemaVersion,undefined);
 assert.equal(serverValidate(old),'');
});
test('RT02 actual backend does not treat wanted price ceiling as offer rent',()=>{
 const d={...EMPTY_OTHER_REQUEST,rentalTerm:'long',financialMode:'full_deposit',maxDepositRial:'900000000',requestText:'سالن چندمنظوره برای فعالیت هنری درازمدت می‌خواهم'};
 const v=serverClean(body(short(),{listingType:'wanted',spaceAttributes:null,price:'',priceType:'negotiable',description:writeOtherRequest(d),imageUrl:'',imageUrls:[]}));
 assert.equal(v.spaceAttributes?.schemaVersion,undefined);
 assert.equal(v.price,'');assert.equal(v.priceType,'negotiable');
 assert.equal(serverValidate(v),'');
});
