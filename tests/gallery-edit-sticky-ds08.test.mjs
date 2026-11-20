import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const gallery = read('src/pages/ParkingDetails.jsx');
const detailsCSS = read('src/pages/ParkingDetailsGalleryDS08.css');
const edit = read('src/pages/EditParking.jsx');
const stickyCSS = read('src/pages/EditParkingStickyDS08.css');
test('DS08 only enhances listings with a real photo', () => {
  assert.match(gallery, /activeImage \? "parking-details-gallery--with-photo" : ""/);
  assert.match(gallery, /parking-details-gallery__ambient/);
  assert.match(gallery, /src=\{activeImage\} alt=""/);
  assert.match(gallery, /className="parking-details-gallery__image-button"/);
  assert.match(gallery, /setIsGalleryOpen\(true\)/);
  assert.match(detailsCSS, /object-fit: contain/);
  assert.match(detailsCSS, /filter: blur\(24px\)/);
  assert.match(detailsCSS, /gallery--with-photo/);
  assert.match(detailsCSS, /@media \(max-width: 620px\)/);
});
test('DS08 keeps image carousel and placeholder intact', () => {
  assert.match(gallery, /showPreviousImage\(\)/);
  assert.match(gallery, /showNextImage\(\)/);
  assert.match(gallery, /parking-details-gallery__placeholder/);
  assert.match(gallery, /galleryImages\.length > 1/);
});
test('DS08 sticky preview is bounded and mobile is normal flow', () => {
  assert.match(edit, /import "\.\/EditParkingStickyDS08\.css"/);
  assert.match(stickyCSS, /position: sticky/);
  assert.match(stickyCSS, /max-height: calc\(100dvh - 102px\)/);
  assert.match(stickyCSS, /overflow-y: auto/);
  assert.match(stickyCSS, /@media \(max-width: 1050px\)/);
  assert.match(stickyCSS, /position: static/);
  assert.doesNotMatch(stickyCSS, /position: fixed/);
});
