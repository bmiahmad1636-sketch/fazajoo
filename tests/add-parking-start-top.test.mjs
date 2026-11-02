import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/pages/AddParking.jsx", import.meta.url), "utf8");

test("registration form never auto-focuses a below-the-fold title field", () => {
  assert.doesNotMatch(source, /\bautoFocus\b/);
});

test("registration starts at the page top when mounted", () => {
  assert.match(source, /useLayoutEffect\(\(\) => \{\s*window\.scrollTo\(\{\s*top:\s*0,\s*left:\s*0,\s*behavior:\s*"instant"/);
  assert.match(source, /behavior:\s*"instant"\s*\}\);\s*\}, \[\]\);/);
});

test("next and previous step scrolling behavior remains unchanged", () => {
  assert.match(source, /const goToNextStep = \(\) => \{/);
  assert.match(source, /const goToPreviousStep = \(\) => \{/);
  assert.equal((source.match(/behavior:\s*"smooth"/g) || []).length, 2);
});
