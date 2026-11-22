import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const myCss = fs.readFileSync(new URL("../src/pages/MyParkingsMP01.css", import.meta.url), "utf8");
const favCss = fs.readFileSync(new URL("../src/pages/FavoritesFV01.css", import.meta.url), "utf8");
test("MPFV-02 color tokens retained in my listings after MPFV-03 spacing polish", () => {
  assert.match(myCss, /--mp-separator:#18382f/);
  assert.match(myCss, /\.my-parkings-page \.my-parkings-grid \{/);
  assert.match(myCss, /border:1px solid rgba\(20,61,47,.33\)!important/);
});
test("MPFV-02 brand color retained in favorites after MPFV-03 spacing polish", () => {
  assert.match(favCss, /--fv-separator:#18382f/);
  assert.match(favCss, /\.favorites-page \.favorites-grid \{/);
  assert.match(favCss, /border:1px solid rgba\(20,61,47,.33\)!important/);
});
