const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
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
  const base = String(env.STORAGE_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  return base ? `${base}/${key}` : "";
}

function keyFromStoredDocument(documentRecord) {
  if (!documentRecord) return "";

  if (typeof documentRecord === "object" && documentRecord.key) {
    return String(documentRecord.key).replace(/^\/+/, "");
  }

  const rawUrl =
    typeof documentRecord === "string"
      ? documentRecord
      : documentRecord.url || "";

  if (!rawUrl) return "";

  const publicBase = String(env.STORAGE_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (publicBase && rawUrl.startsWith(`${publicBase}/`)) {
    return decodeURIComponent(rawUrl.slice(publicBase.length + 1)).replace(/^\/+/, "");
  }

  try {
    const pathname = decodeURIComponent(new URL(rawUrl).pathname).replace(/^\/+/, "");
    const marker = "agency-documents/";
    const markerIndex = pathname.indexOf(marker);

    if (markerIndex >= 0) {
      return pathname.slice(markerIndex);
    }
  } catch {
    // A legacy database value can also contain a raw object key.
  }

  if (String(rawUrl).startsWith("agency-documents/")) {
    return String(rawUrl);
  }

  return "";
}

function assertAgencyDocumentKey(key, userId) {
  const expectedPrefix = `agency-documents/${userId}/`;

  if (!key || !key.startsWith(expectedPrefix)) {
    throw new Error("Invalid agency document key.");
  }
}

async function uploadAgencyDocument({
  buffer,
  mimeType,
  originalName,
  userId,
  documentType,
}) {
  const key = `agency-documents/${userId}/${documentType || "document"}/${crypto.randomUUID()}${safeExtension(originalName, mimeType)}`;

  await client().send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "private, no-store",
    })
  );

  return {
    key,
    url: publicUrl(key),
    originalFilename: originalName || "document",
    mimeType: mimeType || "application/octet-stream",
  };
}

async function getAgencyDocument({ documentRecord, userId }) {
  const key = keyFromStoredDocument(documentRecord);
  assertAgencyDocumentKey(key, userId);

  const object = await client().send(
    new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
    })
  );

  return {
    key,
    body: object.Body,
    contentType: object.ContentType || "application/octet-stream",
    contentLength: object.ContentLength,
    etag: object.ETag,
  };
}

async function deleteByPublicUrl(url) {
  const key = keyFromStoredDocument(url);
  if (!key) return { deleted: false, url };

  await client().send(
    new DeleteObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
    })
  );

  return { deleted: true, url };
}

module.exports = {
  uploadAgencyDocument,
  getAgencyDocument,
  keyFromStoredDocument,
  deleteByPublicUrl,
};
