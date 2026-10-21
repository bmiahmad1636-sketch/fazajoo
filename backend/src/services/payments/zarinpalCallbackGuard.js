"use strict";

// Stage 10: pure input validation only. This module NEVER verifies a payment,
// changes an intent, credits a wallet, or communicates with a payment provider.
const AUTHORITY_RE = /^A[0-9A-Za-z_-]{8,127}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseCallbackQuery(query) {
  if (!query || typeof query !== "object" || Array.isArray(query)) {
    return { accepted: false, reason: "INVALID_CALLBACK" };
  }
  const { Authority: authority, Status: status } = query;
  if (typeof authority !== "string" || !AUTHORITY_RE.test(authority) ||
      typeof status !== "string" || !["OK", "NOK"].includes(status)) {
    return { accepted: false, reason: "INVALID_CALLBACK" };
  }
  if (status === "NOK") return { accepted: false, reason: "USER_CANCELLED", authority };
  // OK means only that the browser returned. Verification MUST happen server-to-server.
  return { accepted: true, requiresServerVerification: true, authority };
}

function validateVerificationContext({ intentId, storedAuthority, callbackAuthority, amountRial }) {
  if (typeof intentId !== "string" || !UUID_RE.test(intentId)) throw new Error("INVALID_INTENT_ID");
  if (typeof storedAuthority !== "string" || !AUTHORITY_RE.test(storedAuthority) ||
      storedAuthority !== callbackAuthority) throw new Error("AUTHORITY_MISMATCH");
  if (typeof amountRial !== "string" || !/^[1-9][0-9]*$/.test(amountRial)) throw new Error("INVALID_AMOUNT");
  return Object.freeze({ intentId, authority: storedAuthority, amountRial });
}

module.exports = { parseCallbackQuery, validateVerificationContext };
