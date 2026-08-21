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
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY,
      secretAccessKey: env.STORAGE_SECRET_KEY,
    },
  });
}

function safeExtension(originalName, mimeType) {
  const ext = path.extname(originalName || "").toLowerCase();
  if ([".jpg",".jpeg",".png",".webp"].includes(ext)) return ext === ".jpeg" ? ".jpg" : ext;
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

function publicUrl(key) {
  return `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
}

async function uploadAgencyDocument({ buffer, mimeType, originalName, userId, documentType }) {
  const key = `agency-documents/${userId}/${documentType || "document"}/${crypto.randomUUID()}${safeExtension(originalName, mimeType)}`;

  await client().send(new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: "private, max-age=31536000",
  }));

  return { key, url: publicUrl(key) };
}

async function deleteByPublicUrl(url) {
  return { deleted: false, url };
}

module.exports = {
  uploadAgencyDocument,
  deleteByPublicUrl,
};
