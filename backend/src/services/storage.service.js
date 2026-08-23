const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const path = require("path");
const env = require("../config/env");

function assertConfigured() {
  const missing = [
    ["STORAGE_ENDPOINT", env.STORAGE_ENDPOINT],
    ["STORAGE_BUCKET", env.STORAGE_BUCKET],
    ["STORAGE_ACCESS_KEY", env.STORAGE_ACCESS_KEY],
    ["STORAGE_SECRET_KEY", env.STORAGE_SECRET_KEY],
    ["STORAGE_PUBLIC_BASE_URL", env.STORAGE_PUBLIC_BASE_URL],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`Storage is not configured: ${missing.join(", ")}`);
  }
}

function client() {
  assertConfigured();
  return new S3Client({
    region: env.STORAGE_REGION || "us-east-1",
    endpoint: env.STORAGE_ENDPOINT,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY,
      secretAccessKey: env.STORAGE_SECRET_KEY,
    },
  });
}

function safeExtension(originalName, mimeType) {
  const ext = path.extname(originalName || "").toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }

  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

function publicUrl(key) {
  return `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
}

function keyFromPublicUrl(url) {
  if (!url || typeof url !== "string" || !env.STORAGE_PUBLIC_BASE_URL) {
    return null;
  }

  const base = env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "");
  const prefix = `${base}/`;

  if (!url.startsWith(prefix)) return null;

  try {
    return decodeURIComponent(url.slice(prefix.length));
  } catch {
    return url.slice(prefix.length);
  }
}

function keyFromAdImageApiUrl(url) {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url, "http://fazajoo.local");
    const marker = "/api/uploads/ad-image/";
    const index = parsed.pathname.indexOf(marker);

    if (index === -1) return null;

    const tail = parsed.pathname.slice(index + marker.length);
    const parts = tail.split("/").filter(Boolean).map(decodeURIComponent);

    if (parts.length !== 2) return null;

    const [userId, filename] = parts;
    if (!userId || !filename || filename.includes("..")) return null;

    return `ad-images/${userId}/${filename}`;
  } catch {
    return null;
  }
}

async function uploadAdImage({ buffer, mimeType, originalName, userId }) {
  const key = `ad-images/${userId}/${crypto.randomUUID()}${safeExtension(
    originalName,
    mimeType
  )}`;

  await client().send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return { key };
}

async function getAdImage({ userId, filename }) {
  if (!userId || !filename || filename.includes("..") || filename.includes("/")) {
    const error = new Error("تصویر نامعتبر است.");
    error.statusCode = 400;
    throw error;
  }

  const key = `ad-images/${userId}/${filename}`;

  try {
    return await client().send(
      new GetObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: key,
      })
    );
  } catch (error) {
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
      const notFound = new Error("تصویر پیدا نشد.");
      notFound.statusCode = 404;
      throw notFound;
    }
    throw error;
  }
}

async function deleteAdImage({ url, userId }) {
  const key = keyFromAdImageApiUrl(url) || keyFromPublicUrl(url);

  // Images from the old provider (for example Cloudinary) are left untouched.
  if (!key) {
    return {
      deleted: false,
      external: true,
    };
  }

  const allowedPrefix = `ad-images/${userId}/`;

  if (!key.startsWith(allowedPrefix)) {
    const error = new Error("اجازه حذف این تصویر را ندارید.");
    error.statusCode = 403;
    throw error;
  }

  await client().send(
    new DeleteObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
    })
  );

  return {
    deleted: true,
  };
}

async function uploadAgencyDocument({
  buffer,
  mimeType,
  originalName,
  userId,
  documentType,
}) {
  const key = `agency-documents/${userId}/${
    documentType || "document"
  }/${crypto.randomUUID()}${safeExtension(originalName, mimeType)}`;

  await client().send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "private, max-age=31536000",
    })
  );

  return {
    key,
    url: publicUrl(key),
  };
}

async function deleteByPublicUrl(url) {
  const key = keyFromPublicUrl(url);

  if (!key) {
    return { deleted: false, url };
  }

  await client().send(
    new DeleteObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
    })
  );

  return { deleted: true, url };
}

module.exports = {
  uploadAdImage,
  getAdImage,
  deleteAdImage,
  uploadAgencyDocument,
  deleteByPublicUrl,
};
