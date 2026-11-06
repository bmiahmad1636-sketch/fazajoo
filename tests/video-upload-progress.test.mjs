import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { videoTransferPercent, videoUploadStageLabel, videoUploadPhaseLabel } from '../src/utils/videoUploadProgress.js';
const require = createRequire(import.meta.url);
const jobTracker = require('../backend/src/utils/videoUploadProgress.js');
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const uuid = (n) => `a0000000-0000-4000-a000-${String(n).padStart(12,'0')}`;

test('two equal-sized upload legs are measured by transmitted bytes, never by an artificial 0..90 cap', () => {
  assert.equal(videoTransferPercent({stage:'browser',loaded:0,total:100}),0);
  assert.equal(videoTransferPercent({stage:'browser',loaded:50,total:100}),25);
  assert.equal(videoTransferPercent({stage:'browser',loaded:100,total:100}),50);
  assert.equal(videoTransferPercent({stage:'storage-wait'}),50);
  assert.equal(videoTransferPercent({stage:'storage',loaded:0,total:100}),50);
  assert.equal(videoTransferPercent({stage:'storage',loaded:20,total:100}),60);
  assert.equal(videoTransferPercent({stage:'storage',loaded:50,total:100}),75);
  assert.equal(videoTransferPercent({stage:'storage',loaded:80,total:100}),90);
  assert.equal(videoTransferPercent({stage:'storage',loaded:100,total:100}),100);
  assert.equal(videoTransferPercent({stage:'confirming'}),100);
  assert.equal(videoTransferPercent({stage:'saved'}),100);
  assert.equal(videoTransferPercent({stage:'ready'}),100);
});

test('progress computation clamps malformed or overflowing reports safely', () => {
  assert.equal(videoTransferPercent({stage:'browser',loaded:300,total:100}),50);
  assert.equal(videoTransferPercent({stage:'storage',loaded:-1,total:100}),50);
  assert.equal(videoTransferPercent({stage:'storage',loaded:0,total:0}),50);
  assert.equal(videoTransferPercent({stage:'invalid',loaded:90,total:100}),0);
  assert.match(videoUploadStageLabel('storage'),/فضای ذخیره/);
});

test('backend tracks real bytes and confirms completion separately', () => {
  const id=uuid(123);
  assert.equal(jobTracker.start(id,'user-a',500),true);
  assert.deepEqual(jobTracker.get(id,'user-a'),{stage:'storage',loaded:0,total:500});
  jobTracker.update(id,'user-a',150);
  assert.equal(jobTracker.get(id,'user-a').loaded,150);
  jobTracker.update(id,'user-a',100); // never regress on delayed chunks
  assert.equal(jobTracker.get(id,'user-a').loaded,150);
  jobTracker.update(id,'user-a',1000000);
  assert.equal(jobTracker.get(id,'user-a').loaded,500);
  assert.equal(jobTracker.get(id,'user-a').stage,'confirming');
  jobTracker.finish(id,'user-a');
  assert.deepEqual(jobTracker.get(id,'user-a'),{stage:'saved',loaded:500,total:500});
});

test('upload progress is user-bound; guessing another upload ID discloses nothing', () => {
  const id=uuid(124);
  assert.equal(jobTracker.start(id,'user-a',100),true);
  assert.equal(jobTracker.get(id,'user-b'),null);
  jobTracker.update(id,'user-b',80);
  assert.equal(jobTracker.get(id,'user-a').loaded,0);
  jobTracker.finish(id,'user-b');
  assert.equal(jobTracker.get(id,'user-a').stage,'storage');
  assert.equal(jobTracker.start(id,'user-a',100),false);
  assert.equal(jobTracker.start('not-valid','user-a',100),false);
  assert.equal(jobTracker.start(uuid(125),'user-a',101*1024*1024),false);
  jobTracker.fail(id,'user-a');
  assert.equal(jobTracker.get(id,'user-a').stage,'failed');
});

test('progress endpoint requires normal server authentication and limits data returned', () => {
  const route=read('backend/src/routes/uploads.routes.js');
  const controller=read('backend/src/controllers/uploads.controller.js');
  const tracker=read('backend/src/utils/videoUploadProgress.js');
  assert.match(route,/"\/ad-video-progress\/:uploadId",\s*requireAuth,\s*controller\.getAdVideoProgress/);
  assert.match(controller,/videoProgress\.get\(request\.params\.uploadId, request\.user\?\.id\)/);
  assert.match(tracker,/return \{ stage: job\.stage, loaded: job\.loaded, total: job\.total \}/);
  assert.doesNotMatch(tracker,/return \{[^\n]*(token|key|url|fileName)/);
});

test('browser upload byte events, backend transfer polling and separate confirmation are integrated', () => {
  const service=read('src/services/uploadService.js');
  const storage=read('backend/src/services/storage.service.js');
  const controller=read('backend/src/controllers/uploads.controller.js');
  const ui=read('src/components/VideoUploader.jsx');
  assert.match(service,/xhr\.upload\.onprogress/);
  assert.match(service,/xhr\.upload\.onload/);
  assert.match(service,/\/uploads\/ad-video-progress\/\$\{uploadId\}/);
  assert.match(service,/active = false/);
  assert.match(service,/cache: "no-store"/);
  assert.match(storage,/new Transform\(/);
  assert.match(storage,/onProgress\(Math\.min\(size, bytesRead\)\)/);
  assert.match(controller,/videoProgress\.finish\(uploadId, userId\)/);
  assert.match(ui,/videoTransferPercent\(update\)/);
  assert.match(ui,/role=\{transferActive \|\| uploadStage === "ready" \? "progressbar" : "status"\}/);
  assert.match(ui,/\["browser", "storage-wait", "storage"\]/);
});

test('video duration/size limits remain in place and poster wait is bounded for mobile', () => {
  const ui=read('src/components/VideoUploader.jsx');
  const backend=read('backend/src/controllers/uploads.controller.js');
  assert.match(ui,/MAX_DURATION = 120/);
  assert.match(ui,/MAX_FILE_SIZE = 100 \* 1024 \* 1024/);
  assert.match(ui,/setTimeout\(\(\) => finish\(\), 8000\)/);
  assert.match(ui,/video\.preload = "auto"/);
  assert.match(backend,/duration > 120\.5/);
  assert.match(backend,/100 \* 1024 \* 1024/);
});
