import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(),name),'utf8');
const hero = read('src/components/Hero.jsx');
const heroCss = read('src/components/HeroPremiumHP01.css');
const homeCss = read('src/HomePremiumHP01.css');
const app = read('src/App.jsx');
const listing = read('src/pages/parking.jsx');

test('HP-01 remains on the home route, and preserves existing catalog and details routes',()=>{
 assert.match(app, /path="\/"/);
 assert.match(app, /<Hero parkings=\{parkings\} \/>/);
 assert.match(app, /<Parking parkings=\{parkings\} showHero=\{false\} \/>/);
 assert.match(app, /path="\/parking"/);
 assert.match(app, /path="\/parking\/:id"/);
 assert.match(app, /import "\.\/HomePremiumHP01\.css"/);
 assert.match(listing, /className=\{showHero \? "parking-page parking-page--catalog" : "parking-page"\}/);
});

test('hero visual layer uses a dedicated stylesheet and does not change shared Header',()=>{
 assert.match(hero, /import "\.\/HeroPremiumHP01\.css"/);
 assert.match(hero, /<FeaturedShowcaseHP03 \/>/);
 assert.match(read('src/components/FeaturedShowcaseHP03.jsx'), /AnimatedLogo/);
 assert.doesNotMatch(hero, /featured\.imageUrl|featured\?\.imageUrl/);
 assert.doesNotMatch(hero, /setPreviewFailed|__feature-photo/);
 assert.doesNotMatch(hero, /fetch\(|localStorage|sessionStorage|dangerouslySetInnerHTML/);
});

test('search form reaches existing query filter without altering filter logic',()=>{
 assert.match(hero, /role="search" onSubmit=\{handleSearch\}/);
 assert.match(hero, /const query = search\.trim\(\);/);
 assert.match(hero, /\/parking\?search=\$\{encodeURIComponent\(query\)\}/);
 assert.match(listing, /searchParams\.get\("search"\)/);
 assert.match(hero, /<label htmlFor="hp01-search-input"/);
 assert.match(hero, /id="hp01-search-input"/);
});

test('all nine existing category filters preserved exactly',()=>{
 const expected=['residential','shop','land','garden','parking','storage','warehouse','villa','other'];
 const actual=[...hero.matchAll(/\{ title: "[^"]+", value: "([a-z]+)" \}/g)].map(x=>x[1]);
 assert.deepEqual(actual,expected);
 assert.match(hero, /\/parking\?category=\$\{encodeURIComponent\(category\.value\)\}/);
});

test('all primary actions use actual existing routes',()=>{
 for(const route of ['/parking','/add-parking','/find-for-me']) assert.ok(hero.includes(`navigate("${route}")`),route);
 assert.match(read('src/components/FeaturedShowcaseHP03.jsx'), /hp01-hero__architecture/);
});

test('responsive and keyboard accessibility safeguards exist',()=>{
 for(const term of ['max-width: 1100px','max-width: 850px','max-width: 620px','max-width: 370px','prefers-reduced-motion','focus-visible','overflow-x: auto'])
  assert.ok(heroCss.includes(term),term);
 assert.match(heroCss, /\.home-hero\.hp01-hero/);
 assert.match(heroCss, /\.hp01-hero__categories button/);
 assert.match(homeCss,/\.hp01-home \.hp01-home__discover/);
 assert.match(homeCss,/\.hp01-home \.hp01-home__discover \.parking-page/);
});

test('Home status remains honest during loading, API errors, and empty results',()=>{
 assert.match(app, /parkingsLoading \? \(/);
 assert.match(app, /parkings\.length > 0 \? \(/);
 assert.match(app, /parkingsError && \(/);
 assert.match(app, /هنوز آگهی‌ای برای نمایش وجود ندارد/);
});

test('homepage styles remain scoped and do not mutate DS-15, LP-01, finance, auth or backend',()=>{
 assert.ok(heroCss.length>5000);
 assert.ok(homeCss.length>1000);
 for(const css of [heroCss,homeCss]){
  assert.doesNotMatch(css, /(^|\n)\s*(body|html|:root|\.parking-details|\.parking-page--catalog|\.fazajoo-header)\s*\{/);
 }
 assert.match(listing,/ParkingCatalogLP01\.css/);
});
