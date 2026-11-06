import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {
 RESIDENTIAL_OFFER_DEFAULT, validateResidentialOffer, residentialListingPrice,
 makeResidentialAttributes, residentialOfferFromAttributes, residentialFinancialRows,
 residentialRentalBadges
} from '../src/utils/residentialOffer.js';
import {
 EMPTY_RESIDENTIAL_REQUEST, writeResidentialRequest, readResidentialRequest,
 validateResidentialRequest, residentialRequestBudgetText, residentialRequestLegacyDetails
} from '../src/utils/residentialRequest.js';
import {toSpaceProfile} from '../src/utils/spaceProfile.js';
import {compareSpaceListings} from '../src/utils/spaceCompatibility.js';
import {readRentalTermSnapshot,inspectListingRentalAlignment} from '../src/utils/rentalTermBridge.js';
const require = createRequire(import.meta.url);
const {cleanResidentialSpaceAttributes} = require('../backend/src/utils/residentialSpaceAttributes.js');
const read = p => readFileSync(new URL('../'+p, import.meta.url),'utf8');
const detail = {propertyType:'house',deposit:'2500000000',monthlyRent:'25000000',bedrooms:'2'};
const sh = (extra={}) => ({...RESIDENTIAL_OFFER_DEFAULT,rentalTerm:'short',shortRateUnit:'night',shortRateRial:'15000000',securityHoldRial:'50000000',...extra});
const lo = (extra={}) => ({...RESIDENTIAL_OFFER_DEFAULT,rentalTerm:'long',financialMode:'deposit_rent',...extra});
const attrs = (o,d=detail) => cleanResidentialSpaceAttributes(makeResidentialAttributes(o,d),'residential','offer');
const offerListing=(o,d=detail,extra={})=>({listingType:'offer',category:'residential',city:'شهرضا',area:100,
 residentialDetails:{...d},spaceAttributes:attrs(o,d),...extra});
const wantedListing=(d,extra={})=>({listingType:'wanted',category:'residential',city:'شهرضا',area:95,
 description:writeResidentialRequest({propertyType:'house',minArea:'70',maxArea:'120',minBedrooms:'2',...d}),...extra});
const shortWanted={...EMPTY_RESIDENTIAL_REQUEST,propertyType:'house',rentalTerm:'short',shortRateUnit:'night',shortMaxBudgetRial:'20000000',minArea:'60'};

