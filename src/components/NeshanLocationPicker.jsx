import { useEffect, useRef, useState } from "react";

import * as maplibregl from "maplibre-gl";
import { FAZAJOO_MAP_STYLE } from "./FazajooMapConfig.js";

import "maplibre-gl/dist/maplibre-gl.css";

import "./NeshanLocationPicker.css";
import iranCitiesWithCoordinates from "../data/iran-cities-with-coordinates.json";
import { getKnownCityCenter } from "../utils/mapCityView.js";
import { animateCityFlight } from "../utils/mapCityFlight.js";

const DEFAULT_CENTER = [53.5, 32.4]; // Iran-wide fallback; never a property location



function normalizeCityName(value = "") {
  return String(value)
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replaceAll("\u200C", " ")
    .replaceAll("\u200D", " ")
    .replaceAll("\u200E", " ")
    .replaceAll("\u200F", " ")
    .replace(/\s+/g, " ");
}

export default function NeshanLocationPicker({
  value,
  onChange,
  city = "",
  disabled = false,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const lastFormCityRef = useRef(normalizeCityName(city));
  const cancelCityFlightRef = useRef(null);

  const stopCityFlight = () => {
    cancelCityFlightRef.current?.();
    cancelCityFlightRef.current = null;
  };
  const flyToCity = (map, center, zoom = 12) => {
    stopCityFlight();
    const reducedMotion = typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cancelCityFlightRef.current = animateCityFlight(map, center, { zoom, reducedMotion });
  };

  const [status, setStatus] = useState("loading");
  const [geoStatus, setGeoStatus] = useState("idle");

  const [showLocationConsent, setShowLocationConsent] =
    useState(false);


  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Map lifecycle
  // oxlint-disable react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapElementRef.current) {
      return undefined;
    }

    let cancelled = false;

    const rawLat = value?.lat;
    const rawLng = value?.lng;

    const hasValue =
      rawLat !== null &&
      rawLat !== undefined &&
      rawLat !== "" &&
      rawLng !== null &&
      rawLng !== undefined &&
      rawLng !== "" &&
      Number.isFinite(Number(rawLat)) &&
      Number.isFinite(Number(rawLng));

    const cityCenter = getKnownCityCenter(city, iranCitiesWithCoordinates);
    const center = hasValue
      ? [Number(rawLng), Number(rawLat)]
      : cityCenter || DEFAULT_CENTER;

    setStatus("loading");

    try {
      const map = new maplibregl.Map({
        container: mapElementRef.current,
        style: FAZAJOO_MAP_STYLE,
        center,
        zoom: hasValue ? 15 : cityCenter ? 12 : 5,
        attributionControl: true,
      });

      mapRef.current = map;

      map.addControl(
        new maplibregl.NavigationControl({
          showCompass: false,
          showZoom: true,
        }),
        "top-left"
      );

      const drawPoint = (lat, lng) => {
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
          return;
        }

        const markerElement =
          document.createElement("div");

        markerElement.className =
          "neshan-location-picker__marker";

        markerRef.current = new maplibregl.Marker({
          element: markerElement,
          anchor: "center",
        })
          .setLngLat([lng, lat])
          .addTo(map);
      };

      map.__fazajooDrawPoint = drawPoint;

      if (hasValue) {
        drawPoint(
          Number(value.lat),
          Number(value.lng)
        );
      }

      map.on("load", () => {
        if (cancelled) {
          return;
        }

        setStatus("ready");

        window.setTimeout(() => {
          map.resize();
        }, 50);
      });

      // A user's drag must interrupt the flight, not trigger its second phase.
      map.on("dragstart", stopCityFlight);

      map.on("error", (event) => {
        if (!map.isStyleLoaded()) setStatus("error");
        console.error(
          "Neshan MapLibre error:",
          event?.error || event
        );
      });

      map.on("click", (event) => {
        if (disabled) {
          return;
        }
        stopCityFlight();

        const lat = Number(
          event.lngLat.lat.toFixed(6)
        );

        const lng = Number(
          event.lngLat.lng.toFixed(6)
        );

        drawPoint(lat, lng);

        onChangeRef.current?.({
          lat,
          lng,
        });
      });
    } catch (error) {
      console.error(
        "Neshan MapLibre load error:",
        error
      );

      setStatus("error");
    }

    return () => {
      cancelled = true;
      stopCityFlight();

      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [disabled]);
  // oxlint-enable react-hooks/exhaustive-deps

  // The edit form receives its saved coordinates asynchronously. The map is
  // mounted before that data arrives, so synchronize the marker and viewport
  // without recreating the map or changing the saved value.
  const savedLat = value?.lat;
  const savedLng = value?.lng;
  // A city chosen in the form travels through a wide overview before zooming in.
  // Ignore initial hydration, incomplete city names, and already-pinned listings.
  // The timer prevents a separate flight for each keystroke in the city field.
  useEffect(() => {
    if (status !== "ready") return undefined;
    const name = normalizeCityName(city);
    if (name === lastFormCityRef.current) return undefined;
    lastFormCityRef.current = name;
    stopCityFlight();

    const hasSavedPoint = savedLat !== null && savedLat !== undefined && savedLat !== "" &&
      savedLng !== null && savedLng !== undefined && savedLng !== "" &&
      Number.isFinite(Number(savedLat)) && Number.isFinite(Number(savedLng));
    if (hasSavedPoint) return undefined;
    const cityCenter = getKnownCityCenter(name, iranCitiesWithCoordinates);
    if (!cityCenter) return undefined;

    const delay = window.setTimeout(() => {
      const map = mapRef.current;
      if (map) flyToCity(map, cityCenter, 12);
    }, 350);
    return () => window.clearTimeout(delay);
    // Viewport-only: no onChange, no stored coordinates and no auto-marker.
  }, [city, status, savedLat, savedLng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const hasSavedPoint =
      savedLat !== null && savedLat !== undefined && savedLat !== "" &&
      savedLng !== null && savedLng !== undefined && savedLng !== "" &&
      Number.isFinite(Number(savedLat)) && Number.isFinite(Number(savedLng));

    if (!hasSavedPoint) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const lat = Number(savedLat);
    const lng = Number(savedLng);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    stopCityFlight();
    map.__fazajooDrawPoint?.(lat, lng);
    const current = map.getCenter();
    if (Math.abs(current.lat - lat) > 0.00001 || Math.abs(current.lng - lng) > 0.00001) {
      map.jumpTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15) });
    }
  }, [savedLat, savedLng]);

  const requestCurrentLocation = () => {
    if (disabled || geoStatus === "loading") return;
    if (!navigator.geolocation) { setGeoStatus("unsupported"); return; }
    if (!window.isSecureContext) { setGeoStatus("insecure"); return; }
    setGeoStatus("loading");
    const onPosition = (position) => {
      const lat = Number(position.coords.latitude);
      const lng = Number(position.coords.longitude);
      const accuracy = Number(position.coords.accuracy);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(accuracy) || accuracy > 1000) {
        setGeoStatus("inaccurate");
        return;
      }
      const map = mapRef.current;
      stopCityFlight();
      if (map) map.flyTo({ center: [lng, lat], zoom: accuracy <= 100 ? 16 : 13, essential: true });
      // This only pans the map; the user chooses the actual listing location manually.
      setGeoStatus("success");
    };
    const onFallbackError = (error) => {
      setGeoStatus(error?.code === 1 ? "denied" : error?.code === 3 ? "timeout" : "error");
    };
    navigator.geolocation.getCurrentPosition(onPosition, (error) => {
      if (error?.code === 1) { setGeoStatus("denied"); return; }
      // Desktop GPS is often unavailable. Retry once with network location.
      navigator.geolocation.getCurrentPosition(onPosition, onFallbackError, {
        enableHighAccuracy: false, timeout: 15000, maximumAge: 300000,
      });
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };

  const panMap = (x, y) => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    map.panBy([x, y], {
      duration: 260,
    });
  };

  const hasSelectedLocation =
    value?.lat !== null &&
    value?.lat !== undefined &&
    value?.lat !== "" &&
    value?.lng !== null &&
    value?.lng !== undefined &&
    value?.lng !== "";

  return (
    <div className="neshan-location-picker">
      <div className="neshan-location-picker__heading">
        <div>
          <strong>
            محدوده تقریبی روی نقشه
          </strong>

          <small>
            روی نقشه بزن تا محل فضا مشخص
            شود. موقعیت دقیق برای کاربران
            عمومی نمایش داده نمی‌شود.
          </small>
        </div>

        {hasSelectedLocation ? (
          <span>✓ انتخاب شد</span>
        ) : (
          <span>اختیاری</span>
        )}
      </div>

      {!hasSelectedLocation && (
        <p className="neshan-location-picker__unselected" role="status" style={{ margin: "6px 0 10px", fontSize: "0.84rem", color: "#735b49" }}>
          هنوز نقطه‌ای ثبت نشده است. نمایش مرکز شهر فقط برای راهنمایی است و به معنی محل آگهی نیست؛ برای ثبت موقعیت روی نقشه کلیک کن.
        </p>
      )}
      {!disabled &&
        status !== "missing-key" && (
          <div className="neshan-location-picker__tools">
            <button
              type="button"
              className="neshan-location-picker__locate"
              onClick={() =>
                setShowLocationConsent(
                  true
                )
              }
              disabled={
                geoStatus === "loading"
              }
            >
              <span aria-hidden="true">
                📍
              </span>

              {geoStatus === "loading"
                ? "در حال پیدا کردن موقعیت…"
                : "موقعیت فعلی من"}
            </button>

            {geoStatus === "success" && (
              <small>
                موقعیت پیشنهادی دستگاه روی نقشه باز شد. این موقعیت ممکن است دقیق نباشد؛ برای ثبت محل ملک، روی نقطه صحیح نقشه کلیک کن.
              </small>
            )}

            {geoStatus === "inaccurate" && (
              <small>موقعیت گزارش‌شده توسط مرورگر دقیق نیست. می‌توانی شهر آگهی را در فرم انتخاب کنی و نقطه صحیح ملک را به‌صورت دستی روی نقشه مشخص کنی.</small>
            )}

            {geoStatus === "denied" && (
              <small>
                اجازه دسترسی به موقعیت داده
                نشد؛ می‌توانی محل را دستی
                روی نقشه انتخاب کنی.
              </small>
            )}

            {geoStatus === "insecure" && (
              <small>برای موقعیت فعلی، صفحه باید با HTTPS یا localhost باز شود.</small>
            )}
            {geoStatus === "timeout" && (
              <small>زمان دریافت موقعیت تمام شد. GPS یا سرویس موقعیت‌یابی دستگاه و اجازه مرورگر را بررسی کن؛ در غیر این صورت محل را دستی روی نقشه انتخاب کن.</small>
            )}
            {geoStatus === "error" && (
              <small>
                موقعیت فعلی دریافت نشد؛ محل
                را دستی روی نقشه انتخاب کن.
              </small>
            )}

            {geoStatus ===
              "unsupported" && (
              <small>
                مرورگر شما موقعیت مکانی را
                پشتیبانی نمی‌کند.
              </small>
            )}
          </div>
        )}

      {status === "missing-key" ? (
        <div className="neshan-location-picker__message">
          کلید نقشه نشان هنوز در فایل محیطی
          فضاجو تنظیم نشده است.
        </div>
      ) : (
        <div className="neshan-location-picker__map-wrap">
          <div
            ref={mapElementRef}
            className="neshan-location-picker__map"
          />

          {!disabled &&
            status === "ready" && (
              <div
                className="fazajoo-map-pan"
                aria-label="کنترل جابه‌جایی نقشه"
              >
                <button
                  type="button"
                  className="fazajoo-map-pan__up"
                  onClick={() =>
                    panMap(0, -120)
                  }
                  aria-label="حرکت نقشه به بالا"
                >
                  ↑
                </button>

                <button
                  type="button"
                  className="fazajoo-map-pan__right"
                  onClick={() =>
                    panMap(120, 0)
                  }
                  aria-label="حرکت نقشه به راست"
                >
                  →
                </button>

                <button
                  type="button"
                  className="fazajoo-map-pan__down"
                  onClick={() =>
                    panMap(0, 120)
                  }
                  aria-label="حرکت نقشه به پایین"
                >
                  ↓
                </button>

                <button
                  type="button"
                  className="fazajoo-map-pan__left"
                  onClick={() =>
                    panMap(-120, 0)
                  }
                  aria-label="حرکت نقشه به چپ"
                >
                  ←
                </button>
              </div>
            )}

          {status === "loading" && (
            <div className="neshan-location-picker__overlay">
              در حال بارگذاری نقشه نشان…
            </div>
          )}

          {status === "error" && (
            <div className="neshan-location-picker__overlay">
              نقشه نشان بارگذاری نشد. اتصال
              اینترنت و کلید دسترسی را بررسی
              کن.
            </div>
          )}
        </div>
      )}

      {hasSelectedLocation &&
        !disabled && (
          <button
            type="button"
            className="neshan-location-picker__clear"
            onClick={() =>
              onChange?.({
                lat: null,
                lng: null,
              })
            }
          >
            پاک کردن موقعیت انتخاب‌شده
          </button>
        )}

      {showLocationConsent && (
        <div
          className="fazajoo-location-consent"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fazajoo-location-consent-title"
        >
          <div
            className="fazajoo-location-consent__backdrop"
            onClick={() =>
              setShowLocationConsent(
                false
              )
            }
          />

          <div className="fazajoo-location-consent__card">
            <div
              className="fazajoo-location-consent__icon"
              aria-hidden="true"
            >
              📍
            </div>

            <strong id="fazajoo-location-consent-title">
              پیدا کردن موقعیت فعلی شما
            </strong>

            <p>
              فضاجو فقط با اجازه شما از
              موقعیت دستگاه استفاده می‌کند
              تا نقشه را نزدیک محل فعلی باز
              کند. بعد از آن می‌توانید نقطه
              را روی نقشه اصلاح کنید.
            </p>

            <small>
              موقعیت دقیق در صفحه عمومی آگهی
              نمایش داده نمی‌شود.
            </small>

            <div className="fazajoo-location-consent__actions">
              <button
                type="button"
                className="fazajoo-location-consent__accept"
                onClick={() => {
                  setShowLocationConsent(
                    false
                  );

                  requestCurrentLocation();
                }}
              >
                ادامه و درخواست اجازه
              </button>

              <button
                type="button"
                className="fazajoo-location-consent__cancel"
                onClick={() =>
                  setShowLocationConsent(
                    false
                  )
                }
              >
                فعلاً نه
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
