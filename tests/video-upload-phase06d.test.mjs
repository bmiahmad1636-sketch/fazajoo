import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { videoTransferPercent, videoUploadStageLabel, videoUploadPhaseLabel } from '../src/utils/videoUploadProgress.js';
const require = createRequire(import.meta.url);
const tracker = require('../backend/src/utils/videoUploadProgress.js');
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const id = (n) => `a0000000-0000-4000-a000-${String(n).padStart(12, '0')}`;

test('Phase06D: transfer reaches 100% from measured bytes, not from guessed confirmation time', () => {
  for (const bytes of [0, 1, 15, 49, 60, 90, 100]) {
    assert.equal(videoTransferPercent({stage:'browser',loaded:bytes,total:100}),Math.round(bytes/2));
    assert.equal(videoTransferPercent({stage:'storage',loaded:bytes,total:100}),50+Math.round(bytes/2));
  }
  assert.equal(videoTransferPercent({stage:'confirming'}),100);
  assert.equal(videoTransferPercent({stage:'ready'}),100);
  assert.match(videoUploadStageLabel('confirming'),/تأیید فضای ذخیره/);
  assert.match(videoUploadPhaseLabel('confirming'),/مرحله ۳ از ۴/);
  assert.match(videoUploadPhaseLabel('poster'),/مرحله ۴ از ۴/);
});

test('Phase06D: S3 source-stream completion is NOT represented as S3 acknowledgement', () => {
  const uploadId = id(607);
  assert.equal(tracker.start(uploadId,'owner',600),true);
  tracker.update(uploadId,'owner',599);
  assert.equal(tracker.get(uploadId,'owner').stage,'storage');
  tracker.update(uploadId,'owner',600);
  assert.deepEqual(tracker.get(uploadId,'owner'),{stage:'confirming',loaded:600,total:600});
  tracker.update(uploadId,'owner',600);
  assert.equal(tracker.get(uploadId,'owner').stage,'confirming');
  assert.equal(tracker.get(uploadId,'intruder'),null);
  tracker.finish(uploadId,'owner');
  assert.equal(tracker.get(uploadId,'owner').stage,'saved');
});

test('Phase06D: authenticated polling handles S3 confirmation independently from HTTP POST completion', () => {
  const service=read('src/services/uploadService.js');
  const controller=read('backend/src/controllers/uploads.controller.js');
  const route=read('backend/src/routes/uploads.routes.js');
  assert.match(service,/\["storage", "confirming", "saved"\]/);
  assert.match(service,/xhr\.upload\.onprogress/);
  assert.match(service,/xhr\.onload = \(\) =>/);
  assert.match(controller,/videoProgress\.finish\(uploadId, userId\)/);
  assert.match(route,/"\/ad-video-progress\/:uploadId",\s*requireAuth/);
});

test('Phase06D: preview preparation overlaps transfer, and progress labels expose distinct finalization stages', () => {
  const ui=read('src/components/VideoUploader.jsx');
  const css=read('src/components/VideoUploader.css');
  assert.match(ui,/const posterPromise = createPoster\(file\)/);
  assert.ok(ui.indexOf('posterPromise = createPoster') < ui.indexOf('await uploadAdVideo'));
  assert.match(ui,/await posterPromise/);
  assert.match(ui,/preparationMs: Date\.now\(\) - posterStartedAt/);
  assert.match(ui,/uploadStage === "ready" \? "progressbar" : "status"/);
  assert.match(ui,/videoUploadPhaseLabel\(uploadStage\)/);
  assert.match(ui,/stageSeconds\.toLocaleString\("fa-IR"\)/);
  assert.match(css,/prefers-reduced-motion: reduce/);
  assert.match(css,/progress-ring--busy/);
});

test('Phase06D: timings exclude identifiers; video duration and size constraints unchanged', () => {
  const ui=read('src/components/VideoUploader.jsx');
  const service=read('src/services/uploadService.js');
  assert.match(ui,/MAX_DURATION = 120/);
  assert.match(ui,/MAX_FILE_SIZE = 100 \* 1024 \* 1024/);
  assert.match(ui,/posterPreparationMs,/);
  assert.match(ui,/posterUploadMs,/);
  assert.match(service,/storageConfirmationObservedMs/);
  const timingLog=service.match(/console\.info\("\[Fazajoo video transfer timing\]", \{([\s\S]*?)\}\)/)?.[1] || '';
  assert.ok(timingLog);
  assert.doesNotMatch(timingLog,/token|userId|file\.name|uploadId|url/i);
});
