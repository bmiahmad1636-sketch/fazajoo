import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  RESIDENTIAL_OFFER_DEFAULT, validateResidentialOffer, makeResidentialAttributes,
  residentialOfferFromAttributes, residentialListingPrice, residentialFinancialRows,
  residentialMoneyDisplay, residentialMoneyDigits,
} from "../src/utils/residentialOffer.js";
import { writeResidentialRequest } from "../src/utils/residentialRequest.js";
import { compareSpaceListings } from "../src/utils/spaceCompatibility.js";
const require = createRequire(import.meta.url);
const { cleanResidentialSpaceAttributes } = require("../backend/src/utils/residentialSpaceAttributes.js");
const offer = (financialMode = "deposit_rent", extra = {}) => ({ ...RESIDENTIAL_OFFER_DEFAULT, financialMode, ...extra });
const details = (extra = {}) => ({ propertyType: "apartment", deposit: "1000000000", monthlyRent: "20000000", bedrooms: "2", ...extra });
const valid = (mode = "deposit_rent", d = details()) => validateResidentialOffer(offer(mode), d, 85);
const encoded = (o, d) => cleanResidentialSpaceAttributes(makeResidentialAttributes(o, d), "residential", "offer");
const listing = (a, d, extra = {}) => ({ listingType: "offer", category: "residential", city: "اصفهان", area: 85,
  residentialDetails: d, spaceAttributes: a, price: d.monthlyRent || "", priceType: d.monthlyRent ? "monthly" : "negotiable", ...extra });

