// Process-local status for one authenticated video transfer. No file names, URLs or tokens.
// This is advisory UI data: the POST response remains the authority for success/failure.
const jobs = new Map();
const JOB_TTL_MS = 5 * 60 * 1000;
const MAX_JOBS = 256;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function prune(now = Date.now()) {
  for (const [id, job] of jobs) {
    if (job.expiresAt <= now) jobs.delete(id);
  }
  while (jobs.size >= MAX_JOBS) jobs.delete(jobs.keys().next().value);
}

function start(id, userId, total) {
  if (!ID_PATTERN.test(String(id || "")) || !userId) return false;
  const size = Number(total);
  if (!Number.isSafeInteger(size) || size <= 0 || size > 100 * 1024 * 1024) return false;
  prune();
  if (jobs.has(id)) return false;
  jobs.set(id, { userId: String(userId), stage: "storage", loaded: 0, total: size, expiresAt: Date.now() + JOB_TTL_MS });
  return true;
}

function update(id, userId, bytes) {
  const job = jobs.get(id);
  if (!job || job.userId !== String(userId) || job.stage !== "storage") return;
  job.loaded = Math.max(job.loaded, Math.min(job.total, Math.floor(Number(bytes) || 0)));
  // All input bytes have been consumed by the S3 request stream.
  // S3 has NOT necessarily acknowledged the object: await PutObject response.
  if (job.loaded === job.total) job.stage = "confirming";
  job.expiresAt = Date.now() + JOB_TTL_MS;
}

function finish(id, userId) {
  const job = jobs.get(id);
  if (!job || job.userId !== String(userId)) return;
  job.stage = "saved";
  job.loaded = job.total;
  job.expiresAt = Date.now() + JOB_TTL_MS;
}

function fail(id, userId) {
  const job = jobs.get(id);
  if (!job || job.userId !== String(userId)) return;
  job.stage = "failed";
  job.expiresAt = Date.now() + JOB_TTL_MS;
}

function get(id, userId) {
  if (!ID_PATTERN.test(String(id || ""))) return null;
  const job = jobs.get(id);
  if (!job || job.userId !== String(userId) || job.expiresAt <= Date.now()) return null;
  // Return a fresh immutable view; don't expose owner identity or internal state.
  return { stage: job.stage, loaded: job.loaded, total: job.total };
}

module.exports = { start, update, finish, fail, get };