test('RT01 short residential offer can be saved independently of long mortgage fields',()=>{
 assert.equal(validateResidentialOffer(sh(),detail,100),'');
 assert.deepEqual(residentialListingPrice(sh(),detail),{price:'15000000',priceType:'daily'});
 assert.deepEqual(residentialListingPrice(sh({shortRateUnit:'week',shortRateRial:'40000000'}),detail),{price:'40000000',priceType:'weekly'});
 assert.deepEqual(residentialListingPrice(sh({shortRateUnit:'month',shortRateRial:'120000000'}),detail),{price:'120000000',priceType:'monthly'});
});
test('RT01 short offer requires a real rate and valid unit but not a long finance mode',()=>{
 assert.match(validateResidentialOffer(sh({shortRateRial:''}),detail,100),/قیمت/);
 assert.match(validateResidentialOffer(sh({shortRateUnit:'year'}),detail,100),/دوره/);
 assert.match(validateResidentialOffer(sh({shortRateRial:'-10'}),detail,100),/قیمت/);
 assert.match(validateResidentialOffer(sh(),detail,0),/متراژ/);
});
test('RT01 server whitelist separates short rate, damages and long finance',()=>{
 const a=attrs(sh({canNegotiateOtherTerm:true}));
 assert.equal(a.values.rentalTerm,'short');
 assert.equal(a.values.financialMode,null);
 assert.equal(a.values.shortRateRial,15000000);
 assert.equal(a.values.securityHoldRial,50000000);
 assert.equal(a.values.canNegotiateOtherTerm,true);
 const b=attrs(lo({canNegotiateOtherTerm:false}));
 assert.equal(b.values.rentalTerm,'long');
 assert.equal(b.values.shortRateRial,null);
 assert.equal(b.values.securityHoldRial,null);
 assert.equal(b.values.financialMode,'deposit_rent');
});
test('RT01 server ignores forged short price and forged consent types',()=>{
 const data=makeResidentialAttributes(sh(),detail);
 data.values.shortRateRial='nonsense';data.values.securityHoldRial='-999';data.values.canNegotiateOtherTerm='true';data.values.admin=true;
 const v=cleanResidentialSpaceAttributes(data,'residential','offer').values;
 assert.equal(v.shortRateRial,null);assert.equal(v.securityHoldRial,null);
 assert.equal(v.canNegotiateOtherTerm,false);assert.equal(v.admin,undefined);
});
test('RT01 edit hydration retains short term, rate and negotiated conversion',()=>{
 const o=sh({canNegotiateOtherTerm:true,shortRateUnit:'week'});
 const restored=residentialOfferFromAttributes(attrs(o),{deposit:0,monthlyRent:0});
 assert.equal(restored.rentalTerm,'short');assert.equal(restored.canNegotiateOtherTerm,true);
 assert.equal(restored.shortRateUnit,'week');assert.equal(restored.shortRateRial,'15000000');
 assert.equal(restored.securityHoldRial,'50000000');
});
test('RT01 preexisting typed long residential remains long, unknown untyped has no badges',()=>{
 const legacy={schemaVersion:1,category:'residential',values:{financialMode:'full_deposit'}};
 assert.equal(residentialOfferFromAttributes(legacy,detail).rentalTerm,'long');
 assert.deepEqual(residentialRentalBadges(legacy).map(x=>x.state),['primary','inactive']);
 assert.deepEqual(residentialRentalBadges(null),[]);
});
test('RT01 card state: primary two checks and approved alternative exactly one, otherwise disabled',()=>{
 assert.deepEqual(residentialRentalBadges(attrs(sh({canNegotiateOtherTerm:true}))).map(x=>x.state),['primary','possible']);
 assert.deepEqual(residentialRentalBadges(attrs(sh({canNegotiateOtherTerm:false}))).map(x=>x.state),['primary','inactive']);
 assert.equal(residentialRentalBadges(attrs(lo()))[0].label,'بلندمدت');
});
test('RT01 detail rows short term never display phantom lease deposit/monthly rent',()=>{
 const rows=residentialFinancialRows(detail,attrs(sh()));
 assert.deepEqual(rows.map(x=>x.label),['اجاره شبانه','ودیعه / ضمانت خسارت (قابل استرداد طبق توافق)']);
 assert.ok(rows[0].amount.includes('۱۵'));assert.ok(rows[1].amount.includes('۵۰'));
 assert.equal(rows.some(x=>x.label.includes('رهن')),false);
});
test('RT01 short demand writes structured max budget without stale long money',()=>{
 const txt=writeResidentialRequest({...shortWanted,paymentType:'both',deposit:'1000000000',monthlyRent:'20000000'});
 const obj=readResidentialRequest(txt);
 assert.equal(obj.hasMetadata,true);assert.equal(obj.data.rentalTerm,'short');
 assert.equal(obj.data.shortRateUnit,'night');assert.equal(obj.data.shortMaxBudgetRial,'20000000');
 assert.equal(obj.data.deposit,'');assert.equal(obj.data.monthlyRent,'');
 assert.equal(residentialRequestLegacyDetails(obj.data).monthlyRent,'');
 assert.match(residentialRequestBudgetText(obj.data),/بودجه تا/);
});
test('RT01 short wanted validation rejects unknown unit and zero budget',()=>{
 assert.equal(validateResidentialRequest(shortWanted),'');
 assert.match(validateResidentialRequest({...shortWanted,shortMaxBudgetRial:''}),/سقف بودجه/);
 assert.match(validateResidentialRequest({...shortWanted,shortRateUnit:'year'}),/دوره/);
});
test('RT01 short wanted period and max budget are read as ceiling not asking price',()=>{
 const wanted=wantedListing(shortWanted);
 const p=toSpaceProfile(wanted);
 assert.equal(p.fields.residentialRentalTerm,'short');
 assert.equal(p.maxRentRial,20000000);assert.equal(p.maxDepositRial,null);
 assert.equal(p.pricePeriod,'daily');
 const snap=readRentalTermSnapshot(wanted);
 assert.equal(snap.profile.primaryTerm,'short');assert.equal(snap.profile.rateUnit,'night');
 assert.equal(snap.profile.rateAmountRial,null);
});
test('RT01 offers short rate plus damage hold but no lease deposit in common profile',()=>{
 const p=toSpaceProfile(offerListing(sh()));
 assert.equal(p.fields.rentalTerm,'short');assert.equal(p.rentRial,15000000);
 assert.equal(p.depositRial,null);assert.equal(p.pricePeriod,'daily');
 assert.equal(p.fields.securityHoldRial,50000000);
 const snapshot=readRentalTermSnapshot(offerListing(sh()));
 assert.equal(snapshot.profile.primaryTerm,'short');
 assert.equal(snapshot.profile.leaseDepositRial,null);
 assert.equal(snapshot.profile.securityHoldRial,50000000);
});
test('RT01 short wanted matched to short offer under same unit (only typed compatibility)',()=>{
 const a=compareSpaceListings(wantedListing(shortWanted),offerListing(sh()));
 assert.equal(a.status,'compatible');
 assert.ok(a.matched.includes('residential-rental-term'));
});
test('RT01 mismatched term without owner approval is incompatible',()=>{
 const a=compareSpaceListings(wantedListing(shortWanted),offerListing(lo()));
 assert.equal(a.status,'incompatible');assert.ok(a.conflicts.includes('residential-rental-term'));
});
test('RT01 mismatched term with explicit owner approval is review-only, no alternate price comparison',()=>{
 const o=offerListing(lo({canNegotiateOtherTerm:true}));
 const a=compareSpaceListings(wantedListing(shortWanted),o);
 assert.equal(a.status,'needs_details');
 assert.ok(a.unknown.includes('residential-alternative-term-price-and-contract-review'));
 assert.ok(!a.matched.includes('rent-irr'));
 const s=inspectListingRentalAlignment(o,wantedListing(shortWanted));
 assert.equal(s.status,'needs_review');assert.equal(s.reason,'alternative_requires_owner_agreement');
 assert.equal(s.liveMatchingUpdated,false);
});
test('RT01 do not compare night and week budgets without negotiation',()=>{
 const a=compareSpaceListings(wantedListing({...shortWanted,shortRateUnit:'week'}),offerListing(sh()));
 assert.equal(a.status,'needs_details');assert.ok(a.unknown.includes('price-period'));
});
test('RT01 old unknown term never silently declares a confirmed match',()=>{
 const legacyWanted={listingType:'wanted',category:'residential',city:'شهرضا',
 description:`[FAZAJOO_RESIDENTIAL_REQUEST:${encodeURIComponent(JSON.stringify({propertyType:'house',minArea:'70',monthlyRent:'30000000'}))}]`};
 const result=compareSpaceListings(legacyWanted,offerListing(lo()));
 assert.ok(result.unknown.includes('residential-term-unknown'));
});
test('RT01 price wiring persists both active scenarios via add/edit flows',()=>{
 for(const f of ['src/pages/AddParking.jsx','src/pages/EditParking.jsx']){
  const s=read(f);
  assert.match(s,/residentialRequest\.rentalTerm === "short"/);
  assert.match(s,/residentialRequest\.shortMaxBudgetRial/);
  assert.match(s,/residentialListingPrice\(form\.residentialOffer,form\.residentialDetails\)/);
 }
 const c=read('backend/src/controllers/spaces.controller.js');
 assert.match(c,/shortResidential/);assert.match(c,/residentialWantedShortBudget/);
 assert.match(c,/d\.deposit \|\| d\.monthlyRent \|\| v\.financialMode/);
});
test('RT01 cards and details render residential badges & typed financial rows',()=>{
 for(const f of ['src/components/ParkingCard.jsx','src/pages/ParkingDetails.jsx']){
  const s=read(f);
  assert.match(s,/ResidentialRentalBadges/);assert.match(s,/residentialFinancialRows/);
 }
 const s=read('src/components/ResidentialRentalBadges.jsx');
 assert.match(s,/state === "primary"/);assert.match(s,/state === "possible"/);
});
test('RT01 forms expose separate short/long controls and opt-in only to offer',()=>{
 const a=read('src/components/ResidentialFields.jsx');
 const b=read('src/components/ResidentialRequestFields.jsx');
 assert.match(a,/shortRateRial/);assert.match(a,/securityHoldRial/);assert.match(a,/canNegotiateOtherTerm/);
 assert.match(b,/shortMaxBudgetRial/);assert.match(b,/rentalTerm/);
 assert.ok(!b.includes('canNegotiateOtherTerm'));
});

