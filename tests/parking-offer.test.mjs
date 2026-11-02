import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  PARKING_OFFER_DEFAULT, validateParkingOffer, makeParkingAttributes,
  parkingOfferFormFromAttributes,
} from "../src/utils/parkingOffer.js";
import { compareSpaceListings } from "../src/utils/spaceCompatibility.js";
import { toSpaceProfile } from "../src/utils/spaceProfile.js";
const require = createRequire(import.meta.url);
const { cleanParkingSpaceAttributes } = require("../backend/src/utils/parkingSpaceAttributes.js");
const good = { ...PARKING_OFFER_DEFAULT, vehicleUsage:"car", cover:"covered", access:"anytime", parkingStyle:"independent",entranceHeightCm:"۲۱۰",securityFeatures:["camera","guard"],usageNotes:"" };
const wanted = (detail) => ({listingType:"wanted",category:"parking",city:"شهرضا",description:`[کاربری پارکینگ: خودرو]\n[FAZAJOO_PARKING_REQUEST:${encodeURIComponent(JSON.stringify(detail))}]`});
const offer = (attrs) => ({listingType:"offer",category:"parking",city:"شهرضا",area:18,price:"10000000",priceType:"monthly",spaceAttributes:attrs});
test("essential offer choices are required",()=>{
 for(const [field,expected] of [["vehicleUsage","نوع استفاده"],["cover","پارکینگ"],["access","دسترسی"]]) {
  const x={...good,[field]:""};
  assert.ok(validateParkingOffer(x).includes(expected),field);
 }
 assert.equal(validateParkingOffer({...good,entranceHeightCm:"210"}),"");
});
test("other use requires a meaningful note",()=>{
 assert.ok(validateParkingOffer({...good,vehicleUsage:"other",usageNotes:""}));
 assert.equal(validateParkingOffer({...good,vehicleUsage:"other",usageNotes:"پارک دوچرخه",entranceHeightCm:"210"}),"");
});
test("optional height validation only checks covered parking",()=>{
 assert.ok(validateParkingOffer({...good,entranceHeightCm:"99"}));
 assert.equal(validateParkingOffer({...good,cover:"open",entranceHeightCm:"999"}),"");
});
test("offer serialization is category tagged, versioned and independent of description",()=>{
 const data=makeParkingAttributes({...good,entranceHeightCm:"210"});
 assert.deepEqual({schemaVersion:data.schemaVersion,category:data.category},{schemaVersion:1,category:"parking"});
 assert.deepEqual(data.values.securityFeatures,["camera","guard"]);
 assert.equal(data.values.entranceHeightCm,210);
 assert.equal(parkingOfferFormFromAttributes(data).vehicleUsage,"car");
});
test("open parking ignores an irrelevant covered entrance height",()=>{
 const data=makeParkingAttributes({...good,cover:"open"});
 assert.equal(data.values.entranceHeightCm,null);
});
test("server removes forged keys and unknown feature codes",()=>{
 const data=makeParkingAttributes({...good,entranceHeightCm:"210"});
 data.values.securityFeatures.push("forged","camera");
 data.values.ownerPhone="sensitive";
 const cleaned=cleanParkingSpaceAttributes(data,"parking","offer");
 assert.deepEqual(cleaned.values.securityFeatures,["camera","guard"]);
 assert.equal(cleaned.values.ownerPhone,undefined);
 assert.equal(cleanParkingSpaceAttributes(data,"parking","wanted").schemaVersion,undefined);
 assert.deepEqual(cleanParkingSpaceAttributes(data,"storage","offer"),{});
});
test("new typed parking offers have usable profile semantics",()=>{
 const typed=cleanParkingSpaceAttributes(makeParkingAttributes({...good,entranceHeightCm:"210"}),"parking","offer");
 const profile=toSpaceProfile(offer(typed));
 assert.equal(profile.fields.cover,"covered");
 assert.equal(profile.fields.access,"anytime");
 assert.equal(profile.fields.entranceHeightCm,210);
 assert.equal(profile.hasStructuredDetails,true);
 const result=compareSpaceListings(wanted({cover:"covered",access:"daytime",minArea:"12",maxArea:"20"}),offer(typed));
 assert.equal(result.status,"compatible");
});
test("an explicitly wrong parking cover is incompatible, unknown legacy stays unknown",()=>{
 const typed=cleanParkingSpaceAttributes(makeParkingAttributes({...good,cover:"open"}),"parking","offer");
 assert.equal(compareSpaceListings(wanted({cover:"covered"}),offer(typed)).status,"incompatible");
 assert.equal(compareSpaceListings(wanted({cover:"covered"}),offer({})).status,"needs_details");
});
