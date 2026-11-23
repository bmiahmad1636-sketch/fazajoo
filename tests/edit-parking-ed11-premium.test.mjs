import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g,'\n');
const page = read('src/pages/EditParking.jsx');
const css = read('src/pages/EditParkingPremiumED11.css');
const hash = str => createHash('sha256').update(str).digest('hex');
test('ED11 plus ED14 approved city-map layout matches the reviewed source', () => {
 assert.equal(hash(page), '99b8d97484f2a52c4b46dd87de5ed15061725de563f3ee4bd072bc751f3ed128');
});
test('stylesheet only applies to the dedicated edit page root', () => {
 const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
 for(const line of stripped.split('\n').map(s=>s.trim()).filter(s=>s.startsWith('.'))) assert.ok(line.startsWith('.edit-parking-page.edit-parking-ed11'),line);
 assert.doesNotMatch(css,/\.add-parking-page/);
});
test('direct child finance and technical panels receive styling',()=>{
 assert.match(css,/\.edit-parking-form > \.fj-pr > \.fj-pr-heading/);
 assert.match(css,/\.edit-parking-form > \.fj-po \.fj-po-header/);
 assert.match(css,/\.fj-pr-money input/);
});
test('sticky preview and narrow layout are not replaced by a fixed panel',()=>{
 assert.match(css,/@media\(max-width:1050px\)/);
 assert.doesNotMatch(css,/position:\s*fixed/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
});
test('focus and invalid fields remain visibly distinguishable',()=>{
 assert.match(css,/\[aria-invalid="true"\]/);
 assert.match(css,/:focus-visible/);
 assert.doesNotMatch(css,/\.edit-parking-error\s*\{[^}]*display:\s*none/);
});
