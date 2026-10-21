"use strict";

const { assertPaymentProvider } = require("./paymentProvider");

// Deliberately DISABLED until merchant credentials, documented API contract,
// callback domain, reconciliation, and payment security review are completed.
// Never mark an intent verified or credit a wallet based on a browser callback.
class ZarinpalProvider {
  constructor({ merchantId = "" } = {}) {
    this.merchantId = merchantId;
    this.name = "zarinpal";
  }

  async createPayment(_request) {
    throw new Error("ZARINPAL_NOT_CONFIGURED");
  }

  async verifyPayment(_request) {
    throw new Error("ZARINPAL_NOT_CONFIGURED");
  }
}

module.exports = {
  ZarinpalProvider,
  createZarinpalProvider(config) {
    return assertPaymentProvider(new ZarinpalProvider(config));
  },
};
