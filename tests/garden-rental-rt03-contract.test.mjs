import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {GARDEN_OFFER_DEFAULT,makeGardenAttributes,gardenOfferFromAttributes,gardenListingPrice,gardenFinancialRows,gardenFinancialHeadline,gardenRentalBadges,validateGardenOffer} from '../src/utils/gardenOffer.js';
import {EMPTY_GARDEN_REQUEST,writeGardenRequest,readGardenRequest,gardenRequestBudgetRows,gardenRequestBudgetText,gardenWantedListingPrice,validateGardenRequest} from '../src/utils/gardenRequest.js';
import {compareSpaceListings} from '../src/utils/spaceCompatibility.js';
import {toSpaceProfile} from '../src/utils/spaceProfile.js';
import {readRentalTermSnapshot,inspectListingRentalAlignment} from '../src/utils/rentalTermBridge.js';
const require=createRequire(import.meta.url);
const {cleanGardenSpaceAttributes}=require('../backend/src/utils/gardenSpaceAttributes.js');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base={...GARDEN_OFFER_DEFAULT,gardenType:'orchard',allowedPurposes:['recreation'],accessRoad:'asphalt'};
const short=(p={})=>({...base,rentalTerm:'short',shortRateUnit:'daily',shortRateRial:'35000000',securityHoldRial:'20000000',...p});
const season=(p={})=>({...base,rentalTerm:'seasonal',seasonalRateRial:'650000000',seasonalSecurityHoldRial:'25000000',...p});
const long=(p={})=>({...base,rentalTerm:'long',financialMode:'deposit_rent',depositRial:'1200000000',longMonthlyRentRial:'90000000',...p});
const attrs=v=>cleanGardenSpaceAttributes(makeGardenAttributes(v),'garden','offer');
const offer=(v)=>({listingType:'offer',category:'garden',city:'شهرضا',area:1500,spaceAttributes:attrs(v),gardenDetails:{water:true},...gardenListingPrice(v)});
const wanted=(term,extra={})=>({listingType:'wanted',category:'garden',city:'شهرضا',description:writeGardenRequest({...EMPTY_GARDEN_REQUEST,purpose:'recreation',minArea:'300',rentalTerm:term,shortRateUnit:'daily',shortMaxBudgetRial:'40000000',seasonalMaxBudgetRial:'700000000',longFinancialMode:'deposit_rent',maxDeposit:'1300000000',maxBudget:'100000000',...extra})});

