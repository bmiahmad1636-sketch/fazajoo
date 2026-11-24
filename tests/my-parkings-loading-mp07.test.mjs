import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const read = p => readFileSync(new URL("../"+p,import.meta.url),"utf8").replace(/^\uFEFF/,"").replace(/\r\n/g,"\n");
const jsx=read("src/pages/MyParkings.jsx");
const css=read("src/pages/MyParkingsLoadingMP07.css");
const hash = s => createHash("sha256").update(s).digest("hex");
test("MP07 keeps the actual hero rather than replacing the page with a loading h1",()=>{
 assert.doesNotMatch(jsx,/if\s*\(loading\)\s*\{/);
 assert.doesNotMatch(jsx,/<h1>\s*در حال دریافت آگهی‌ها\s*<\/h1>/);
 assert.match(jsx,/if \(!user && !loading\)/);
 assert.match(jsx,/<h1>\s*آگهی‌های من\s*<\/h1>/);
});
test("MP07 exposes busy and status without fake data or a fake empty state",()=>{
 assert.match(jsx,/role="status">در حال دریافت آگهی‌ها/);
 assert.match(jsx,/aria-busy=\{loading\}/);
 assert.equal((jsx.match(/disabled=\{loading\}/g)||[]).length,5);
 assert.equal((jsx.match(/loading \? <span className="mp07-count-placeholder"/g)||[]).length,4);
 assert.match(jsx,/\{loading \? \([\s\S]*?mp07-loading-grid" aria-hidden="true"[\s\S]*?\) : parkings.length ===/);
});
test("MP07 preserves real data loading, filtering and status changes byte-for-byte",()=>{
 const start=jsx.indexOf("  useEffect(() => {");
 const end=jsx.indexOf("  if (!user && !loading)",start);
 assert.equal(hash(jsx.slice(start,end)), "fb643b6f1f13fad392ae00ed17b4a40a9f539d213b25845055f9e2d9071409e6");
});
test("MP07 preserves real listing card rendering byte-for-byte",()=>{
 const start=jsx.indexOf("          ) : filteredParkings.length");
 assert.equal(hash(jsx.slice(start)), "e4d31079003980a99c3f72614f33e5d82b91df5c5b9469c40f6cff0d491df5ab");
});
test("MP07 reuses approved responsive card sizes and respects reduced motion",()=>{
 assert.match(jsx,/import "\.\/MyParkingsDemandArtED14\.css";\s*import "\.\/MyParkingsLoadingMP07\.css";/);
 assert.match(css,/@media\(max-width:1330px\)/);
 assert.match(css,/@media\(max-width:840px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*animation:none/);
 assert.doesNotMatch(css,/position:fixed|@import|url\(https?:|\.favorites-page/);
});
