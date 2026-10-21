"use strict";
const assert = require("node:assert/strict");
const { assertPaymentProvider } = require("../src/services/payments/paymentProvider");
const { createZarinpalProvider } = require("../src/services/payments/zarinpal.provider");

async function main() {
  const provider = createZarinpalProvider();
  assert.equal(provider.name, "zarinpal");
  console.log("PASS: provider identity");
  assert.throws(() => assertPaymentProvider({ createPayment() {} }), /INVALID_PAYMENT_PROVIDER/);
  console.log("PASS: incomplete provider rejected");
  await assert.rejects(provider.createPayment({ amountRial: "100000" }), /ZARINPAL_NOT_CONFIGURED/);
  console.log("PASS: payment initiation disabled");
  await assert.rejects(provider.verifyPayment({ authority: "test" }), /ZARINPAL_NOT_CONFIGURED/);
  console.log("PASS: payment verification disabled");
  console.log("Stage 06: 4/4 PASS — no network, no database, no money movement");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