test('RT03 short rate is not mortgage and rate unit is explicit',()=>{
 assert.equal(validateGardenOffer(short()),'');assert.deepEqual(gardenListingPrice(short()),{price:'35000000',priceType:'daily'});
 assert.equal(attrs(short()).values.depositRial,null);
 assert.deepEqual(gardenFinancialRows(attrs(short())).map(x=>x.label),['اجاره روزانه','ودیعه / ضمانت خسارت']);
});
test('RT03 short weekly and monthly rates retain their own periods',()=>{
 for(const unit of ['weekly','monthly']){const v=short({shortRateUnit:unit});assert.equal(gardenListingPrice(v).priceType,unit);assert.equal(attrs(v).values.shortRateUnit,unit);}
});
test('RT03 seasonal is per season, never a fictitious monthly rent',()=>{
 const v=season();assert.equal(validateGardenOffer(v),'');assert.deepEqual(gardenListingPrice(v),{price:'',priceType:'negotiable'});
 assert.deepEqual(gardenFinancialRows(attrs(v)).map(x=>x.label),['اجاره هر فصل','ودیعه / ضمانت خسارت']);
});
test('RT03 seasonal wrong or empty rate is rejected',()=>{
 assert.match(validateGardenOffer(season({seasonalRateRial:''})),/فصلی/);
 assert.equal(attrs(season({seasonalRateRial:'bogus'})).values.seasonalRateRial,null);
});
test('RT03 long deposit plus monthly rent uses only monthly rent as generic price',()=>{
 const v=long();assert.equal(validateGardenOffer(v),'');assert.deepEqual(gardenListingPrice(v),{price:'90000000',priceType:'monthly'});
 assert.deepEqual(gardenFinancialRows(attrs(v)).map(x=>x.label),['ودیعه','اجاره ماهانه']);
 assert.match(gardenFinancialHeadline(attrs(v)),/ودیعه.*اجاره ماهانه/);
});
test('RT03 full deposit cannot leak into generic rent',()=>{
 const v=long({financialMode:'full_deposit',longMonthlyRentRial:'999000000'});
 assert.equal(validateGardenOffer(v),'');assert.deepEqual(gardenListingPrice(v),{price:'',priceType:'negotiable'});
 assert.equal(attrs(v).values.longMonthlyRentRial,null);
 assert.deepEqual(gardenFinancialRows(attrs(v)).map(x=>x.label),['رهن کامل']);
});
test('RT03 rent only sanitizes stale deposit',()=>{
 const v=long({financialMode:'rent_only',depositRial:'200000000'});
 assert.equal(attrs(v).values.depositRial,null);
 assert.deepEqual(gardenFinancialRows(attrs(v)).map(x=>x.label),['اجاره ماهانه']);
});
test('RT03 missing finance and damaged short amounts are rejected',()=>{
 assert.match(validateGardenOffer(short({shortRateRial:''})),/کوتاه/);
 assert.match(validateGardenOffer(long({longMonthlyRentRial:''})),/ماهانه/);
 assert.match(validateGardenOffer(long({financialMode:''})),/شیوه مالی/);
});
test('RT03 different term fields and malicious consent cannot survive server clean',()=>{
 const a=makeGardenAttributes(short({canNegotiateOtherTerm:true}));a.values.admin=true;a.values.financialMode='full_deposit';a.values.depositRial='9999999999';a.values.features=['parking','fake'];
 a.values.canNegotiateOtherTerm='true';
 const v=cleanGardenSpaceAttributes(a,'garden','offer').values;
 assert.equal(v.canNegotiateOtherTerm,false);assert.equal(v.depositRial,null);assert.equal(v.financialMode,null);assert.equal(v.admin,undefined);assert.deepEqual(v.features,['parking']);
});
test('RT03 owner explicitly permits short-long conversion only as negotiation',()=>{
 assert.deepEqual(gardenRentalBadges(attrs(short({canNegotiateOtherTerm:true}))).map(x=>x.state),['primary','possible']);
 assert.deepEqual(gardenRentalBadges(attrs(long())).map(x=>x.state),['primary','inactive']);
 assert.deepEqual(gardenRentalBadges(attrs(season({canNegotiateOtherTerm:true}))).map(x=>x.state),['primary']);
 assert.deepEqual(gardenRentalBadges(null),[]);
});
test('RT03 old offer stays unknown if duration flexible',()=>{
 const a={schemaVersion:1,category:'garden',values:{gardenType:'orchard',rentalDuration:'flexible',financialMode:'rent_only'}};
 assert.equal(gardenOfferFromAttributes(a,'50000000','monthly').rentalTerm,'');
 assert.deepEqual(gardenRentalBadges(a),[]);
});
test('RT03 legacy explicit daily rate editable without changing persisted old ad',()=>{
 const a={schemaVersion:1,category:'garden',values:{gardenType:'orchard',rentalDuration:'daily',financialMode:'rent_only'}};
 const e=gardenOfferFromAttributes(a,'10000000','daily');assert.equal(e.rentalTerm,'short');assert.equal(e.shortRateRial,'10000000');
 assert.equal(a.values.shortRateRial,undefined);
});
test('RT03 older yearly rate must never become monthly rent',()=>{
 const a={schemaVersion:1,category:'garden',values:{gardenType:'orchard',rentalDuration:'yearly',financialMode:'rent_only'}};
 assert.equal(gardenOfferFromAttributes(a,'800000000','yearly').longMonthlyRentRial,'');
});
test('RT03 seasonal legacy rate must not be guessed as per-season',()=>{
 const a={schemaVersion:1,category:'garden',values:{gardenType:'orchard',rentalDuration:'seasonal',financialMode:'rent_only'}};
 assert.equal(gardenOfferFromAttributes(a,'3000000','daily').seasonalRateRial,'');
});
test('RT03 typed offer round-trip preserves true fields and owner opt-in',()=>{
 const e=gardenOfferFromAttributes(attrs(long({canNegotiateOtherTerm:true})));
 assert.equal(e.rentalTerm,'long');assert.equal(e.longMonthlyRentRial,'90000000');assert.equal(e.canNegotiateOtherTerm,true);
});
test('RT03 short wanted round-trip and price remain a budget ceiling',()=>{
 const d=readGardenRequest(wanted('short').description);assert.equal(d.hasMetadata,true);
 assert.equal(d.data.rentalTerm,'short');assert.equal(d.data.shortMaxBudgetRial,'40000000');
 assert.deepEqual(gardenWantedListingPrice(d.data),{price:'40000000',priceType:'daily'});
 assert.equal(gardenRequestBudgetRows(d.data)[0].label,'حداکثر اجاره روزانه');
 assert.equal(validateGardenRequest(d.data),'');
});
test('RT03 seasonal wanted ceiling is not monthly money',()=>{
 const d=readGardenRequest(wanted('seasonal').description).data;
 assert.equal(d.seasonalMaxBudgetRial,'700000000');assert.deepEqual(gardenWantedListingPrice(d),{price:'',priceType:'negotiable'});
 assert.match(gardenRequestBudgetText(d),/هر فصل/);
});
test('RT03 long full-deposit wanted budget has no monthly asking rent',()=>{
 const d=readGardenRequest(wanted('long',{longFinancialMode:'full_deposit'}).description).data;
 assert.deepEqual(gardenWantedListingPrice(d),{price:'',priceType:'negotiable'});
 assert.deepEqual(gardenRequestBudgetRows(d).map(x=>x.label),['حداکثر رهن کامل']);
});
test('RT03 long rent-only wanted budget has no deposit',()=>{
 const d=readGardenRequest(wanted('long',{longFinancialMode:'rent_only'}).description).data;
 assert.deepEqual(gardenRequestBudgetRows(d).map(x=>x.label),['حداکثر اجاره ماهانه']);
});
test('RT03 old wanted description is preserved and term remains unknown',()=>{
 const text='یک باغ کوچک برای نگهداری نهال لازم دارم';const read=readGardenRequest(text);
 assert.equal(read.hasMetadata,false);assert.equal(read.data.rentalTerm,'');assert.equal(read.description,text);
});
test('RT03 wanted term mismatch is incompatible without owner consent',()=>{
 const r=compareSpaceListings(wanted('long'),offer(short()));assert.ok(r.conflicts.includes('garden-rental-term'));
 assert.ok(!r.conflicts.includes('rent-irr'));
});
test('RT03 different term with owner consent requires review, never auto compatible',()=>{
 const r=compareSpaceListings(wanted('long'),offer(short({canNegotiateOtherTerm:true})));
 assert.equal(r.status,'needs_details');assert.ok(r.unknown.includes('garden-alternative-term-and-pricing-review'));
 assert.ok(!r.conflicts.includes('garden-rental-term'));assert.ok(!r.matched.includes('rent-irr'));
});
test('RT03 seasonal is incompatible with both short and long even with opt-in',()=>{
 for(const term of ['short','long']){
 const r=compareSpaceListings(wanted('seasonal'),offer((term==='short'?short:long)({canNegotiateOtherTerm:true})));
 assert.ok(r.conflicts.includes('garden-rental-term'));
 }
});
test('RT03 same term + matching budget is explainable',()=>{
 const r=compareSpaceListings(wanted('short'),offer(short()));assert.ok(r.matched.includes('garden-rental-term'));assert.ok(r.matched.includes('rent-irr'));
});
test('RT03 read-only bridge treats seasonal as season and holds separate',()=>{
 const s=readRentalTermSnapshot(offer(season()));assert.equal(s.profile.primaryTerm,'seasonal');
 assert.equal(s.profile.rateUnit,'season');assert.equal(s.profile.monthlyRentRial,null);
 assert.equal(s.profile.securityHoldRial,25000000);
 assert.equal(readRentalTermSnapshot(wanted('short')).profile.rateAmountRial,null);
});
test('RT03 bridge alternative remains review-only',()=>{
 const r=inspectListingRentalAlignment(offer(short({canNegotiateOtherTerm:true})),wanted('long'));
 assert.equal(r.status,'needs_review');
});
test('RT03 other-side garden features and water survive unchanged',()=>{
 const p=toSpaceProfile(offer(short()));assert.ok(p.features.includes('water'));
 assert.equal(p.fields.gardenRentalTerm,'short');assert.equal(p.fields.canNegotiateOtherTerm,false);
});
test('RT03 safe UI wiring: both forms, cards, detail, preview and policy',()=>{
 for(const f of ['src/pages/AddParking.jsx','src/pages/EditParking.jsx']){
  const s=read(f);assert.match(s,/gardenWantedListingPrice/);assert.match(s,/gardenListingPrice/);
  assert.match(s,/GardenOfferFields/);assert.match(s,/GardenRequestFields/);
 }
 const card=read('src/components/ParkingCard.jsx'),detail=read('src/pages/ParkingDetails.jsx');
 for(const s of [card,detail]){assert.match(s,/GardenRentalBadges/);assert.match(s,/gardenRequestBudgetRows/);}
 assert.match(read('src/components/GardenOfferFields.jsx'),/اجاره هر فصل/);
 assert.match(read('src/components/GardenRequestFields.jsx'),/مدت اصلی اجاره موردنیاز/);
 assert.match(read('src/utils/spaceCompatibility.js'),/garden-alternative-term-and-pricing-review/);
});

