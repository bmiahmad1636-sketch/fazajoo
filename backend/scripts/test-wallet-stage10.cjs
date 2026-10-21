"use strict";
const assert = require("node:assert/strict");
const { parseCallbackQuery, validateVerificationContext } = require("../src/services/payments/zarinpalCallbackGuard");
const authority = "A0000000000000000000000000000001";
const intentId = "11111111-1111-4111-8111-111111111111";
const cases = [
  ["callback OK still requires server verification", () => assert.deepEqual(parseCallbackQuery({ Authority: authority, Status: "OK" }), { accepted: true, requiresServerVerification: true, authority })],
  ["cancelled callback is not payment proof", () => assert.equal(parseCallbackQuery({ Authority: authority, Status: "NOK" }).accepted, false)],
  ["missing authority rejected", () => assert.equal(parseCallbackQuery({ Status: "OK" }).accepted, false)],
  ["array authority rejected", () => assert.equal(parseCallbackQuery({ Authority: [authority], Status: "OK" }).accepted, false)],
  ["unexpected status rejected", () => assert.equal(parseCallbackQuery({ Authority: authority, Status: "paid" }).accepted, false)],
  ["matching stored authority accepted for subsequent verification", () => assert.equal(validateVerificationContext({ intentId, storedAuthority: authority, callbackAuthority: authority, amountRial: "100000" }).amountRial, "100000")],
  ["authority mismatch rejected", () => assert.throws(() => validateVerificationContext({ intentId, storedAuthority: authority, callbackAuthority: "A999999999999999999", amountRial: "100000" }), /AUTHORITY_MISMATCH/)],
  ["invalid amount rejected", () => assert.throws(() => validateVerificationContext({ intentId, storedAuthority: authority, callbackAuthority: authority, amountRial: "0" }), /INVALID_AMOUNT/)],
];
for (const [label, test] of cases) { test(); console.log("PASS:", label); }
console.log(`Stage 10: ${cases.length}/${cases.length} PASS (pure offline tests, no DB, no network, no money movement)`);
