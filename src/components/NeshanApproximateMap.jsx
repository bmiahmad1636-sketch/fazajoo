import { useEffect, useRef, useState } from "react";
import maplibregl from "@neshan-maps-platform/maplibre-sdk";
import "@neshan-maps-platform/maplibre-sdk/style.css";
import "./NeshanApproximateMap.css";

const MAP_STYLE = "https://static.neshan.org/sdk/maplibre/styles/light.json";

export default function NeshanApproximateMap({ location, city = "" }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const [status, setStatus] = useState("loading");

  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  const hasLocation =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 24 &&
    lat <= 40 &&
    lng >= 43 &&
    lng <= 64;

  useEffect(() => {
    if (!mapElementRef.current || !hasLocation) return undefined;

    const apiKey = String(
      import.meta.env.VITE_NESHAN_WEB_MAP_KEY || ""
    ).trim();

    if (!apiKey) {
      setStatus("missing-key");
      return undefined;
    }

    setStatus("loading");

    try {
      const map = new maplibregl.Map({
        container: mapElementRef.current,
        style: MAP_STYLE,
        center: [lng, lat],
        zoom: 13,
        apiKey,
        attributionControl: true,
        interactive: true,
      });

      mapRef.current = map;

      map.addControl(
        new maplibregl.NavigationControl({
          showCompass: false,
          showZoom: true,
        }),
        "top-left"
      );

      map.on("load", () => {
        setStatus("ready");

        map.addSource("fazajoo-approximate-area", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
            properties: {},
          },
        });

        map.addLayer({
          id: "fazajoo-approximate-area-fill",
          type: "circle",
          source: "fazajoo-approximate-area",
          paint: {
            "circle-radius": 42,
            "circle-color": "#0f5a4b",
            "circle-opacity": 0.16,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#0f5a4b",
            "circle-stroke-opacity": 0.7,
          },
        });

        window.setTimeout(() => map.resize(), 50);
      });

      map.on("error", (event) => {
        console.error("Neshan details map error:", event?.error || event);
      });
    } catch (error) {
      console.error("Neshan details map load error:", error);
      setStatus("error");
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [hasLocation, lat, lng]);

  const panMap = (x, y) => {
    const map = mapRef.current;
    if (!map) return;
    map.panBy([x, y], { duration: 260 });
  };

  if (!hasLocation) return null;

  return (
    <div className="neshan-approximate-map">
      <div
        ref={mapElementRef}
        className="neshan-approximate-map__canvas"
        aria-label={`محدوده تقریبی ${city || "آگهی"} روی نقشه`}
      />

      {status === "ready" && (
        <div className="fazajoo-details-map-pan" aria-label="کنترل جابه‌جایی نقشه">
          <button type="button" className="fazajoo-details-map-pan__up" onClick={() => panMap(0, -120)} aria-label="حرکت نقشه به بالا">↑</button>
          <button type="button" className="fazajoo-details-map-pan__right" onClick={() => panMap(120, 0)} aria-label="حرکت نقشه به راست">→</button>
          <button type="button" className="fazajoo-details-map-pan__down" onClick={() => panMap(0, 120)} aria-label="حرکت نقشه به پایین">↓</button>
          <button type="button" className="fazajoo-details-map-pan__left" onClick={() => panMap(-120, 0)} aria-label="حرکت نقشه به چپ">←</button>
        </div>
      )}

      {status === "loading" && (
        <div className="neshan-approximate-map__status">
          در حال بارگذاری نقشه…
        </div>
      )}

      {(status === "missing-key" || status === "error") && (
        <div className="neshan-approximate-map__status neshan-approximate-map__status--error">
          نمایش نقشه در حال حاضر در دسترس نیست.
        </div>
      )}

      <div className="neshan-approximate-map__privacy">
        محدوده نمایش‌داده‌شده تقریبی است و نشانی دقیق آگهی را نشان نمی‌دهد.
      </div>
    </div>
  );
}