// Exercise real backend clean and validation without DB or third-party side effects.
const controllerPath=new URL('../backend/src/controllers/spaces.controller.js',import.meta.url);
const srvRequire=createRequire(controllerPath),moduleShim={exports:{}};
runInNewContext(read('backend/src/controllers/spaces.controller.js')+'\nmodule.exports.__gardenTest={clean,validate};',{
 module:moduleShim,console,Buffer,setTimeout,
 require:(id)=>id==='../db/pool'?{query:async()=>({rows:[]})}:id.startsWith('../services/')?{}:srvRequire(id)
},{filename:controllerPath.pathname,timeout:3000});
const {clean:serverClean,validate:serverValidate}=moduleShim.exports.__gardenTest;
const body=(v,extra={})=>({listingType:'offer',category:'garden',title:'باغ درختان میوه',city:'شهرضا',area:1500,phone:'09132222453',imageUrl:'https://example.com/garden.jpg',imageUrls:['https://example.com/garden.jpg'],price:'90000000000',priceType:'yearly',description:'',spaceAttributes:makeGardenAttributes(v),...extra});

test('RT03 real server canonical short rate ignores generic forged money',()=>{
 const v=serverClean(body(short()));assert.equal(v.price,'35000000');assert.equal(v.priceType,'daily');assert.equal(serverValidate(v),'');
});
test('RT03 real server canonical seasonal rate cannot appear as monthly rent',()=>{
 const v=serverClean(body(season()));assert.equal(v.price,'');assert.equal(v.priceType,'negotiable');assert.equal(v.spaceAttributes.values.seasonalRateRial,650000000);assert.equal(serverValidate(v),'');
});
test('RT03 real server canonical long deposit+rent',()=>{
 const v=serverClean(body(long()));assert.equal(v.price,'90000000');assert.equal(v.priceType,'monthly');assert.equal(v.spaceAttributes.values.depositRial,1200000000);assert.equal(serverValidate(v),'');
});
test('RT03 real server full deposit not treated as a monthly amount',()=>{
 const v=serverClean(body(long({financialMode:'full_deposit'})));assert.equal(v.price,'');assert.equal(serverValidate(v),'');
});
test('RT03 backend rejects tampering with approved typed price',()=>{
 const v=serverClean(body(short()));v.price='3000000000';assert.match(serverValidate(v),/مبلغ/);
});
test('RT03 wanted request cannot carry fake supplied garden attributes',()=>{
 const v=serverClean(body(short(),{listingType:'wanted',description:wanted('short').description,spaceAttributes:makeGardenAttributes(short()),price:'',priceType:'negotiable',imageUrl:'',imageUrls:[]}));
 assert.equal(v.spaceAttributes?.schemaVersion,undefined);assert.equal(serverValidate(v),'');
});
