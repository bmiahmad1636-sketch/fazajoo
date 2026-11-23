import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("ED10 edit beautification stays scoped to EditParking and imports the final polish stylesheet", () => {
  const edit = read("src/pages/EditParking.jsx");
  const css = read("src/pages/EditParkingEditorialED10.css");
  assert.match(edit, /import "\.\/EditParkingEditorialED10\.css";/);
  assert.match(css, /\.edit-parking-page \.edit-parking-card__body > :is\(\.fj-po, \.fj-pr, \.fj-other, \.residential-fields, \.residential-request, \.fj-vo-wrap, \.fj-edit-surface\)/);
  assert.match(css, /\.edit-parking-page \.neshan-location-picker/);
  assert.doesNotMatch(css, /\.add-parking-page/);
});

test("Inline speciality request panels expose stable helper classes for edit-page-only polish", () => {
  const files = [
    ["src/components/ParkingRequestDetailsFields.jsx", "fj-edit-surface--parking-request-details"],
    ["src/components/WarehouseRequestFields.jsx", "fj-edit-surface--warehouse-request"],
    ["src/components/ShedRequestFields.jsx", "fj-edit-surface--shed-request"],
    ["src/components/GardenRequestFields.jsx", "fj-edit-surface--garden-request"],
    ["src/components/ShopRequestFields.jsx", "fj-edit-surface--shop-request"],
    ["src/components/LandRentalFields.jsx", "fj-edit-surface--land-rental"],
  ];
  for (const [file, cls] of files) {
    assert.match(read(file), new RegExp(cls));
  }
});
