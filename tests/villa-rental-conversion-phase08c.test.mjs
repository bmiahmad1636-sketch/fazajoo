import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {VILLA_OFFER_DEFAULT,makeVillaAttributes,villaOfferFromAttributes,villaRentalBadges,villaListingPrice,villaFinancialRows} from '../src/utils/villaOffer.js';
import {EMPTY_VILLA_REQUEST,writeVillaRequest} from '../src/utils/villaRequest.js';
import {compareSpaceListings} from '../src/utils/spaceCompatibility.js';
const require=createRequire(import.meta.url);
const {cleanVillaSpaceAttributes}=require('../backend/src/utils/villaSpaceAttributes.js');
const villaDetails={capacity:6,bedrooms:2,pool:false,parking:true};
const short={...VILLA_OFFER_DEFAULT,accommodationType:'villa',privacy:'private',rentalTerm:'short',availableStays:['daily']};
const long={...VILLA_OFFER_DEFAULT,accommodationType:'villa',privacy:'private',rentalTerm:'long',financialMode:'deposit_rent',longDepositRial:'2000000000',longMonthlyRentRial:'50000000'};
const clean=o=>cleanVillaSpaceAttributes(makeVillaAttributes(o,villaDetails),'villa','offer',villaDetails);
const offered=(o, price,priceType)=>({listingType:'offer',category:'villa',city:'رامسر',area:150,price,priceType,villaDetails,spaceAttributes:clean(o)});
const wanted=(rentTerm)=>({listingType:'wanted',category:'villa',city:'رامسر',description:writeVillaRequest({...EMPTY_VILLA_REQUEST,accommodationType:'villa',guests:'2',rentalTerm:rentTerm,
  ...(rentTerm==='long'?{financialMode:'rent_only',maxBudget:'40000000',pricePeriod:'monthly'}:{stayType:'daily',maxBudget:'20000000',pricePeriod:'daily'})})});

test('Phase08C: old listings have no implied willingness to convert',()=>{
 assert.equal(VILLA_OFFER_DEFAULT.canNegotiateOtherTerm,false);
 const o=clean(short);
 assert.equal(o.values.canNegotiateOtherTerm,false);
 assert.equal(villaOfferFromAttributes(o).canNegotiateOtherTerm,false);
 assert.deepEqual(villaRentalBadges(o).map(x=>x.state),['primary','inactive']);
 assert.deepEqual(villaRentalBadges({}),[]);
});
test('Phase08C: explicit owner opt-in persists and edit hydration sees it',()=>{
 const o=clean({...short,canNegotiateOtherTerm:true});
 assert.equal(o.values.canNegotiateOtherTerm,true);
 assert.equal(villaOfferFromAttributes(o).canNegotiateOtherTerm,true);
 assert.deepEqual(villaRentalBadges(o).map(x=>[x.label,x.state]),[['کوتاه‌مدت','primary'],['بلندمدت','possible']]);
});
test('Phase08C: long-term primary and short-term possibility reverse labels consistently',()=>{
 const rows=villaRentalBadges(clean({...long,canNegotiateOtherTerm:true}));
 assert.deepEqual(rows.map(x=>[x.label,x.state]),[['بلندمدت','primary'],['کوتاه‌مدت','possible']]);
 assert.deepEqual(villaRentalBadges(clean(long)).map(x=>x.state),['primary','inactive']);
});
test('Phase08C: server accepts only boolean true, unknown fields never survive',()=>{
 const bad=makeVillaAttributes(short,villaDetails);
 bad.values.canNegotiateOtherTerm='true'; bad.values.negotiatedPrice=1;bad.values.canPublishSecondListing=true;
 const cleaned=cleanVillaSpaceAttributes(bad,'villa','offer',villaDetails);
 assert.equal(cleaned.values.canNegotiateOtherTerm,false);
 assert.equal(cleaned.values.negotiatedPrice,undefined);
 assert.equal(cleaned.values.canPublishSecondListing,undefined);
 assert.deepEqual(cleanVillaSpaceAttributes(bad,'villa','wanted',villaDetails),{});
});
test('Phase08C: ability to negotiate another term does not fabricate price or a second contract',()=>{
 const withConsent={...long,canNegotiateOtherTerm:true};
 const noConsent={...long,canNegotiateOtherTerm:false};
 assert.deepEqual(villaListingPrice(withConsent,'10000000','daily'),villaListingPrice(noConsent,'10000000','daily'));
 assert.deepEqual(villaFinancialRows(clean(withConsent),'50000000','monthly'),villaFinancialRows(clean(noConsent),'50000000','monthly'));
});
test('Phase08C: proposed long-term alternative is review-only, never automatically compatible',()=>{
 const result=compareSpaceListings(wanted('long'),offered({...short,canNegotiateOtherTerm:true},'15000000','daily'));
 assert.equal(result.status,'needs_details');
 assert.ok(result.unknown.includes('villa-alternative-term-price-and-contract-review'));
 assert.ok(!result.conflicts.includes('villa-rental-term'));
 assert.ok(!result.matched.includes('rent-irr'));
});
test('Phase08C: proposed short-term alternative is review-only, without false stay conflict',()=>{
 const result=compareSpaceListings(wanted('short'),offered({...long,canNegotiateOtherTerm:true},'50000000','monthly'));
 assert.equal(result.status,'needs_details');
 assert.ok(result.unknown.includes('villa-alternative-term-price-and-contract-review'));
 assert.ok(!result.conflicts.includes('villa-stay'));
});
test('Phase08C: without consent different rental terms still conflict',()=>{
 const result=compareSpaceListings(wanted('short'),offered(long,'50000000','monthly'));
 assert.equal(result.status,'incompatible');
 assert.ok(result.conflicts.includes('villa-rental-term'));
});
test('Phase08C: real city or accommodation incompatibility remains a conflict even with consent',()=>{
 const o=offered({...long,canNegotiateOtherTerm:true},'50000000','monthly');
 o.city='اهواز';
 const result=compareSpaceListings(wanted('short'),o);
 assert.equal(result.status,'incompatible');
 assert.ok(result.conflicts.includes('city'));
});
test('Phase08C: edit begins with safe complete villaOffer state, avoiding white screen',()=>{
 const edit=readFileSync(new URL('../src/pages/EditParking.jsx',import.meta.url),'utf8');
 assert.match(edit,/villaOffer:\s*\{\.\.\.VILLA_OFFER_DEFAULT,availableStays:\[\],extraFeatures:\[\]\}/);
});
test('Phase08C: detail summary uses villa financial rows instead of generic amount',()=>{
 const detail=readFileSync(new URL('../src/pages/ParkingDetails.jsx',import.meta.url),'utf8');
 assert.match(detail,/villaPriceRows\.length\s*\?\s*\(\s*<ShopMoneyRows items=\{villaPriceRows\} compact/);
});
test('Phase08C: offer opt-in and two listing surfaces remain wired',()=>{
 const fields=readFileSync(new URL('../src/components/VillaOfferFields.jsx',import.meta.url),'utf8');
 assert.match(fields,/checked=\{value\.canNegotiateOtherTerm===true\}/);
 assert.match(fields,/rentalTerm:id,canNegotiateOtherTerm:false/);
 const card=readFileSync(new URL('../src/components/ParkingCard.jsx',import.meta.url),'utf8');
 const details=readFileSync(new URL('../src/pages/ParkingDetails.jsx',import.meta.url),'utf8');
 assert.ok(card.includes('<VillaRentalBadges attributes={parking?.spaceAttributes} compact />'));
 assert.ok(details.includes('<VillaRentalBadges attributes={parking?.spaceAttributes} />'));
});
