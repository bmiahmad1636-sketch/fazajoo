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

if (!apiKey) {
  console.warn(
    "KAVENEGAR_API_KEY is not configured."
  );
}

const kavenegarApi =
  Kavenegar.KavenegarApi({
    apikey: apiKey,
  });

function generateOtpCode() {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
}

function hashOtpCode(code) {
  return crypto
    .createHash("sha256")
    .update(String(code))
    .digest("hex");
}

function safeEqualOtpHash(
  storedHash,
  candidateHash
) {
  const stored =
    Buffer.from(
      String(storedHash || ""),
      "hex"
    );

  const candidate =
    Buffer.from(
      String(candidateHash || ""),
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
  const candidateHash =
    hashOtpCode(code);

  return safeEqualOtpHash(
    storedHash,
    candidateHash
  );
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