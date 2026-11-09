import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EMPTY_VILLA_REQUEST, changeVillaRequestFinancialMode, changeVillaRequestTerm, readVillaRequest,
  writeVillaRequest, validateVillaRequest, villaRequestAreaText,
  villaRequestBudgetRows, villaRequestBudgetText,
} from "../src/utils/villaRequest.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");
const fields = source("src/components/VillaRequestFields.jsx");
const add = source("src/pages/AddParking.jsx");
const edit = source("src/pages/EditParking.jsx");
const card = source("src/components/ParkingCard.jsx");
const details = source("src/pages/ParkingDetails.jsx");
const css = source("src/pages/ParkingDetails.css");
const base = { ...EMPTY_VILLA_REQUEST, accommodationType: "villa", guests: "4", stayType: "daily", pricePeriod: "daily", maxBudget: "20000000" };
const long = { ...base, rentalTerm: "long", financialMode: "deposit_rent", pricePeriod: "monthly", maxBudget: "12000000", maxDeposit: "500000000" };

test("Villa demand: no optional area remains blank even with guest capacity", () => {
  assert.equal(villaRequestAreaText({ ...base, minArea: "", maxArea: "", guests: "12" }), "");
  assert.doesNotMatch(villaRequestAreaText({ ...base, minArea: "", maxArea: "" }), /نفر|مناسب/);
});
test("Villa demand: min, max, both, equal and Persian digit area are supported", () => {
  assert.match(villaRequestAreaText({ minArea: "۲۰۰", maxArea: "۵۰۰" }), /۲۰۰ تا ۵۰۰ مترمربع/);
  assert.match(villaRequestAreaText({ minArea: "200" }), /از ۲۰۰ مترمربع/);
  assert.match(villaRequestAreaText({ maxArea: "500" }), /تا ۵۰۰ مترمربع/);
  assert.match(villaRequestAreaText({ minArea: "300", maxArea: "300" }), /۳۰۰ مترمربع/);
});
test("Villa demand: capacity is still retained as separate request data", () => {
  const stored = readVillaRequest(writeVillaRequest(base));
  assert.equal(stored.data.guests, "4");
  assert.equal(villaRequestAreaText(stored.data), "");
  assert.match(details, /ظرفیت موردنیاز/);
});
test("Financial rows short-term show period and optional security hold as separate entries", () => {
  const rows = villaRequestBudgetRows({ ...base, maxDeposit: "9000000" });
  assert.equal(rows.length, 2);
  assert.match(rows[0].label, /شبانه/);
  assert.match(rows[0].amount, /ریال/);
  assert.match(rows[1].label, /ضمانت خسارت \/ ودیعه/);
  assert.match(villaRequestBudgetText({ ...base, maxDeposit: "9000000" }), /ودیعه/);
});
test("Financial rows: rent-and-deposit uses separate labelled amounts", () => {
  assert.deepEqual(villaRequestBudgetRows(long).map(x => x.label), ["حداکثر رهن", "سقف اجاره ماهانه"]);
});
test("Financial rows: rent-only ignores stale deposit on revisiting step two", () => {
  const next = changeVillaRequestFinancialMode(long, "rent_only");
  assert.equal(next.maxDeposit, "");
  assert.equal(next.maxBudget, long.maxBudget);
  assert.deepEqual(villaRequestBudgetRows(next).map(x => x.label), ["سقف اجاره ماهانه"]);
  assert.doesNotMatch(villaRequestBudgetText({ ...long, financialMode: "rent_only" }), /رهن/);
});
test("Financial rows: full deposit ignores stale monthly rent", () => {
  const next = changeVillaRequestFinancialMode(long, "full_deposit");
  assert.equal(next.maxBudget, "");
  assert.equal(next.maxDeposit, long.maxDeposit);
  assert.deepEqual(villaRequestBudgetRows(next).map(x => x.label), ["حداکثر رهن کامل"]);
  assert.doesNotMatch(villaRequestBudgetText({ ...long, financialMode: "full_deposit" }), /اجاره ماهانه/);
});
test("Financial rows: switching back to both requires entering the missing amount", () => {
  const rentOnly = changeVillaRequestFinancialMode(long, "rent_only");
  const both = changeVillaRequestFinancialMode(rentOnly, "deposit_rent");
  assert.equal(both.maxDeposit, "");
  assert.match(validateVillaRequest(both), /سقف رهن/);
});
test("Financial rows: long-term without selected contract returns no misleading amount", () => {
  assert.deepEqual(villaRequestBudgetRows({ ...long, financialMode: "" }), []);
  assert.match(validateVillaRequest({ ...long, financialMode: "" }), /نوع قرارداد بلندمدت/);
});
test("Contract values stored on publish are exactly the active mode", () => {
  const rentOnly = readVillaRequest(writeVillaRequest(changeVillaRequestFinancialMode(long, "rent_only"))).data;
  assert.equal(rentOnly.maxDeposit, "");
  assert.equal(rentOnly.financialMode, "rent_only");
  const full = readVillaRequest(writeVillaRequest(changeVillaRequestFinancialMode(long, "full_deposit"))).data;
  assert.equal(full.maxBudget, "");
  assert.equal(full.financialMode, "full_deposit");
});
test("Registration and edit share the same mode transition logic", () => {
  assert.match(fields, /changeVillaRequestFinancialMode\(form, financialMode\)/);
  assert.match(fields, /onChange=\{\(\)=>selectFinancialMode\(id\)\}/);
  assert.match(add, /villaRequestBudgetText\(form\.villaRequest\)/);
  assert.match(edit, /villaRequestBudgetText\(form\.villaRequest\)/);
});
test("Contract selection error is directly below its radio group", () => {
  assert.match(fields, /aria-describedby=\{contractError \? "villa-request-contract-error"/);
  assert.match(fields, /contractError&&<p id="villa-request-contract-error"/);
  assert.match(fields, /error && !contractError/);
});
test("Security hold always mentions both damage guarantee and deposit", () => {
  assert.match(fields, /حداکثر ضمانت خسارت \/ ودیعه \(ریال\)/);
  assert.match(source("src/utils/villaRequest.js"), /حداکثر ضمانت خسارت \/ ودیعه/);
});
test("Final step tells villa users financial selection was already made on step one", () => {
  assert.match(add, /form\.category === "villa" \? "نوع قرارداد و سقف مبالغ در مرحله اول مشخص شده‌اند/);
});
test("Edit villa wanted has no generic area field; supply villa keeps its field", () => {
  assert.match(edit, /\["storage", "warehouse", "parking", "shop", "residential", "villa", "garden", "other"\]\.includes\(parking\?\.category\)/);
  assert.match(edit, /!\(\(isWanted && parking\?\.category === "land"\)/);
});
test("Wanted villa card and details show unspecified area instead of guest capacity", () => {
  assert.match(card, /villaAreaText \|\| "متراژ مشخص نشده"/);
  assert.match(details, /villaAreaText \|\| "متراژ مشخص نشده"/);
  assert.match(add, /villaRequestAreaText\(form\.villaRequest\) \|\| "متراژ مشخص نشده"/);
});
test("Wanted villa budget rows are used on card, detail hero and detail feature", () => {
  assert.match(card, /villaWantedRows = villaData \? villaRequestBudgetRows\(villaData\)/);
  assert.match(details, /villaWantedPriceRows = villaWantedData \? villaRequestBudgetRows\(villaWantedData\)/);
  assert.equal((details.match(/<ShopMoneyRows items=\{villaWantedPriceRows\} compact stacked/g) || []).length, 1);
  assert.equal((details.match(/<ShopMoneyRows items=\{villaWantedPriceRows\} stacked/g) || []).length, 1);
  assert.match(details, /\.\.\.villaWantedPriceRows\.map\(\(\{label, amount\}\) => \[label, amount\]\)/);
});
test("Financial details are rendered vertically within individual styled boxes", () => {
  assert.match(css, /\.parking-details-shop-money--villa-request[\s\S]*?flex-direction: column/);
  assert.match(css, /\.parking-details-shop-money--villa-request[\s\S]*?border-radius: 12px/);
  assert.match(details, /stacked ariaLabel="سقف مبالغ درخواست ویلا"/);
});

test("Switching short/long terms clears stale amounts from a different financial meaning", () => {
  const short = changeVillaRequestTerm(long, "short");
  assert.equal(short.rentalTerm, "short");
  assert.equal(short.financialMode, "");
  assert.equal(short.maxBudget, "");
  assert.equal(short.maxDeposit, "");
  const back = changeVillaRequestTerm(short, "long");
  assert.equal(back.pricePeriod, "monthly");
  assert.equal(back.maxDeposit, "");
  assert.match(fields, /onChange=\{\(\)=>onChange\(changeVillaRequestTerm\(form,id\)\)\}/);
});
