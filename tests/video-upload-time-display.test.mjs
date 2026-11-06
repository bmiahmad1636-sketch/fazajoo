import test from "node:test";
import assert from "node:assert/strict";
import { elapsedSecondsSince, formatUploadElapsedTime } from "../src/utils/videoUploadProgress.js";

test("Phase07A: milliseconds produce actual seconds, not 10x or 100x", () => {
  assert.equal(elapsedSecondsSince(1_000, 11_000), 10);
  assert.equal(elapsedSecondsSince(1_000, 14_000), 13);
  assert.equal(elapsedSecondsSince(1_000, 131_000), 130);
  assert.equal(elapsedSecondsSince(1_000, 12_999), 11);
  assert.equal(elapsedSecondsSince(1_000, 999), 0);
  assert.equal(elapsedSecondsSince(0, 11_000), 0);
});

test("Phase07A: upload phase clock and overall clock are intentionally different", () => {
  const now = 131_000;
  assert.equal(formatUploadElapsedTime(elapsedSecondsSince(118_000, now)), "۰۰:۱۳");
  assert.equal(formatUploadElapsedTime(elapsedSecondsSince(1_000, now)), "۰۲:۱۰");
});

test("Phase07A: elapsed clocks display Persian HH:MM:SS or MM:SS without extra zeros", () => {
  assert.equal(formatUploadElapsedTime(0), "۰۰:۰۰");
  assert.equal(formatUploadElapsedTime(9), "۰۰:۰۹");
  assert.equal(formatUploadElapsedTime(10), "۰۰:۱۰");
  assert.equal(formatUploadElapsedTime(59), "۰۰:۵۹");
  assert.equal(formatUploadElapsedTime(60), "۰۱:۰۰");
  assert.equal(formatUploadElapsedTime(130), "۰۲:۱۰");
  assert.equal(formatUploadElapsedTime(3600), "۰۱:۰۰:۰۰");
  assert.equal(formatUploadElapsedTime(-1), "۰۰:۰۰");
  assert.equal(formatUploadElapsedTime(NaN), "۰۰:۰۰");
});
