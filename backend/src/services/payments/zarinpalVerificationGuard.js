"use strict";
// Stage 12: validate server-side verification result shape ONLY.
// This module never calls a gateway, writes to DB, or credits a wallet.
const AUTHORITY = /^[A-Za-z0-9_-]{8,160}$/;
const REFERENCE = /^[A-Za-z0-9_-]{1,160}$/;
const POSITIVE_RIAL = /^[1-9][0-9]*$/;
function validateServerVerification({ intent, result } = {}) {
  if (!intent || intent.provider !== "zarinpal" || intent.status !== "pending" ||
      typeof intent.authority !== "string" || !AUTHORITY.test(intent.authority) ||
      typeof intent.amountRial !== "string" || !POSITIVE_RIAL.test(intent.amountRial)) {
    throw new Error("INVALID_PENDING_INTENT");
  }
  if (!result || result.source !== "server_to_server" || result.verified !== true ||
      result.provider !== "zarinpal" || result.authority !== intent.authority ||
      result.amountRial !== intent.amountRial ||
      typeof result.reference !== "string" || !REFERENCE.test(result.reference)) {
    throw new Error("UNTRUSTED_VERIFICATION_RESULT");
  }
  return Object.freeze({ verified: true, provider: "zarinpal", authority: intent.authority,
    amountRial: intent.amountRial, reference: result.reference });
}
module.exports = { validateServerVerification };
