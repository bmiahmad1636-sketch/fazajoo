"use strict";
const assert = require("node:assert/strict");
const { validateServerVerification } = require("../src/services/payments/zarinpalVerificationGuard");
const intent = { provider: "zarinpal", status: "pending", authority: "A1234567890", amountRial: "100000" };
const result = { source: "server_to_server", verified: true, provider: "zarinpal", authority: intent.authority, amountRial: intent.amountRial, reference: "123456" };
let passed = 0;
function pass(name, fn) { fn(); passed++; console.log("PASS:", name); }
function reject(name, i, r) { pass(name, () => assert.throws(() => validateServerVerification({ intent: i, result: r }))); }
pass("valid trusted verification context", () => assert.equal(validateServerVerification({ intent, result }).verified, true));
reject("browser callback is not proof", intent, { ...result, source: "browser_callback" });
reject("failed verification rejected", intent, { ...result, verified: false });
reject("authority mismatch rejected", intent, { ...result, authority: "B1234567890" });
reject("amount mismatch rejected", intent, { ...result, amountRial: "200000" });
reject("provider mismatch rejected", intent, { ...result, provider: "other" });
reject("non-pending intent rejected", { ...intent, status: "verified" }, result);
reject("invalid reference rejected", intent, { ...result, reference: "" });
reject("missing result rejected", intent, undefined);
console.log(`Stage 12: ${passed}/9 PASS (offline only, no network, no database, no settlement)`);
