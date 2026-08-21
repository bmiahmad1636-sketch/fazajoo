const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
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
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Storage is not configured: ${missing.join(", ")}`);
}

function client() {
  assertConfigured();
  return new S3Client({
    region: env.STORAGE_REGION || "us-east-1",
    endpoint: env.STORAGE_ENDPOINT,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.STORAGE_ACCESS_KEY, secretAccessKey: env.STORAGE_SECRET_KEY },
  });
}

function safeExtension(originalName, mimeType) {
  const ext = path.extname(originalName || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return ext === ".jpeg" ? ".jpg" : ext;
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

function publicUrl(key) {
  return `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
}

function keyFromPublicUrl(url) {
  const base = env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "");
  if (!url || !url.startsWith(`${base}/`)) return "";
  return decodeURIComponent(url.slice(base.length + 1));
}

async function uploadAdImage({ buffer, mimeType, originalName, userId }) {
  const key = `ads/${userId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${safeExtension(originalName, mimeType)}`;
  await client().send(new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return { key, url: publicUrl(key) };
}

async function deleteByPublicUrl(url, userId) {
  const key = keyFromPublicUrl(url);
  if (!key) return { deleted: false, reason: "not-managed" };
  if (!key.startsWith(`ads/${userId}/`)) throw new Error("Storage object does not belong to this user.");
  await client().send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }));
  return { deleted: true, key };
}

module.exports = { uploadAdImage, deleteByPublicUrl };
