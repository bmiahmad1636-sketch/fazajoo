const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const envPath =
  path.resolve(
    __dirname,
    "..",
    ".env"
  );

if (!fs.existsSync(envPath)) {
  console.error(
    "backend/.env پیدا نشد."
  );
  process.exit(1);
}

const current =
  fs.readFileSync(
    envPath,
    "utf8"
  );

if (
  /^\s*OTP_HASH_SECRET\s*=/m.test(
    current
  )
) {
  console.log(
    "OTP_HASH_SECRET از قبل در backend/.env وجود دارد؛ تغییری داده نشد."
  );
  process.exit(0);
}

const secret =
  crypto
    .randomBytes(48)
    .toString("hex");

const separator =
  current.endsWith("\n")
    ? ""
    : "\n";

fs.appendFileSync(
  envPath,
  `${separator}\n# OTP keyed hashing secret\nOTP_HASH_SECRET=${secret}\n`,
  "utf8"
);

console.log(
  "OTP_HASH_SECRET با موفقیت به backend/.env اضافه شد."
);
console.log(
  "مقدار secret عمداً چاپ نشد."
);