// Test actual backend clean/validate without connecting to PostgreSQL or object storage.
// All external services are stubbed; real local sanitizer modules are used.
import {runInNewContext} from 'node:vm';
import {createRequire as createModuleRequire} from 'node:module';
const backendPath = new URL('../backend/src/controllers/spaces.controller.js', import.meta.url);
const serviceFreeRequire = createModuleRequire(backendPath);
const controllerModule = {exports:{}};
runInNewContext(read('backend/src/controllers/spaces.controller.js') + '\nmodule.exports.__rtTest={clean,validate};', {
 module:controllerModule, console, Buffer, setTimeout,
 require:(name)=>name === '../db/pool' ? {query:async()=>({rows:[]})} : name.startsWith('../services/') ? {} : serviceFreeRequire(name)
}, {filename:backendPath.pathname,timeout:2000});
const {clean:cleanBackend,validate:validateBackend}=controllerModule.exports.__rtTest;
const image='https://example.com/rt01.jpg';
const body=(o,details=detail,extra={})=>({listingType:'offer',category:'residential',title:'خانه تست استاندارد',city:'شهرضا',area:100,
 imageUrl:image,imageUrls:[image],phone:'09132222453',price:'99999999999',priceType:'monthly',
 residentialDetails:details,spaceAttributes:makeResidentialAttributes(o,details),description:'',...extra});