test("residential supply has three distinct financial modes", () => {
  assert.equal(valid(), "");
  assert.equal(valid("full_deposit", details({ monthlyRent: "" })), "");
  assert.equal(valid("rent_only", details({ deposit: "" })), "");
  assert.match(valid("", details()), /روش/);
  assert.match(valid("full_deposit", details({ deposit: "" , monthlyRent: ""})), /ودیعه/);
  assert.match(valid("rent_only", details({ deposit: "", monthlyRent: "" })), /اجاره/);
  assert.match(valid("rent_only"), /ودیعه/);
  assert.match(valid("full_deposit"), /اجاره/);
});
test("typed supply requires a real area and handles other subtype without inventing attributes", () => {
  assert.match(validateResidentialOffer(offer(), details(), 0), /متراژ/);
  assert.match(validateResidentialOffer(offer(), details({propertyType:"other"}), 90), /سایر/);
  assert.equal(validateResidentialOffer(offer("rent_only", {otherType:"یک واحد مخصوص اقامت"}), details({propertyType:"other",deposit:""}), 90), "");
  assert.equal(validateResidentialOffer(offer(), details({propertyType:"room",bedrooms:""}), 90), "");
  assert.match(validateResidentialOffer(offer(), details({propertyType:"office"}), 90), /نوع ملک/);
});
test("Persian and Arabic digits are normalized without turning deposit into rent", () => {
  assert.equal(residentialMoneyDigits("۱٬۲۰۰٬۰۰۰"), "1200000");
  assert.equal(residentialMoneyDisplay("١٢٠٠٠٠٠"), "1,200,000");
  assert.deepEqual(residentialListingPrice(offer("full_deposit"), details({monthlyRent:""})), {price:"",priceType:"negotiable"});
  assert.deepEqual(residentialListingPrice(offer("deposit_rent"), details()), {price:"20000000",priceType:"monthly"});
});
test("public rows display only actual money and never fake zero rent", () => {
  const full = details({monthlyRent:""});
  assert.deepEqual(residentialFinancialRows(full, encoded(offer("full_deposit"), full)).map(x=>x.label), ["رهن کامل"]);
  const rentOnly = details({deposit:""});
  assert.deepEqual(residentialFinancialRows(rentOnly, encoded(offer("rent_only"), rentOnly)).map(x=>x.label), ["اجاره ماهانه"]);
  assert.deepEqual(residentialFinancialRows(details(), encoded(offer(), details())).map(x=>x.label), ["ودیعه", "اجاره ماهانه"]);
  assert.equal(residentialFinancialRows({deposit:"",monthlyRent:""}, null).length,0);
});
test("legacy residential amounts survive editor fallback, without fabricating a mode", () => {
  assert.equal(residentialOfferFromAttributes(null,details()).financialMode,"deposit_rent");
  assert.equal(residentialOfferFromAttributes(null,details({monthlyRent:""})).financialMode,"full_deposit");
  assert.equal(residentialOfferFromAttributes({},details({deposit:""})).financialMode,"rent_only");
  assert.equal(residentialOfferFromAttributes({},details({deposit:"",monthlyRent:""})).financialMode,"");
  assert.deepEqual(residentialFinancialRows(details(),{}).map(x=>x.label), ["ودیعه","اجاره ماهانه"]);
});
test("server only accepts whitelisted supply attributes and rejects wanted stamping", () => {
  const a = makeResidentialAttributes(offer("rent_only",{features:["yard","admin"]}),details({propertyType:"house",deposit:""}));
  a.values.admin=true; a.values.features.push("fake","elevator");
  const cleaned=cleanResidentialSpaceAttributes(a,"residential","offer");
  assert.equal(cleaned.values.admin,undefined);
  assert.deepEqual(cleaned.values.features,["yard"]);
  assert.deepEqual(cleanResidentialSpaceAttributes(a,"residential","wanted"),{});
  assert.deepEqual(cleanResidentialSpaceAttributes(a,"garden","offer"),{});
  assert.deepEqual(cleanResidentialSpaceAttributes({schemaVersion:1,category:"residential",values:[]},"residential","offer"),{});
});
test("yard only applies to house or villa, and subtype is cleared when inapplicable",()=>{
  assert.deepEqual(makeResidentialAttributes(offer("deposit_rent",{features:["yard"]}),details()).values.features,[]);
  assert.deepEqual(makeResidentialAttributes(offer("deposit_rent",{features:["yard"]}),details({propertyType:"villa"})).values.features,["yard"]);
  assert.equal(makeResidentialAttributes(offer("deposit_rent",{otherType:"wrong"}),details()).values.otherType,"");
  assert.equal(makeResidentialAttributes(offer("deposit_rent",{otherType:"فضای مسکونی خاص"}),details({propertyType:"other"})).values.otherType,"فضای مسکونی خاص");
});
test("demand comparisons recognize room and real yard, while missing legacy yard stays unknown",()=>{
  const d=details({propertyType:"house"});
  const wanted={listingType:"wanted",category:"residential",city:"اصفهان",description:writeResidentialRequest({propertyType:"house",minArea:"60",maxArea:"120",minBedrooms:"2",paymentType:"both",deposit:"2000000000",monthlyRent:"30000000",features:["yard"]})};
  const good=compareSpaceListings(wanted,listing(encoded(offer("deposit_rent",{features:["yard"]}),d),d));
  assert.ok(good.matched.includes("feature:yard"));
  const legacy=compareSpaceListings(wanted,listing({},d));
  assert.ok(legacy.unknown.includes("feature:yard"));
  const roomWanted={listingType:"wanted",category:"residential",city:"اصفهان",description:writeResidentialRequest({propertyType:"room",minArea:"15",paymentType:"rent",monthlyRent:"20000000"})};
  const roomD=details({propertyType:"room",deposit:"",monthlyRent:"10000000",bedrooms:""});
  const matched=compareSpaceListings(roomWanted,listing(encoded(offer("rent_only"),roomD),roomD));
  assert.ok(matched.matched.includes("residential-type"));
});
test("other residential labels require manual review even when both use other ID",()=>{
  const d=details({propertyType:"other"});
  const offered=listing(encoded(offer("deposit_rent",{otherType:"سوئیت در مجتمع کارگاهی"}),d),d);
  const wanted={listingType:"wanted",category:"residential",city:"اصفهان",description:writeResidentialRequest({propertyType:"other",otherType:"خوابگاه",minArea:"50",paymentType:"both",deposit:"2000000000",monthlyRent:"30000000"})};
  const result=compareSpaceListings(wanted,offered);
  assert.ok(result.unknown.includes("residential-other-type-review"));
  assert.ok(!result.matched.includes("residential-type"));
});
