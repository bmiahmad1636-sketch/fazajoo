import test from "node:test";
import assert from "node:assert/strict";
import { getIndustrialCardModel } from "../src/utils/industrialCardModel.js";

const base = { category: "warehouse", title: "سوله بزرگ و جادار", city: "اصفهان", area: 2000, listingType: "offer", price: "" };

test("offer: real primary + negotiable alternative get exactly two and one ticks", () => {
  const result = getIndustrialCardModel({ ...base, spaceAttributes: { values: {
    rentalTerm: "long", canNegotiateOtherTerm: true, financialMode: "deposit_rent", longRateUnit: "month", longMonthlyRentRial: "200000000", longDepositRial: "2000000000",
  } } });
  assert.equal(result.title, "سوله بزرگ و جادار / اصفهان");
  assert.equal(result.badges.length, 2);
  assert.equal(result.badges[0].label, "بلندمدت");
  assert.equal(result.badges[0].ticks, "✓✓");
  assert.equal(result.badges[1].label, "کوتاه‌مدت");
  assert.equal(result.badges[1].ticks, "✓");
  assert.equal(result.areaText, "۲٬۰۰۰ مترمربع");
  assert.equal(result.moneyRows.length, 2);
  assert.match(result.moneyRows[1].label, /اجاره.*ماهانه/);
});

test("wanted: only the requested term; no fabricated alternative", () => {
  const result = getIndustrialCardModel({ ...base, city: "شیراز", listingType: "wanted", area: null }, {
    minArea: "100", maxArea: "150", rentalTerm: "long", financialMode: "deposit_rent", longRateUnit: "month", maxRentRial: "200000000", maxDepositRial: "30000000000", canNegotiateOtherTerm: true,
  });
  assert.equal(result.badges.length, 1);
  assert.equal(result.badges[0].label, "بلندمدت");
  assert.equal(result.badges[0].ticks, "");
  assert.equal(result.areaText, "از ۱۰۰ تا ۱۵۰ مترمربع");
  assert.ok(result.moneyRows.some(row => row.label === "سقف بودجه / ماهانه"));
  assert.ok(result.moneyRows.some(row => row.label === "سقف رهن"));
});

test("short request respects registered unit and damage security", () => {
  const result = getIndustrialCardModel({ ...base, listingType: "wanted" }, {
    rentalTerm: "short", shortRateUnit: "week", maxBudgetRial: "90000000", maxSecurityHoldRial: "3000000",
  });
  assert.equal(result.badges.length, 1);
  assert.equal(result.badges[0].label, "کوتاه‌مدت");
  assert.ok(result.moneyRows.some(row => row.label.includes("هفتگی")));
  assert.ok(result.moneyRows.some(row => row.label.includes("ضمانت خسارت")));
});

test("unknown legacy term: do not manufacture contract ticks or money", () => {
  const result = getIndustrialCardModel({ ...base, spaceAttributes: { values: {} }, price: "", city: "اصفهان" });
  assert.equal(result.badges.length, 0);
  assert.equal(result.moneyRows.length, 0);
});

test("city is not repeated in listing heading", () => {
  const result = getIndustrialCardModel({ ...base, title: "سوله بزرگ و جادار / اصفهان" });
  assert.equal(result.title, "سوله بزرگ و جادار / اصفهان");
});
