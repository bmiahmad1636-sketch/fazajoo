import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { footerLinks, showPublicFooter } from '../src/components/footerFT01.js';
import { footerContent, resolveFooterContent } from '../src/config/footerContent.js';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const app = read('src/App.jsx');
const component = read('src/components/SiteFooterFT01.jsx');
const css = read('src/components/SiteFooterFT01.css');
const routes = new Set([...app.matchAll(/\bpath="([^"]+)"/g)].map(m => m[1]));
const roles = [ {}, {user:{id:1}}, {user:{id:1}, userProfile:{accountType:'agent',agencyStatus:'approved'}}, {user:{id:1},userProfile:{accountType:'agent',agencyStatus:'pending'}}, {user:{id:1},userProfile:{systemRole:'admin'}}, {user:{id:1},userProfile:{accountType:'agent',agencyStatus:'approved'},profileLoading:true} ];

test('public browse routes only, including parameter routes and trailing slashes', () => {
  for (const path of ['/', '/parking', '/parking/', '/parking/42', '/parking/abc/', '/agency-profile/12', '/Parking/abc']) assert.equal(showPublicFooter(path), true, path);
});
test('account, admin, chat, auth, forms and unrelated paths excluded', () => {
  for (const path of [...routes].filter(p => !['/', '/parking','/parking/:id','/agency-profile/:userId'].includes(p))) assert.equal(showPublicFooter(path.replace(/:[^/]+/g,'123')),false,path);
  for (const path of ['/parking/1/other','/agency-profile','/parking-other','/unknown',null]) assert.equal(showPublicFooter(path), false, String(path));
});
test('all links match existing routes for every role', () => {
  for (const role of roles) for (const {to,label} of Object.values(footerLinks(role)).flat()) { assert.ok(routes.has(to),to); assert.ok(label.trim()); }
  assert.ok(routes.has('/'));
});
test('guest uses real login/register and no private account shortcuts', () => {
  const links = footerLinks().services.map(l=>l.to);
  assert.deepEqual(links,['/agency-access','/login','/register']);
});
test('approved agent only gets approved agent shortcut', () => {
  assert.equal(footerLinks(roles[2]).services[0].to,'/agency');
  for (const i of [0,1,3,4,5]) assert.equal(footerLinks(roles[i]).services[0].to,'/agency-access');
  assert.equal(footerLinks({userProfile:{accountType:'agent',agencyStatus:'approved'}}).services[0].to,'/agency-access');
});
test('authenticated shortcuts and actual listing entry point', () => {
  assert.deepEqual(footerLinks(roles[1]).services.slice(1).map(l=>l.to),['/account','/my-parkings']);
  assert.ok(footerLinks().browse.some(l=>l.to==='/add-parking'));
  assert.match(read('src/pages/AddParking.jsx'), /listingType:\s*"wanted"/);
});
test('one footer outside Routes, no replacement of route guards', () => {
  assert.equal([...app.matchAll(/<SiteFooterFT01\b/g)].length,1);
  assert.match(app, /<\/Routes>\s*<SiteFooterFT01 user=\{user\} userProfile=\{userProfile\} profileLoading=\{profileLoading\}/);
  assert.match(component,/if \(!showPublicFooter\(pathname\)\) return null/);
});
test('semantic footer, original local logo, no external links or dummy targets', () => {
  assert.match(component,/<footer className="fj-ft01" dir="rtl"/);
  assert.match(component,/<nav className="fj-ft01__nav" aria-label=\{title\}/);
  assert.match(component,/src="\/fazajoo-logo.png"/);
  assert.ok(existsSync(new URL('../public/fazajoo-logo.png',import.meta.url)));
  assert.doesNotMatch(component,/href="|https?:\/\/|mailto:|tel:/);
  assert.match(component,/if \(!item.ready\) return/);
  assert.match(component,/rel="noopener noreferrer"/);
});
test('ordinary footer links scroll to top, modified clicks remain unhandled', () => {
  assert.match(component,/event\.button === 0/);
  for(const key of ['metaKey','altKey','ctrlKey','shiftKey','defaultPrevented']) assert.match(component,new RegExp('!event\\.'+key));
  assert.doesNotMatch(component,/preventDefault\(/);
  assert.match(component,/type="button" onClick=\{scrollToTop\}/);
});
test('CSS is scoped with responsive breakpoints and keyboard focus', () => {
  const selectors = [...css.matchAll(/([^{}]+)\{/g)].map(m => m[1].replace(/\/\*[\s\S]*?\*\//g,'').trim());
  for(const selector of selectors) if(!selector.startsWith('@media')) for(const part of selector.split(',')) assert.ok(part.trim().startsWith('.fj-ft01'),part);
  assert.match(css,/@media \(max-width: 860px\)/);
  assert.match(css,/@media \(max-width: 480px\)/);
  assert.match(css,/:focus-visible/);
  assert.doesNotMatch(css,/position:\s*(fixed|sticky)/);
});

const copyContent = () => structuredClone(footerContent);
test('development displays all pending placeholders without URLs, real logos or fake details', () => {
  const result = resolveFooterContent({development:true});
  assert.deepEqual(Object.values(result).map(v=>v.length),[6,3,2]);
  for (const item of Object.values(result).flat()) {
    assert.equal(item.ready,false);
    assert.deepEqual(Object.keys(item).sort(),['id','label','ready']);
  }
  assert.match(component,/جایگاه نمادین · هنوز فعال نیست/);
  assert.match(component,/<FooterPublicInformation development=\{import.meta.env.DEV\}/);
});
test('production hides all pending slots, with explicit optional preview switch', () => {
  assert.deepEqual(resolveFooterContent(),{pages:[],contacts:[],licenses:[]});
  const content=copyContent(); content.showPendingInProduction=true;
  assert.equal(resolveFooterContent({content}).licenses.length,2);
});
test('future approved content activates from configuration without changing component', () => {
  const content=copyContent();
  Object.assign(content.pages[0],{status:'ready',path:'/about'});
  Object.assign(content.contacts[0],{status:'ready',value:'+98 21 12345678'});
  Object.assign(content.contacts[1],{status:'ready',value:'support@example.test'});
  Object.assign(content.contacts[2],{status:'ready',value:'Test address'});
  Object.assign(content.licenses[0],{status:'ready',verificationUrl:'https://example.test/check?id=42',imagePath:'/images/licenses/enamad.png'});
  const result=resolveFooterContent({content});
  assert.equal(result.pages[0].path,'/about');
  assert.equal(result.contacts[0].href,'tel:+982112345678');
  assert.equal(result.contacts[1].href,'mailto:support@example.test');
  assert.equal(result.contacts[2].value,'Test address');
  assert.equal(result.licenses[0].href,'https://example.test/check?id=42');
  assert.equal(result.licenses[0].imagePath,'/images/licenses/enamad.png');
  assert.equal(result.licenses.length,1);
});
test('invalid ready values fail closed in production and do not become links in development', () => {
  for (const path of ['', '//evil.test','/../admin','/admin','/account','javascript:alert(1)','https://evil.test','/\\evil.test']) {
    const content=copyContent(); Object.assign(content.pages[0],{status:'ready',path});
    assert.equal(resolveFooterContent({content}).pages.length,0);
    assert.equal(resolveFooterContent({content,development:true}).pages[0].ready,false);
  }
  for (const verificationUrl of ['', 'http://example.test','javascript:alert(1)','https://user:pass@example.test','//example.test']) {
    const content=copyContent(); Object.assign(content.licenses[0],{status:'ready',verificationUrl});
    assert.equal(resolveFooterContent({content}).licenses.length,0);
  }
  const content=copyContent();
  Object.assign(content.contacts[0],{status:'ready',value:'not a phone'});
  Object.assign(content.contacts[1],{status:'ready',value:'a@b.test?subject=spam'});
  Object.assign(content.licenses[0],{status:'ready',verificationUrl:'https://example.test',imagePath:'https://evil.test/a.png'});
  const result=resolveFooterContent({content});
  assert.equal(result.contacts.length,0);
  assert.equal(result.licenses[0].imagePath,null);
});
test('pending markup is not interactive; ready links use the correct renderers', () => {
  const pending=component.slice(component.indexOf('function FooterPending'),component.indexOf('function FooterLicense'));
  const license=component.slice(component.indexOf('function FooterLicense'),component.indexOf('function FooterPublicInformation'));
  assert.doesNotMatch(pending,/<a\b|<Link\b|<button\b|onClick=|tabIndex=/);
  assert.doesNotMatch(license.split('  return (\n    <a')[0],/<a\b|<Link\b|<button\b|onClick=|tabIndex=/);
  assert.match(component,/item.ready \? <Link to=\{item.path\}/);
  assert.match(component,/href=\{item.href\}/);
  assert.match(component,/if \(!pages.length && !contacts.length && !licenses.length\) return null/);
});
test('any activated internal page must have a real route, and configured local license image must exist', () => {
  const ready=resolveFooterContent();
  for(const item of ready.pages) assert.ok(routes.has(item.path),item.path);
  for(const item of ready.licenses) if(item.imagePath) assert.ok(existsSync(new URL('../public'+item.imagePath,import.meta.url)),item.imagePath);
});

test('reserved policy routes automatically receive footer only after activation', () => {
  const content=copyContent();
  assert.equal(showPublicFooter('/about',content),false);
  content.pages[0].status='ready';
  assert.equal(showPublicFooter('/about/',content),true);
  assert.equal(showPublicFooter('/ABOUT',content),true);
  content.pages[0].path='/admin';
  assert.equal(showPublicFooter('/admin',content),false);
});
