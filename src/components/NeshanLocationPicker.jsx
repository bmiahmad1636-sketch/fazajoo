import { useEffect, useRef, useState } from "react";
import "./NeshanLocationPicker.css";

const NESHAN_CSS = "https://static.neshan.org/sdk/leaflet/1.4.0/leaflet.css";
const NESHAN_JS = "https://static.neshan.org/sdk/leaflet/1.4.0/leaflet.js";
const DEFAULT_CENTER = [32.0089, 51.8668]; // Shahreza

function loadNeshanSdk() {
  if (window.L?.Map) return Promise.resolve(window.L);

  if (!document.querySelector(`link[href="${NESHAN_CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = NESHAN_CSS;
    document.head.appendChild(link);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${NESHAN_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = NESHAN_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function NeshanLocationPicker({ value, onChange, disabled = false }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const pointRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    const apiKey = String(import.meta.env.VITE_NESHAN_WEB_MAP_KEY || "").trim();

    if (!apiKey) {
      setStatus("missing-key");
      return undefined;
    }

    loadNeshanSdk()
      .then((L) => {
        if (cancelled || !mapElementRef.current || !L?.Map) return;

        const hasValue = Number.isFinite(Number(value?.lat)) && Number.isFinite(Number(value?.lng));
        const center = hasValue ? [Number(value.lat), Number(value.lng)] : DEFAULT_CENTER;

        const map = new L.Map(mapElementRef.current, {
          key: apiKey,
          maptype: "dreamy",
          poi: true,
          traffic: false,
          center,
          zoom: hasValue ? 15 : 12,
        });

        mapRef.current = map;

        const drawPoint = (lat, lng) => {
          if (pointRef.current) {
            pointRef.current.setLatLng([lat, lng]);
          } else {
            pointRef.current = L.circleMarker([lat, lng], {
              radius: 9,
              weight: 4,
              color: "#ffffff",
              fillColor: "#1f5b48",
              fillOpacity: 1,
            }).addTo(map);
          }
        };

        if (hasValue) drawPoint(Number(value.lat), Number(value.lng));

        map.on("click", (event) => {
          if (disabled) return;
          const lat = Number(event.latlng.lat.toFixed(6));
          const lng = Number(event.latlng.lng.toFixed(6));
          drawPoint(lat, lng);
          onChangeRef.current?.({ lat, lng });
        });

        setStatus("ready");
        window.setTimeout(() => map.invalidateSize(), 50);
      })
      .catch((error) => {
        console.error("Neshan map load error:", error);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      pointRef.current = null;
    };
  }, [disabled]);

  return (
    <div className="neshan-location-picker">
      <div className="neshan-location-picker__heading">
        <div>
          <strong>محدوده تقریبی روی نقشه</strong>
          <small>روی نقشه بزن تا محل فضا مشخص شود. موقعیت دقیق برای کاربران عمومی نمایش داده نمی‌شود.</small>
        </div>
        {value?.lat && value?.lng ? <span>✓ انتخاب شد</span> : <span>اختیاری</span>}
      </div>

      {status === "missing-key" ? (
        <div className="neshan-location-picker__message">
          کلید نقشه نشان هنوز در فایل محیطی فضاجو تنظیم نشده است.
        </div>
      ) : (
        <div className="neshan-location-picker__map-wrap">
          <div ref={mapElementRef} className="neshan-location-picker__map" />
          {status === "loading" && <div className="neshan-location-picker__overlay">در حال بارگذاری نقشه نشان…</div>}
          {status === "error" && <div className="neshan-location-picker__overlay">نقشه نشان بارگذاری نشد. اتصال اینترنت و کلید دسترسی را بررسی کن.</div>}
        </div>
      )}

      {value?.lat && value?.lng && !disabled && (
        <button type="button" className="neshan-location-picker__clear" onClick={() => onChange?.({ lat: null, lng: null })}>
          پاک کردن موقعیت انتخاب‌شده
        </button>
      )}
    </div>
  );
}
