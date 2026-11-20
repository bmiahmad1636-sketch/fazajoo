import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = (file) => readFileSync(path.join(root, file), 'utf8');
const add = source('src/pages/AddParking.jsx');
const css = source('src/pages/AddParking.css');
const edit = source('src/pages/EditParking.jsx');

test('add: large progress sidebar and tips are absent from JSX', () => {
  for (const part of ['add-parking-sidebar', 'add-parking-progress-card', 'add-parking-steps', 'add-parking-tip', 'پیشرفت ثبت آگهی']) {
    assert.ok(!add.includes(part), part);
  }
});

test('add: old percentage and redundant hero badge are absent', () => {
  for (const part of ['visibleSteps', 'Math.round(progress)', 'add-parking-hero__badge', 'goToStep']) {
    assert.ok(!add.includes(part), part);
  }
});

test('add: form expands to a single column without a wasted sidebar', () => {
  assert.match(css, /\.add-parking-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.add-parking-layout\s*\{[^}]*max-width:\s*1120px/s);
});

test('add: functional step status inside form remains', () => {
  assert.match(add, /className="add-parking-form-header__step"/);
  assert.match(add, /مرحله \{displayedStep\}/);
});

test('add: validation and next/back/publish actions remain', () => {
  for (const part of ['validateStep(currentStep)', 'goToNextStep', 'goToPreviousStep', 'onClick={goToNextStep}', 'onClick={saveParking}', 'در حال انتشار']) {
    assert.ok(add.includes(part), part);
  }
});

test('add: wanted ads continue to skip the image step', () => {
  assert.match(add, /isWantedAd && step === 1 \? 3 : Math\.min\(step \+ 1, STEPS\.length\)/);
  assert.match(add, /isWantedAd && step === 3 \? 1 : Math\.max\(step - 1, 1\)/);
});

test('add: nine category forms still present', () => {
  for (const category of ['parking', 'storage', 'warehouse', 'shop', 'land', 'residential', 'villa', 'garden', 'other']) {
    assert.ok(add.includes(`value: "${category}"`), category);
  }
});

test('edit: fictitious completion percentage and side tip are absent', () => {
  for (const part of ['completionPercentage', 'edit-parking-completion', 'edit-parking-tip']) {
    assert.ok(!edit.includes(part), part);
  }
});

test('edit: live preview stays available', () => {
  assert.ok(edit.includes('className="edit-parking-preview"'));
  assert.ok(edit.includes('پیش‌نمایش زنده'));
});

test('edit: save and reset remain real actions', () => {
  for (const part of ['onSubmit={saveEdit}', 'resetChanges', 'hasChanges', 'edit-parking-button--save', 'ذخیره تغییرات']) {
    assert.ok(edit.includes(part), part);
  }
});

test('edit: form and preview retain their layout', () => {
  assert.ok(edit.includes('edit-parking-layout'));
  assert.ok(edit.includes('edit-parking-sidebar'));
  assert.ok(edit.includes('edit-parking-form'));
});
