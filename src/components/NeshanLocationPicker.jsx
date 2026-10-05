import { useEffect, useRef, useState } from "react";

import maplibregl from "@neshan-maps-platform/maplibre-sdk";

import "@neshan-maps-platform/maplibre-sdk/style.css";

import "./NeshanLocationPicker.css";
import iranCitiesWithCoordinates from "../data/iran-cities-with-coordinates.json";

const DEFAULT_CENTER = [51.8668, 32.0089]; // Shahreza: [lng, lat]

const MAP_STYLE =
  "https://static.neshan.org/sdk/maplibre/styles/light.json";

const NESHAN_SEARCH_URL = "https://api.neshan.org/v1/search";

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

  const [status, setStatus] = useState("loading");
  const [geoStatus, setGeoStatus] = useState("idle");

  const [showLocationConsent, setShowLocationConsent] =
    useState(false);

  const [cityQuery, setCityQuery] = useState(city || "");
  const [cityMessage, setCityMessage] = useState("");
  const [citySearchStatus, setCitySearchStatus] =
    useState("idle");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (city) {
      setCityQuery(city);
    }
  }, [city]);

  // Map lifecycle
  // oxlint-disable react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapElementRef.current) {
      return undefined;
    }

    const apiKey = String(
      import.meta.env.VITE_NESHAN_WEB_MAP_KEY || ""
    ).trim();

    if (!apiKey) {
      setStatus("missing-key");
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

    const center = hasValue
      ? [Number(rawLng), Number(rawLat)]
      : DEFAULT_CENTER;

    setStatus("loading");

    try {
      const map = new maplibregl.Map({
        container: mapElementRef.current,
        style: MAP_STYLE,
        center,
        zoom: hasValue ? 15 : 12,
        apiKey,
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

      map.on("error", (event) => {
        console.error(
          "Neshan MapLibre error:",
          event?.error || event
        );
      });

      map.on("click", (event) => {
        if (disabled) {
          return;
        }

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

  const requestCurrentLocation = () => {
    if (
      disabled ||
      geoStatus === "loading"
    ) {
      return;
    }

    if (!navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }

    setGeoStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(
          position.coords.latitude.toFixed(6)
        );

        const lng = Number(
          position.coords.longitude.toFixed(6)
        );

        const map = mapRef.current;

        if (map) {
          map.flyTo({
            center: [lng, lat],
            zoom: 16,
            essential: true,
          });

          map.__fazajooDrawPoint?.(
            lat,
            lng
          );
        }

        onChangeRef.current?.({
          lat,
          lng,
        });

        setGeoStatus("success");
      },

      (error) => {
        console.warn(
          "Browser geolocation error:",
          error
        );

        setGeoStatus(
          error?.code === 1
            ? "denied"
            : "error"
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  };

  const jumpToCity = async () => {
    const map = mapRef.current;
    const name = normalizeCityName(cityQuery || city);

    if (!map || !name) {
      setCityMessage("نام شهر آگهی را وارد کن.");
      return;
    }

    if (citySearchStatus === "loading") {
      return;
    }

    setCitySearchStatus("loading");
    setCityMessage(`در حال پیدا کردن ${name}…`);

    const isInsideIran = (lat, lng) =>
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= 24 &&
      lat <= 40 &&
      lng >= 43 &&
      lng <= 64;

    const moveMap = (lat, lng) => {
      map.resize();
      map.flyTo({
        center: [lng, lat],
        zoom: 13,
        essential: true,
      });

      window.setTimeout(() => {
        map.resize();
      }, 250);

      setCityMessage(
        `نقشه روی ${name} رفت؛ حالا نقطه دقیق آگهی را روی نقشه انتخاب کن.`
      );
      setCitySearchStatus("success");
    };

    try {
      /*
       * مرحله اول: دیتاست داخلی خود فضاجو.
       * برای شهرهایی که مختصات معتبر دارند هیچ درخواست اینترنتی
       * به Search نشان لازم نیست.
       */
      const localMatch = Array.isArray(iranCitiesWithCoordinates)
        ? iranCitiesWithCoordinates.find((item) => {
            const itemName = normalizeCityName(item?.cityName || "");
            const lat = Number(item?.lat);
            const lng = Number(item?.lng);

            return (
              itemName === name &&
              isInsideIran(lat, lng)
            );
          })
        : null;

      if (localMatch) {
        moveMap(
          Number(localMatch.lat),
          Number(localMatch.lng)
        );
        return;
      }

      /*
       * مرحله دوم: فقط برای شهرهایی که در دیتاست داخلی مختصات ندارند.
       * مهم: فقط خود نام شهر را می‌فرستیم. نسخه قبلی عبارت «شهر ...»
       * را هم می‌فرستاد که سرویس نشان برای آن خطای 485 می‌داد.
       */
      const serviceKey = String(
        import.meta.env.VITE_NESHAN_SERVICE_KEY || ""
      ).trim();

      if (!serviceKey) {
        setCityMessage(
          `مختصات داخلی برای «${name}» موجود نیست و کلید سرویس نشان نیز تنظیم نشده است؛ محل را دستی روی نقشه انتخاب کن.`
        );
        setCitySearchStatus("idle");
        return;
      }

      const currentCenter = map.getCenter();

      const params = new URLSearchParams({
        term: name,
        lat: String(Number(currentCenter.lat)),
        lng: String(Number(currentCenter.lng)),
      });

      const response = await fetch(
        `${NESHAN_SEARCH_URL}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Api-Key": serviceKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Neshan search failed: ${response.status}`
        );
      }

      const data = await response.json();
      const items = Array.isArray(data?.items)
        ? data.items
        : [];

      const candidates = items
        .map((item) => {
          const lat = Number(item?.location?.y);
          const lng = Number(item?.location?.x);
          const title = normalizeCityName(item?.title || "");
          const address = normalizeCityName(item?.address || "");
          const type = String(item?.type || "").toLowerCase();

          let score = 0;

          if (title === name) score += 120;
          if (type === "region") score += 80;
          if (title.includes(name)) score += 40;
          if (address.includes(name)) score += 25;

          return { lat, lng, score };
        })
        .filter(
          ({ lat, lng, score }) =>
            isInsideIran(lat, lng) &&
            score >= 40
        )
        .sort((a, b) => b.score - a.score);

      if (!candidates.length) {
        setCityMessage(
          `موقعیت مطمئنی برای «${name}» پیدا نشد؛ لطفاً محل را دستی روی نقشه انتخاب کن.`
        );
        setCitySearchStatus("idle");
        return;
      }

      moveMap(candidates[0].lat, candidates[0].lng);
    } catch (error) {
      console.error("Neshan city search error:", error);

      setCityMessage(
        `موقعیت خودکار «${name}» دریافت نشد؛ لطفاً محل را دستی روی نقشه انتخاب کن.`
      );
      setCitySearchStatus("error");
    }
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

      {!disabled &&
        status !== "missing-key" && (
          <div className="neshan-location-picker__city-jump">
            <input
              type="text"
              value={cityQuery}
              onChange={(event) => {
                setCityQuery(
                  event.target.value
                );

                setCityMessage("");
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  event.preventDefault();
                  jumpToCity();
                }
              }}
              placeholder="مثلاً شهرضا، اصفهان، کاشان..."
              aria-label="شهر مقصد روی نقشه"
            />

            <button
              type="button"
              onClick={jumpToCity}
              disabled={
                citySearchStatus ===
                "loading"
              }
            >
              {citySearchStatus ===
              "loading"
                ? "در حال جستجو…"
                : "رفتن به شهر آگهی"}
            </button>

            {cityMessage && (
              <small>
                {cityMessage}
              </small>
            )}
          </div>
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

            {geoStatus === "denied" && (
              <small>
                اجازه دسترسی به موقعیت داده
                نشد؛ می‌توانی محل را دستی
                روی نقشه انتخاب کنی.
              </small>
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