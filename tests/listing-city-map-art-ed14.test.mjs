import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { myListingDemandArt } from "../src/utils/myListingDemandArtED14.js";
import { GENERAL_ART, getUnifiedCardModel } from "../src/utils/unifiedCardModel.js";
import { writeOtherRequest, readOtherRequest } from "../src/utils/otherRequest.js";
import { animateCityFlight } from "../src/utils/mapCityFlight.js";
import { cityMapScrollOffset } from "../src/utils/revealCityMapED14.js";
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g,"\n");
const hash = s => createHash("sha256").update(s).digest("hex");
for (const category of [...Object.keys(GENERAL_ART),"warehouse"]) {
 test(`request art ${category}: same as public card, asset exists, offer remains untouched`, () => {
   const listing = {category,listingType:"wanted",title:"درخواست فضا",imageUrl:"not-the-art.jpg"};
   const art = myListingDemandArt(listing);
   assert.equal(art, category === "warehouse" ? "/images/fj-industrial-demand.webp" : getUnifiedCardModel(listing).image);
   assert.ok(existsSync(new URL(`../public${art}`,import.meta.url)));
   assert.equal(myListingDemandArt({...listing,listingType:"offer"}),null);
 });
}
for (const [title,kind] of [["استخر پرورش ماهی","aquaculture"],["گاوداری بزرگ","livestock"],["گلخانه","greenhouse"],["باشگاه ورزشی","sports"],["قالیشویی","workshop"],["سالن همایش","events"],["مهد کودک","care"],["بارانداز","logistics"]]) {
 test(`other demand art ${kind} matches public card`,()=>{
   const listing={category:"other",listingType:"wanted",title};
   const art=myListingDemandArt(listing);
   assert.equal(art,`/images/fj-demand-other-${kind}.svg`);
   assert.equal(art,getUnifiedCardModel(listing).image);
   assert.ok(existsSync(new URL(`../public${art}`,import.meta.url)));
 });
}
test("other-space metadata classification matches public card",()=>{
 const listing={category:"other",listingType:"wanted",title:"فضای موردنیاز",description:writeOtherRequest({requestText:"گلخانه"})};
 const data=readOtherRequest(listing.description).data;
 assert.equal(myListingDemandArt(listing),getUnifiedCardModel(listing,{request:data}).image);
 assert.equal(myListingDemandArt(listing),"/images/fj-demand-other-greenhouse.svg");
 assert.equal(myListingDemandArt({category:"unknown",listingType:"wanted"}),GENERAL_ART.other);
});
test("request media branch is first, public pages remain independent and reduced motion honored",()=>{
 const s=read("src/pages/MyParkings.jsx"), css=read("src/pages/MyParkingsDemandArtED14.css");
 assert.match(s,/\{demandArt \? \([\s\S]*?\) : parking.imageUrl \? \(/);
 assert.match(css,/prefers-reduced-motion:reduce/); assert.match(css,/animation:none/);
 assert.match(css,/object-fit:contain/);assert.match(css,/7s ease-in-out infinite alternate/);
});
function mapMock(zoom=12) { const calls=[], events=new Map(); return {calls,getZoom:()=>zoom,stop:()=>calls.push(["stop"]),on:(e,f)=>events.set(e,f),off:e=>events.delete(e),easeTo:o=>calls.push(["easeTo",o]),flyTo:o=>calls.push(["flyTo",o]),jumpTo:o=>calls.push(["jumpTo",o]),finish:()=>events.get("moveend")?.()}; }
test("two-phase journey doubles durations without changing destination or zoom",()=>{
 const map=mapMock();const destination=[51.4,35.7];animateCityFlight(map,destination);assert.equal(map.calls.find(x=>x[0]==="easeTo")[1].duration,1300);map.finish();const options=map.calls.find(x=>x[0]==="flyTo")[1];assert.equal(options.duration,3400);assert.deepEqual(options.center,destination);assert.equal(options.zoom,12);assert.equal(1300+3400,4700);
});
test("direct flight and reduced motion remain safe",()=>{const map=mapMock(3);animateCityFlight(map,[51,35]);assert.equal(map.calls.find(x=>x[0]==="flyTo")[1].duration,3400);const reduced=mapMock();animateCityFlight(reduced,[51,35],{reducedMotion:true});assert.ok(reduced.calls.some(x=>x[0]==="jumpTo"));assert.ok(!reduced.calls.some(x=>x[0]==="flyTo"||x[0]==="easeTo"));});
test("cancellation prevents stale second phase",()=>{const map=mapMock();const cancel=animateCityFlight(map,[51,35]);cancel();map.finish();assert.ok(!map.calls.some(x=>x[0]==="flyTo"));});
test("city and map stay adjacent in registration and all edit forms",()=>{
 const add=read("src/pages/AddParking.jsx"),edit=read("src/pages/EditParking.jsx");
 for(const [source,widgets] of [[add,["ParkingOfferFields","ParkingRequestDetailsFields","WarehouseRequestFields","ShedRequestFields","LandRentalFields","ResidentialRequestFields","VillaRequestFields","GardenRequestFields","ShopRequestFields","OtherRequestFields"]],[edit,["ParkingOfferFields","ParkingRequestDetailsFields","WarehouseRequestFields","ShedRequestFields","LandRentalFields","ResidentialRequestFields","VillaRequestFields","GardenRequestFields","ShopRequestFields","OtherRequestFields"]]]) {
  const city=source.indexOf("<IranCityAutocomplete"),map=source.indexOf("<NeshanLocationPicker");assert.ok(city>=0&&map>city);assert.equal((source.match(/<NeshanLocationPicker/g)||[]).length,1);for(const widget of widgets)assert.ok(source.indexOf(`<${widget}`,map)>map,widget); assert.match(source,/onSelect=\{revealSelectedCity\}/);assert.match(source,/cityFlightDelay=\{850\}/);
 }
 assert.match(edit,/appearance="edit"/);
});
test("scroll keeps city and map in view when possible, prioritizes map on small screens",()=>{
 assert.equal(cityMapScrollOffset({top:150},{top:220,bottom:480},768,80),0);
 assert.equal(cityMapScrollOffset({top:500},{top:650,bottom:900},768,80),408);
 assert.equal(cityMapScrollOffset({top:120},{top:400,bottom:700},550,80),308);
 assert.equal(cityMapScrollOffset({top:-80},{top:120,bottom:360},550,80),-172);
});
test("saved pin is not cleared or moved by city selection; pending flight is cancelled on manual input",()=>{
 const p=read("src/components/NeshanLocationPicker.jsx"); const part=p.slice(p.indexOf("const savedLng = value?.lng;"),p.indexOf("}, [city, status, savedLat, savedLng, cityFlightDelay]);"));
 assert.ok(part.indexOf("if (hasSavedPoint) return undefined;")<part.indexOf("lastFormCityRef.current = name;"));assert.match(part,/pendingCityFlightRef.current = delay/);assert.doesNotMatch(part,/onChangeRef\.current|drawPoint\(/);assert.match(p,/window.clearTimeout\(pendingCityFlightRef.current\)/);assert.match(p,/stopCityFlight\(\);\s*map.panBy/);
});
test("all existing edit handlers, validation and specialist request fields are byte-identical to ED13",()=>{
 const s=read("src/pages/EditParking.jsx");const start=s.indexOf("  const handleChange = (event) => {");const end=s.indexOf("  if (!parking) {",s.indexOf("  const saveEdit = async"));assert.equal(hash(s.slice(start,end)),"44dd81d0d90053159510864cc703aba68b06adb749feecbebe0a9c5067b31854");
 const wanted=s.indexOf('                                     {isWanted && parking?.category === "parking" && (');const wantedEnd=s.indexOf("\n                  </div>\n                </section>",wanted);assert.equal(hash(s.slice(wanted,wantedEnd)),"7698e4ab135dd1a348b8ef14a0a35498616c1d5da6bceaf0554dcb467e49b7a9");
 assert.equal(hash(read("src/pages/EditParkingPremiumED11.css")),"68cafac4553ea3d732793b2c8869886939d50abdbdeed9089c9440a35dd3d148");
});
