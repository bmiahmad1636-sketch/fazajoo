import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const jsx=read('src/pages/AgencyAccess.jsx'), css=read('src/pages/AgencyAccess.css');
test('all seven original form fields remain present',()=>{for(const name of ['agencyName','agentName','city','address','phone','nationalId','licenseNumber']) assert.ok(jsx.includes(`name="${name}"`));});
test('three original document types and formats remain',()=>{for(const name of ['national_card_front','national_card_back','business_license']) assert.ok(jsx.includes(name));assert.ok(jsx.includes('accept="image/jpeg,image/png,image/webp"'));});
test('existing validation, submit and status branches remain',()=>{for(const name of ['validateIranianNationalId','validateForm','handleSubmit','isPending','needsRevision','isRejected','isApprovedAgent','allDocumentsSelected']) assert.ok(jsx.includes(name));});
test('scoped AU02 styling and mobile layout present',()=>{assert.match(css,/AU02 — compact professional/);assert.match(css,/@media\(max-width:560px\)/);assert.match(css,/\.agency-access \.agency-access__form-card \{order:1;\}/);assert.match(css,/\.agency-access \.agency-access__documents \{grid-template-columns:minmax\(0,1fr\);\}/);});
