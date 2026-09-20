const crypto = require("crypto");
const Kavenegar = require("kavenegar");

const apiKey =
  String(
    process.env.KAVENEGAR_API_KEY || ""
  ).trim();

const template =
  String(
    process.env.KAVENEGAR_TEMPLATE ||
      "fazajoo"
  ).trim();

const otpHashSecret =
  String(
    process.env.OTP_HASH_SECRET || ""
  ).trim();

if (!apiKey) {
  console.warn(
    "KAVENEGAR_API_KEY is not configured."
  );
}

if (!otpHashSecret) {
  console.warn(
    "OTP_HASH_SECRET is not configured. OTP generation/verification will be blocked until it is set."
  );
}

const kavenegarApi =
  Kavenegar.KavenegarApi({
    apikey: apiKey,
  });

function requireOtpHashSecret() {
  if (!otpHashSecret) {
    throw new Error(
      "OTP_HASH_SECRET is not configured."
    );
  }

  return otpHashSecret;
}

function generateOtpCode() {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
}

function hashOtpCode(code) {
  const secret =
    requireOtpHashSecret();

  const digest =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(String(code))
      .digest("hex");

  /*
   * Prefixing the format lets verification distinguish
   * new keyed hashes from short-lived legacy SHA-256 hashes.
   */
  return `hmac-sha256:${digest}`;
}

function safeEqualHex(
  storedHex,
  candidateHex
) {
  if (
    !/^[a-f0-9]+$/i.test(
      String(storedHex || "")
    ) ||
    !/^[a-f0-9]+$/i.test(
      String(candidateHex || "")
    )
  ) {
    return false;
  }

  const stored =
    Buffer.from(
      String(storedHex),
      "hex"
    );

  const candidate =
    Buffer.from(
      String(candidateHex),
      "hex"
    );

  if (
    stored.length === 0 ||
    stored.length !== candidate.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    stored,
    candidate
  );
}

function verifyOtpCode(
  storedHash,
  code
) {
  const stored =
    String(storedHash || "");

  if (
    stored.startsWith(
      "hmac-sha256:"
    )
  ) {
    const storedDigest =
      stored.slice(
        "hmac-sha256:".length
      );

    const candidateDigest =
      hashOtpCode(code).slice(
        "hmac-sha256:".length
      );

    return safeEqualHex(
      storedDigest,
      candidateDigest
    );
  }

  /*
   * Temporary backward compatibility:
   * OTPs created by the previous version expire within minutes,
   * so existing pending codes can finish normally during rollout.
   */
  if (
    /^[a-f0-9]{64}$/i.test(stored)
  ) {
    const legacyCandidate =
      crypto
        .createHash("sha256")
        .update(String(code))
        .digest("hex");

    return safeEqualHex(
      stored,
      legacyCandidate
    );
  }

  return false;
}

function sendOtpSms(
  phone,
  code
) {
  if (!apiKey) {
    return Promise.reject(
      new Error(
        "Kavenegar API key is not configured."
      )
    );
  }

  return new Promise(
    (resolve, reject) => {
      kavenegarApi.VerifyLookup(
        {
          receptor: phone,
          token: code,
          template,
        },
        (response, status) => {
          const numericStatus =
            Number(status);

          if (
            Number.isFinite(
              numericStatus
            ) &&
            numericStatus >= 200 &&
            numericStatus < 300
          ) {
            resolve({
              status: numericStatus,
              response,
            });

            return;
          }

          const error =
            new Error(
              "Kavenegar OTP delivery failed."
            );

          error.status =
            numericStatus || status;

          error.providerResponse =
            response;

          reject(error);
        }
      );
    }
  );
}

module.exports = {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  sendOtpSms,
};
