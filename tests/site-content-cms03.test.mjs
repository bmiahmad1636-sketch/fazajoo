import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const jsx=readFileSync(new URL('../src/pages/AdminSiteContentCMS01.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/pages/SiteContentCMS01.css',import.meta.url),'utf8');
const scoped=css.split('/* CMS03:')[1].split('*/')[1];
test('preview is a native modal, closes on button and Escape, and cleans up on unmount',()=>{
 assert.match(jsx,/dialog\.showModal\(\)/);assert.match(jsx,/if\(dialog\.open\)dialog\.close\(\)/);assert.match(jsx,/<dialog ref=\{dialogRef\}[^>]+aria-labelledby="cms03-preview-title" onCancel=\{e=>\{e\.preventDefault\(\);onClose\(\);\}\}/);assert.match(jsx,/onClick=\{onClose\}>بستن<\/button>/);assert.match(jsx,/onClick=\{\(\)=>setPreview\(true\)\}/);assert.match(jsx,/<Preview doc=\{draft\} open=\{preview\} onClose=\{\(\)=>setPreview\(false\)\}/);
});
test('preview is bounded to viewport with an independent scroll area and fixed header',()=>{
 assert.match(scoped,/\.cms01-preview-dialog\{[^}]*max-height:calc\(100dvh - 32px\)/);assert.match(scoped,/\.cms01-preview-dialog\[open\]\{display:flex;flex-direction:column\}/);assert.match(scoped,/\.cms03-preview-body\{[^}]*overflow:auto;overscroll-behavior:contain;min-height:0/);assert.match(scoped,/\.cms03-preview-head\{[^}]*flex:none/);
});
test('page selector only filters visible fieldsets; save still submits full draft',()=>{
 assert.match(jsx,/footerContent\.pages\.map/);assert.match(jsx,/value=\{pageId\} onChange=\{e=>setPageId\(e\.target\.value\)\}/);assert.match(jsx,/filter\(\(\{id\}\)=>tab!=='pages'\|\|id===pageId\)/);assert.match(jsx,/value=\{item\.body\} onChange=\{e=>update\(tab,id,\{body:e\.target\.value\}\)\}/);assert.match(jsx,/saveSiteContent\(state\.version,draft\)/);assert.match(jsx,/publishSiteContent\(state\.version\)/);
});
test('all new styles are limited to the CMS admin page, and mobile grid stacks',()=>{
 assert.ok(scoped);const selectors=[...scoped.matchAll(/(?:^|[{}])\s*([^{}]+)\{/g)].map(m=>m[1].trim()).filter(s=>!s.startsWith('@media'));assert.ok(selectors.length>20);for(const s of selectors)assert.match(s,/^\.cms01-admin\b/);assert.match(scoped,/@media\(max-width:760px\)[\s\S]*?\.cms01-admin \.cms03-fields\{grid-template-columns:1fr\}/);
});
test('audit remains available with all records but is collapsed by default',()=>{
 assert.match(jsx,/<details className="cms01-audit"><summary>[^<]+<span>\(\{state\.audit\.length\}\)/);assert.match(jsx,/state\.audit\.map\(item=>/);assert.match(scoped,/\.cms01-audit ul\{max-height:240px;overflow-y:auto/);
});
