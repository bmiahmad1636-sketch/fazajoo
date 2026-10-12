import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { FAZAJOO_MAP_STYLE } from "./FazajooMapConfig.js";
import "maplibre-gl/dist/maplibre-gl.css";
import "./NeshanApproximateMap.css";

export default function NeshanApproximateMap({ location, city = "" }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const [status, setStatus] = useState("loading");

  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= 24 && lat <= 40 && lng >= 43 && lng <= 64;

  useEffect(() => {
    if (!mapElementRef.current || !hasLocation) return undefined;
    let disposed = false;
    let map;
    let marker;
    let resizeTimer;
    setStatus("loading");

    try {
      map = new maplibregl.Map({
        container: mapElementRef.current,
        style: FAZAJOO_MAP_STYLE,
        center: [lng, lat],
        zoom: 13,
        attributionControl: false,
        interactive: true,
      });
      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl({
        showCompass: false,
        showZoom: true,
      }), "top-left");
      // Keep required map-data attribution, but in the compact disclosure control.
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

      // A DOM marker stays visible even if the map style reloads or layers change.
      // This is an approximate AREA, deliberately not an exact-location pin.
      const area = document.createElement("div");
      area.setAttribute("aria-label", "محدوده تقریبی آگهی");
      area.setAttribute("title", "محدوده تقریبی آگهی، نه نشانی دقیق");
      Object.assign(area.style, {
        width: "116px",
        height: "116px",
        borderRadius: "50%",
        background: "rgba(15, 90, 75, 0.23)",
        border: "3px solid #0f5a4b",
        boxShadow: "0 0 0 6px rgba(15,90,75,0.10)",
        boxSizing: "border-box",
        pointerEvents: "none",
      });
      marker = new maplibregl.Marker({ element: area, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);

      map.on("load", () => {
        if (disposed) return;
        setStatus("ready");
        resizeTimer = window.setTimeout(() => {
          if (!disposed) map.resize();
        }, 100);
      });
      map.on("error", (event) => {
        console.error("Fazajoo details map error:", event?.error || event);
        if (!disposed && !map.isStyleLoaded()) setStatus("error");
      });
    } catch (error) {
      console.error("Fazajoo details map initialization error:", error);
      if (!disposed) setStatus("error");
    }

    return () => {
      disposed = true;
      window.clearTimeout(resizeTimer);
      marker?.remove();
      map?.remove();
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [hasLocation, lat, lng]);

  const panMap = (x, y) => mapRef.current?.panBy([x, y], { duration: 260 });
  if (!hasLocation) return null;

  return (
    <div className="neshan-approximate-map">
      <div ref={mapElementRef} className="neshan-approximate-map__canvas"
        aria-label={`محدوده تقریبی ${city || "آگهی"} روی نقشه`} />

      {status === "ready" && (
        <div className="fazajoo-details-map-pan" aria-label="کنترل جابه‌جایی نقشه">
          <button type="button" className="fazajoo-details-map-pan__up" onClick={() => panMap(0, -120)} aria-label="حرکت نقشه به بالا">↑</button>
          <button type="button" className="fazajoo-details-map-pan__right" onClick={() => panMap(120, 0)} aria-label="حرکت نقشه به راست">→</button>
          <button type="button" className="fazajoo-details-map-pan__down" onClick={() => panMap(0, 120)} aria-label="حرکت نقشه به پایین">↓</button>
          <button type="button" className="fazajoo-details-map-pan__left" onClick={() => panMap(-120, 0)} aria-label="حرکت نقشه به چپ">←</button>
        </div>
      )}
      {status === "loading" && <div className="neshan-approximate-map__status">در حال بارگذاری نقشه…</div>}
      {status === "error" && <div className="neshan-approximate-map__status neshan-approximate-map__status--error">نمایش نقشه در حال حاضر در دسترس نیست.</div>}

      <div className="neshan-approximate-map__privacy" style={{
        position: "static", inset: "auto", transform: "none", width: "100%",
        boxSizing: "border-box", marginTop: 10, padding: "8px 12px",
        background: "transparent", boxShadow: "none", textAlign: "right",
      }}>
        محدوده نمایش‌داده‌شده تقریبی است و نشانی دقیق آگهی را نشان نمی‌دهد.
      </div>
    </div>
  );
}