test('RT01 backend clean+validate short offer ignores forged generic monthly price and zeroes long money',()=>{
 const v=cleanBackend(body(sh()));
 assert.equal(v.price,'15000000');assert.equal(v.priceType,'daily');
 assert.equal(v.residentialDetails.deposit,0);assert.equal(v.residentialDetails.monthlyRent,0);
 assert.equal(v.spaceAttributes.values.securityHoldRial,50000000);
 assert.equal(validateBackend(v),'');
});
test('RT01 backend clean+validate long residence still enforces separate deposit and monthly rent',()=>{
 const v=cleanBackend(body(lo()));
 assert.equal(v.price,'25000000');assert.equal(v.priceType,'monthly');
 assert.equal(v.residentialDetails.deposit,2500000000);
 assert.equal(v.residentialDetails.monthlyRent,25000000);
 assert.equal(validateBackend(v),'');
});
test('RT01 backend typed full-deposit offer has no fake rent',()=>{
 const d={...detail,monthlyRent:''};
 const v=cleanBackend(body(lo({financialMode:'full_deposit'}),d));
 assert.equal(v.price,'');assert.equal(v.priceType,'negotiable');
 assert.equal(validateBackend(v),'');
});
test('RT01 backend wanted short uses exact structured budget with zero long-term amounts',()=>{
 const req={...shortWanted,propertyType:'house'};
 const v=cleanBackend(body(sh(),detail,{listingType:'wanted',price:'20000000',priceType:'daily',
 imageUrl:'',imageUrls:[],residentialDetails:residentialRequestLegacyDetails(req),spaceAttributes:null,
 description:writeResidentialRequest(req)}));
 assert.equal(v.price,'20000000');assert.equal(v.priceType,'daily');
 assert.equal(v.residentialDetails.deposit,0);assert.equal(v.residentialDetails.monthlyRent,0);
 assert.equal(validateBackend(v),'');
});
test('RT01 backend rejects forged wanted short period/price vs description',()=>{
 const req={...shortWanted,propertyType:'house'};
 const base=body(sh(),detail,{listingType:'wanted',price:'20000000',priceType:'daily',imageUrl:'',imageUrls:[],
 residentialDetails:residentialRequestLegacyDetails(req),spaceAttributes:null,description:writeResidentialRequest(req)});
 assert.match(validateBackend({...cleanBackend(base),price:'25000000'}),/بودجه/);
 assert.match(validateBackend({...cleanBackend(base),priceType:'weekly'}),/بودجه/);
});
