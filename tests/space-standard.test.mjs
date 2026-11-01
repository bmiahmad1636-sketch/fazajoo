import { test } from "node:test";
import assert from "node:assert/strict";
import { SPACE_STANDARD_V1, numericOrNull, normalizeCity, readDemandMetadata, toSpaceProfile } from "../src/utils/spaceProfile.js";
import { compareSpaceProfiles, compareSpaceListings } from "../src/utils/spaceCompatibility.js";
const tagged = (key, data) => `[FAZAJOO_${key}:${encodeURIComponent(JSON.stringify(data))}]`;
const offer = (category, rest = {}) => ({ listingType: "offer", category, city: "شهرضا", area: 20, price: "۱٬۰۰۰٬۰۰۰", priceType: "monthly", ...rest });
const wanted = (category, request, key, rest = {}) => ({ listingType: "wanted", category, city: "شهرضا", description: tagged(key, request), ...rest });
const attrs = (category, values) => ({ schemaVersion: 1, category, values });

test("contract includes every currently supported category", () => {
  assert.equal(SPACE_STANDARD_V1.schemaVersion, 1);
  assert.deepEqual(Object.keys(SPACE_STANDARD_V1.categories).sort(), ["parking", "storage", "warehouse", "land", "shop", "garden", "villa", "residential", "other"].sort());
});
test("fa and arabic digits, decimals and invalid input", () => {
  assert.equal(numericOrNull("۱۲٬۵۰۰"), 12500);
  assert.equal(numericOrNull("٣٫٥"), 3.5);
  assert.equal(numericOrNull("۱۲.۵"), 12.5);
  assert.equal(numericOrNull("0"), null);
  assert.equal(numericOrNull(""), null);
  assert.equal(numericOrNull("20abc"), null);
  assert.equal(numericOrNull(false), null);
  assert.equal(normalizeCity("شهر شهرضا"), "شهرضا");
});
test("parking demand: paired Persian legacy usage tag + encoded details", () => {
  const d = `[کاربری پارکینگ: خودرو]\n${tagged("PARKING_REQUEST", {minArea:"۱۲", maxArea:"۲۴", cover:"covered", access:"daytime"})}`;
  const m = readDemandMetadata("parking", d);
  assert.equal(m.vehicleUsage, "car");
  assert.equal(m.cover, "covered");
  const p = toSpaceProfile({listingType:"wanted", category:"parking", description:d});
  assert.equal(p.minAreaSqm,12); assert.equal(p.maxAreaSqm,24);
  assert.equal(p.fields.access, "daytime");
});
test("malformed tag stays unknown and does not crash", () => {
  assert.equal(readDemandMetadata("storage", "[FAZAJOO_WAREHOUSE_REQUEST:%%%]"), null);
  assert.equal(toSpaceProfile({category:"storage",listingType:"wanted",description:"[FAZAJOO_WAREHOUSE_REQUEST:%%%]"}).hasStructuredDetails, false);
});
test("old offer must not invent parking type or access", () => {
  const p = toSpaceProfile(offer("parking"));
  assert.equal(p.fields.cover, undefined); assert.equal(p.areaSqm,20);
  assert.equal(p.rentRial,1000000);
  assert.equal(p.hasStructuredDetails,false);
});
test("source category/schema mismatched extra attributes ignored", () => {
  assert.equal(toSpaceProfile(offer("parking",{spaceAttributes:attrs("storage",{cover:"covered"})})).fields.cover, undefined);
  assert.equal(toSpaceProfile(offer("parking",{spaceAttributes:{schemaVersion:300,category:"parking", values:{cover:"covered"}}})).fields.cover, undefined);
});
test("typed parking supply matches cover, access, usage and area", () => {
  const w = {listingType:"wanted",category:"parking",city:"شهرضا",description:`[کاربری پارکینگ: خودرو]\n${tagged("PARKING_REQUEST",{minArea:"12",maxArea:"30",cover:"covered",access:"daytime"})}`};
  const o = offer("parking",{spaceAttributes:attrs("parking",{vehicleUsage:"both",cover:"covered",access:"anytime"})});
  const result = compareSpaceListings(w,o);
  assert.equal(result.status,"compatible");
  assert.ok(result.matched.includes("parking-vehicle"));
  assert.ok(result.matched.includes("parking-access"));
});
test("old parking offer against strict demand: needs details, not incompatible", () => {
  const w = {listingType:"wanted", category:"parking", city:"شهرضا",description:tagged("PARKING_REQUEST",{cover:"covered"})};
  const result = compareSpaceListings(w,offer("parking"));
  assert.equal(result.status,"needs_details");
  assert.ok(result.unknown.includes("parking-cover"));
});
test("explicit parking cover conflict is incompatible", () => {
  const w = wanted("parking",{cover:"covered"},"PARKING_REQUEST");
  const o = offer("parking",{spaceAttributes:attrs("parking",{cover:"open"})});
  assert.equal(compareSpaceListings(w,o).status,"incompatible");
});
test("missing demand budget cannot be read as price=0", () => {
  const profile = toSpaceProfile(wanted("storage",{purpose:"personal",spaceType:"indoor"},"WAREHOUSE_REQUEST",{price:"",priceType:"negotiable"}));
  assert.equal(profile.maxRentRial,null);
  assert.equal(profile.pricePeriod,null);
});
test("price periods cannot be compared by number alone", () => {
  const w = wanted("garden",{minArea:"10",maxBudget:"1000000",pricePeriod:"daily"},"GARDEN_REQUEST");
  const o = offer("garden",{price:"2000000",priceType:"monthly"});
  const result = compareSpaceListings(w,o);
  assert.equal(result.status,"needs_details");
  assert.ok(result.unknown.includes("price-period"));
  assert.ok(!result.conflicts.includes("rent-irr"));
});
test("monthly rent over ceiling is incompatible when periods match", () => {
  const w = wanted("garden",{maxBudget:"1000000",pricePeriod:"monthly"},"GARDEN_REQUEST");
  assert.ok(compareSpaceListings(w,offer("garden",{price:"1500000"})).conflicts.includes("rent-irr"));
});
test("residential deposit and rent are separate, not mixed", () => {
  const w = wanted("residential",{propertyType:"apartment", minArea:"60",maxArea:"100",paymentType:"both", deposit:"3000000000",monthlyRent:"20000000"},"RESIDENTIAL_REQUEST");
  const o = offer("residential",{area:80,residentialDetails:{propertyType:"apartment",deposit:2000000000,monthlyRent:25000000,bedrooms:2}});
  const result = compareSpaceListings(w,o);
  assert.equal(result.status,"incompatible");
  assert.ok(result.conflicts.includes("rent-irr"));
  assert.ok(result.matched.includes("deposit-irr"));
});
test("residential legacy offer missing bedrooms remains unknown", () => {
  const w = wanted("residential",{minBedrooms:"3"},"RESIDENTIAL_REQUEST");
  const o = offer("residential",{residentialDetails:{propertyType:"apartment"}});
  assert.ok(compareSpaceListings(w,o).unknown.includes("bedrooms"));
});
test("industrial demand with height requirement is assessed from typed offer", () => {
  const w = wanted("warehouse",{spaceType:"shed",minHeight:"۵",power:"three",access:"truck"},"SHED_REQUEST");
  const o = offer("warehouse",{spaceAttributes:attrs("warehouse",{spaceType:"shed",heightM:6,power:"three",vehicleAccess:"trailer"})});
  assert.equal(compareSpaceListings(w,o).status,"compatible");
  assert.ok(compareSpaceListings(w,offer("warehouse")).unknown.includes("industrial-min-height"));
});
test("feature requirement against legacy false/absent is unknown, not negative", () => {
  const w = wanted("villa",{amenities:["pool"]},"VILLA_REQUEST");
  const result = compareSpaceListings(w,offer("villa",{villaDetails:{pool:false}}));
  assert.equal(result.status,"needs_details");
  assert.ok(result.unknown.includes("feature:pool"));
});
test("hectare area from demand converted safely into sqm", () => {
  const w = wanted("land",{minArea:"2",maxArea:"3",areaUnit:"hectare"},"LAND_RENTAL");
  const p=toSpaceProfile(w);
  assert.equal(p.minAreaSqm,20000);assert.equal(p.maxAreaSqm,30000);
  assert.ok(compareSpaceListings(w,offer("land",{area:15000})).conflicts.includes("min-area"));
});
test("unrelated categories are incompatible and invalid directions rejected", () => {
  const w=toSpaceProfile(wanted("parking",{},"PARKING_REQUEST"));
  assert.equal(compareSpaceProfiles(w,toSpaceProfile(offer("garden"))).status,"incompatible");
  assert.equal(compareSpaceProfiles(w,w).status,"invalid");
});
test("other space requests must be reviewed even if city matches", () => {
  assert.equal(compareSpaceListings(wanted("other",{requestText:"محوطه تمرین"},"OTHER_WANTED"),offer("other")).status,"needs_details");
});
test("unstructured wanted area treated as approximate, not strict equality", () => {
  const p=toSpaceProfile({listingType:"wanted",category:"storage",city:"شهرضا",area:150,priceType:"monthly",price:1000,description:"انبار می‌خواهم"});
  assert.equal(p.minAreaSqm,null);assert.equal(p.maxAreaSqm,null);
  assert.equal(p.fields.approximateAreaSqm,150);
});

