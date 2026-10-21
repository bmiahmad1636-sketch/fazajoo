"use strict";

// Stable interface for any future Iranian PSP/payment facilitator.
// No network requests or balance changes are permitted in Stage 06.
const REQUIRED_METHODS = ["createPayment", "verifyPayment"];

function assertPaymentProvider(provider) {
  if (!provider || REQUIRED_METHODS.some((method) => typeof provider[method] !== "function")) {
    throw new Error("INVALID_PAYMENT_PROVIDER");
  }
  return provider;
}

module.exports = { assertPaymentProvider };
