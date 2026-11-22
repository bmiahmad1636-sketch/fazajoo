import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { rotationIndex } = require("../backend/src/services/featuredShowcaseRotation.js");
const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("one public slot is selected for any valid number of active ads", () => {
  for (const count of [1, 2, 3, 19, 20, 100]) {
    for (let slot = 0; slot < count * 4; slot++) {
      const ix = rotationIndex(slot * 300_000, 5, count);
      assert.ok(ix >= 0 && ix < count);
    }
  }
});
test("equal shares during a full cycle within a day", () => {
  for (const count of [2, 5, 10, 20]) {
    const hits = Array(count).fill(0);
    for (let i = 0; i < 2 * count; i++) hits[rotationIndex(i * 300_000, 5, count)]++;
    assert.deepEqual(hits,Array(count).fill(2));
  }
});
test("selection remains steady within five minute slot", () => {
  for (const minute of [0, 1, 2, 3, 4]) assert.equal(rotationIndex(minute*60000,5,20),rotationIndex(0,5,20));
});
test("invalid intervals and empty list never select a paid placement", () => {
  for(const n of [0,-1,1.1,NaN]) assert.equal(rotationIndex(0,5,n),-1);
  assert.equal(rotationIndex(0,0,20),-1);
});
test("public API returns no financial or owner details", () => {
  const code=file("backend/src/services/featuredShowcase.service.js");
  assert.match(code,/const publicFields =/);
  const fields=code.split("const publicFields =")[1].split(";",1)[0];
  assert.doesNotMatch(fields,/phone|payment|owner_id|location_lat|amount/i);
  assert.match(code,/expires_at > NOW\(\)/);
});
test("server enforces three day expiration and serial queue promotion", () => {
  const code=file("backend/src/services/featuredShowcase.service.js");
  assert.match(code,/pg_advisory_xact_lock/);
  assert.match(code,/INTERVAL '72 hours'/);
  assert.match(code,/ORDER BY created_at ASC,id ASC/);
  assert.match(code,/settings\.capacity/);
  assert.match(code,/status='expired'/);
  assert.match(code,/status='cancelled'/);
});
test("admin endpoints require authenticated admin before mutation", () => {
  const code=file("backend/src/routes/featuredShowcase.routes.js");
  assert.match(code,/router\.use\("\/admin",requireAuth,requireAdmin\)/);
  assert.match(code,/router\.post\("\/admin\/bookings"/);
});
test("no gateway claim; paid placements need reference and explicit manual mode", () => {
  const sql=file("backend/src/db/featured-showcase-hp03.sql");
  const service=file("backend/src/services/featuredShowcase.service.js");
  assert.match(sql,/hp03_manual_receipt/);
  assert.match(service,/manual_verified/);
  assert.match(service,/payment_reference/);
});
test("single result count on homepage and preserved catalog count", () => {
  const app=file("src/App.jsx");
  const catalog=file("src/pages/parking.jsx");
  assert.doesNotMatch(app,/hp01-home__count/);
  assert.match(catalog,/parking-results__count/);
  assert.match(app,/showHero=\{false\}/);
});
test("premium module replaces random first ad and keeps brand fallback", () => {
  const hero=file("src/components/Hero.jsx");
  const component=file("src/components/FeaturedShowcaseHP03.jsx");
  assert.match(hero,/<FeaturedShowcaseHP03 \/>/);
  assert.match(component,/hp01-hero__architecture/);
  assert.match(component,/آگهی تبلیغاتی/);
  assert.doesNotMatch(hero,/parkings\.find\(/);
});
test("database indexes prevent two live purchases of the same listing", () => {
  const sql=file("backend/src/db/featured-showcase-hp03.sql");
  assert.match(sql,/UNIQUE INDEX.*hp03_unique_live_space/);
  assert.match(sql,/status IN \('queued','active'\)/);
});