test("known purpose of storage cannot silently pass without owner confirmation", () => {
  const w=wanted("storage",{purpose:"commercial",spaceType:"indoor"},"WAREHOUSE_REQUEST");
  const o=offer("storage",{spaceAttributes:attrs("storage",{spaceType:"indoor"})});
  const result=compareSpaceListings(w,o);
  assert.equal(result.status,"needs_details");
  assert.ok(result.unknown.includes("storage-purpose"));
});
test("commercial transfer kind is reviewed when offer details are missing", () => {
  const w=wanted("shop",{transferType:"key_money"},"SHOP_REQUEST");
  assert.ok(compareSpaceListings(w,offer("shop")).unknown.includes("shop-transfer"));
});
test("residential floor preference and special parking uses demand review", () => {
  const w1=wanted("residential",{floorPreference:"ground"},"RESIDENTIAL_REQUEST");
  assert.ok(compareSpaceListings(w1,offer("residential")).unknown.includes("residential-floor-review"));
  const w2={listingType:"wanted",category:"parking",city:"شهرضا",description:"[کاربری پارکینگ: سایر - نگهداری دوچرخه]"};
  assert.ok(compareSpaceListings(w2,offer("parking")).unknown.includes("parking-special-usage-review"));
});
test("PII is absent from normalized profile", () => {
  const p=toSpaceProfile(offer("parking", {phone:"09120000000", location:{lat:32.01,lng:51.88},ownerId:"sensitive"}));
  assert.ok(!("phone" in p));assert.ok(!("location" in p));assert.ok(!("ownerId" in p));
});
