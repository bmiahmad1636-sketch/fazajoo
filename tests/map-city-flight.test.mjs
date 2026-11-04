import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { animateCityFlight } from "../src/utils/mapCityFlight.js";

function fakeMap(zoom = 12) {
  const calls = [];
  const handlers = new Map();
  const map = {
    calls,
    getZoom: () => zoom,
    stop: () => { calls.push(["stop"]); },
    on: (event, handler) => { handlers.set(event, handler); calls.push(["on", event]); },
    off: (event, handler) => { if (handlers.get(event) === handler) handlers.delete(event); calls.push(["off", event]); },
    easeTo: (options) => { calls.push(["easeTo", options]); },
    flyTo: (options) => { calls.push(["flyTo", options]); },
    jumpTo: (options) => { calls.push(["jumpTo", options]); },
    finishOverview: () => { handlers.get("moveend")?.(); },
  };
  return map;
}

test("city visit zooms out first, then flies into the city without pin placement", () => {
  const map = fakeMap(13);
  const center = [51.42, 35.69];
  animateCityFlight(map, center);
  assert.equal(map.calls.filter(([name]) => name === "easeTo").length, 1);
  assert.equal(map.calls.filter(([name]) => name === "flyTo").length, 0);
  assert.equal(map.calls.find(([name]) => name === "easeTo")[1].zoom, 5);
  map.finishOverview();
  const flight = map.calls.find(([name]) => name === "flyTo");
  assert.ok(flight);
  assert.deepEqual(flight[1].center, center);
  assert.equal(flight[1].zoom, 12);
  assert.equal(map.calls.filter(([name]) => name === "jumpTo").length, 0);
  assert.equal(map.calls.filter(([name]) => name === "setLngLat").length, 0);
});

test("cancelling the overview never resumes the stale destination", () => {
  const map = fakeMap(12);
  const cancel = animateCityFlight(map, [51.42, 35.69]);
  cancel();
  map.finishOverview();
  assert.equal(map.calls.filter(([name]) => name === "flyTo").length, 0);
  assert.equal(map.calls.filter(([name]) => name === "stop").length, 2);
});

test("city can fly in directly when map is already zoomed out", () => {
  const map = fakeMap(4.5);
  animateCityFlight(map, [51.42, 35.69]);
  assert.equal(map.calls.filter(([name]) => name === "easeTo").length, 0);
  assert.equal(map.calls.filter(([name]) => name === "flyTo").length, 1);
});

test("reduced-motion preference uses a static viewport change", () => {
  const map = fakeMap(13);
  animateCityFlight(map, [51.42, 35.69], { reducedMotion: true });
  assert.equal(map.calls.filter(([name]) => name === "easeTo" || name === "flyTo").length, 0);
  assert.equal(map.calls.filter(([name]) => name === "jumpTo").length, 1);
});

test("invalid center does not move the map", () => {
  const map = fakeMap(13);
  animateCityFlight(map, [NaN, 35.69]);
  assert.equal(map.calls.length, 0);
});

test("shared location picker animates form-selected city without saving a location", () => {
  const source = readFileSync(new URL("../src/components/NeshanLocationPicker.jsx", import.meta.url), "utf8");
  assert.match(source, /lastFormCityRef\.current = name/);
  assert.match(source, /getKnownCityCenter\(name, iranCitiesWithCoordinates\)/);
  assert.match(source, /window\.setTimeout\(\(\) => \{[\s\S]*?flyToCity\(map, cityCenter, 12\)/);
  assert.doesNotMatch(source, /jumpToCity|cityQuery|citySearchStatus|neshan-location-picker__city-jump|رفتن به شهر آگهی/);
  assert.match(source, /موقعیت فعلی من/);
  assert.match(source, /setShowLocationConsent\(/);
  assert.match(source, /getKnownCityCenter\(name, iranCitiesWithCoordinates\)/);
  assert.match(source, /map\.on\("dragstart", stopCityFlight\)/);
  assert.match(source, /stopCityFlight\(\);\n      if \(map\) map\.flyTo/);
});


test("selected city is only a viewport hint and manual city navigation is removed", () => {
  const picker = readFileSync(new URL("../src/components/NeshanLocationPicker.jsx", import.meta.url), "utf8");
  const cityEffect = picker.slice(picker.indexOf('const savedLng = value?.lng;'), picker.indexOf('}, [city, status, savedLat, savedLng]);'));
  assert.match(cityEffect, /if \(hasSavedPoint\) return undefined/);
  assert.match(cityEffect, /flyToCity\(map, cityCenter, 12\)/);
  assert.doesNotMatch(cityEffect, /onChangeRef\.current|drawPoint\(|new maplibregl\.Marker/);
  assert.doesNotMatch(picker, /jumpToCity|cityQuery|citySearchStatus|neshan-location-picker__city-jump|رفتن به شهر آگهی/);
  assert.match(picker, /موقعیت فعلی من/);
});
