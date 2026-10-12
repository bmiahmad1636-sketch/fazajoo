import * as maplibregl from "maplibre-gl";

// Use a same-origin worker instead of the blob worker that some browsers block.

// A self-contained style avoids the cross-origin Neshan light.json request.
// Raster tiles are requested directly; no Api-Key is attached to OSM requests.
export const FAZAJOO_MAP_STYLE = {
  version: 8,
  name: "Fazajoo OpenStreetMap",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: 'Â© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};
