import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const jsx = read('src/pages/ParkingDetails.jsx');
const css = read('src/pages/ParkingDetailsEditorialDS11.css');
const ds10 = read('src/pages/ParkingDetailsVisualRefreshDS10.css');
const ds08 = read('src/pages/ParkingDetailsGalleryDS08.css');
test('DS11 is layered after validated DS08 and DS10 and scoped to details page',()=>{
 const imports = ['ParkingDetails.css','ParkingDetailsGalleryDS08.css','ParkingDetailsVisualRefreshDS10.css','ParkingDetailsEditorialDS11.css'];
 const positions=imports.map(x=>jsx.indexOf(`import "./${x}";`));
 assert.ok(positions.every(x=>x>=0));
 assert.ok(positions.every((x,i)=>i===0 || x>positions[i-1]));
 assert.match(css,/\.parking-details-page/);
 assert.doesNotMatch(css,/(?:^|\n)\s*(?:body|html|:root|\.container|\*)\s*\{/);
 assert.match(ds10,/DS-10/);
});
test('DS11 balanced fact grids and four responsive widths preserve flowing content',()=>{
 for (const rule of ['repeat(3,minmax(0,1fr))','repeat(2,minmax(0,1fr))','max-width:1000px','max-width:760px','max-width:560px','max-width:390px','align-items:start','min-height:44px']) assert.ok(css.includes(rule),rule);
 assert.doesNotMatch(css,/display:\s*none\s*!important|text-overflow:\s*ellipsis|line-clamp|overflow:\s*hidden\s*!important/);
});
test('DS11 does not mutate protected behavior and DS08 keeps contain images',()=>{
 for(const marker of ['getSpaceContact','getFavoriteStatus','TrustSafetyActions','NeshanApproximateMap','setIsGalleryOpen(true)','showPreviousImage()','showNextImage()','handleDelete','handleEdit','to={`/chat/${parking.id}`}','parking.video?.url','category === "garden"','category === "villa"','category === "residential"']) assert.ok(jsx.includes(marker),marker);
 assert.match(ds08,/object-fit: contain/);
});
