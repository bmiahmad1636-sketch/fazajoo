import { useEffect, useRef, useState } from "react";
import maplibregl from "@neshan-maps-platform/maplibre-sdk";
import "@neshan-maps-platform/maplibre-sdk/style.css";
import "./NeshanLocationPicker.css";

const DEFAULT_CENTER = [51.8668, 32.0089]; // Shahreza: [lng, lat]
const MAP_STYLE = "https://static.neshan.org/sdk/maplibre/styles/light.json";

const CITY_CENTERS = {
  "تهران":[51.3890,35.6892],"کرج":[50.9916,35.8400],"مشهد":[59.6062,36.2605],
  "اصفهان":[51.6776,32.6546],"شیراز":[52.5837,29.5918],"تبریز":[46.2919,38.0800],
  "قم":[50.8764,34.6416],"اهواز":[48.6692,31.3183],"رشت":[49.5890,37.2808],
  "ارومیه":[45.0761,37.5527],"قزوین":[50.0041,36.2688],"یزد":[54.3675,31.8974],
  "کرمان":[57.0788,30.2839],"ساری":[53.0601,36.5659],"گرگان":[54.4342,36.8456],
  "اراک":[49.6892,34.0917],"همدان":[48.5146,34.7989],"سنندج":[46.9988,35.3219],
  "کرمانشاه":[47.0650,34.3142],"خرم آباد":[48.3558,33.4878],"ایلام":[46.4227,33.6374],
  "بندرعباس":[56.2666,27.1832],"بوشهر":[50.8385,28.9234],"زاهدان":[60.8629,29.4963],
  "بیرجند":[59.2211,32.8649],"بجنورد":[57.3290,37.4747],"سمنان":[53.3971,35.5769],
  "اردبیل":[48.2933,38.2498],"زنجان":[48.4787,36.6736],"یاسوج":[51.5879,30.6682],
  "شهرکرد":[50.8644,32.3256],"شهرضا":[51.8668,32.0089],"کاشان":[51.4099,33.9850],
  "نجف آباد":[51.3668,32.6346],"خمینی شهر":[51.5211,32.7002],"فولادشهر":[51.4069,32.4894],
  "شاهین شهر":[51.5559,32.8579],"کیش":[53.9800,26.5320],"قشم":[56.2719,26.9581],
  "چابهار":[60.6430,25.2919],"دزفول":[48.4236,32.3831],"آبادان":[48.3043,30.3473],
  "خرمشهر":[48.1664,30.4393],"ماهشهر":[49.1981,30.5560],"نیشابور":[58.7958,36.2141],
  "سبزوار":[57.6819,36.2126],"کاشمر":[58.4656,35.2383],"مراغه":[46.2370,37.3892],
  "مرند":[45.7749,38.4329],"میاندوآب":[46.1027,36.9694],"مهاباد":[45.7222,36.7631],
  "بابل":[52.6780,36.5513],"آمل":[52.3507,36.4696],"قائم شهر":[52.8609,36.4630],
  "بابلسر":[52.6506,36.7025],"نوشهر":[51.4950,36.6485],"لاهیجان":[50.0004,37.2073],
  "انزلی":[49.4622,37.4727],"ساوه":[50.3566,35.0213],"ملایر":[48.8235,34.2969],
  "بروجرد":[48.7516,33.8973],"دورود":[49.0632,33.4955],"مرودشت":[52.8027,29.8742],
  "جهرم":[53.5609,28.5000],"فسا":[53.6482,28.9383],"لار":[54.3236,27.6740]
};

function normalizeCityName(value = "") {
  return String(value).trim().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\s+/g, " ");
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
  const [showLocationConsent, setShowLocationConsent] = useState(false);
  const [cityQuery, setCityQuery] = useState(city || "");
  const [cityMessage, setCityMessage] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (city) setCityQuery(city);
  }, [city]);

  // This effect owns the map instance lifecycle. Re-running it for every coordinate
  // change would destroy/recreate the map; coordinate changes are emitted through onChangeRef.
  // oxlint-disable react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapElementRef.current) return undefined;

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

        const markerElement = document.createElement("div");
        markerElement.className = "neshan-location-picker__marker";

        markerRef.current = new maplibregl.Marker({
          element: markerElement,
          anchor: "center",
        })
          .setLngLat([lng, lat])
          .addTo(map);
      };

      map.__fazajooDrawPoint = drawPoint;

      if (hasValue) {
        drawPoint(Number(value.lat), Number(value.lng));
      }

      map.on("load", () => {
        if (cancelled) return;
        setStatus("ready");
        window.setTimeout(() => map.resize(), 50);
      });

      map.on("error", (event) => {
        console.error("Neshan MapLibre error:", event?.error || event);
      });

      map.on("click", (event) => {
        if (disabled) return;

        const lat = Number(event.lngLat.lat.toFixed(6));
        const lng = Number(event.lngLat.lng.toFixed(6));

        drawPoint(lat, lng);
        onChangeRef.current?.({ lat, lng });
      });
    } catch (error) {
      console.error("Neshan MapLibre load error:", error);
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
    if (disabled || geoStatus === "loading") return;

    if (!navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }

    setGeoStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const map = mapRef.current;

        if (map) {
          map.flyTo({
            center: [lng, lat],
            zoom: 16,
            essential: true,
          });
          map.__fazajooDrawPoint?.(lat, lng);
        }

        onChangeRef.current?.({ lat, lng });
        setGeoStatus("success");
      },
      (error) => {
        console.warn("Browser geolocation error:", error);
        setGeoStatus(error?.code === 1 ? "denied" : "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  };

  const jumpToCity = () => {
    const map = mapRef.current;
    const name = normalizeCityName(cityQuery || city);
    if (!map || !name) {
      setCityMessage("نام شهر آگهی را وارد کن.");
      return;
    }
    const center = CITY_CENTERS[name];
    if (!center) {
      setCityMessage("این شهر هنوز در فهرست پرش سریع نیست؛ می‌توانی با نقشه یا «موقعیت فعلی من» محل را انتخاب کنی.");
      return;
    }
    setCityMessage(`نقشه روی ${name} رفت؛ حالا نقطه دقیق آگهی را انتخاب کن.`);
    map.flyTo({ center, zoom: 12.5, essential: true });
  };

  const panMap = (x, y) => {
    const map = mapRef.current;
    if (!map) return;
    map.panBy([x, y], { duration: 260 });
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
          <strong>محدوده تقریبی روی نقشه</strong>
          <small>
            روی نقشه بزن تا محل فضا مشخص شود. موقعیت دقیق برای کاربران عمومی
            نمایش داده نمی‌شود.
          </small>
        </div>

        {hasSelectedLocation ? (
          <span>✓ انتخاب شد</span>
        ) : (
          <span>اختیاری</span>
        )}
      </div>

      {!disabled && status !== "missing-key" && (
        <div className="neshan-location-picker__city-jump">
          <input
            type="text"
            value={cityQuery}
            onChange={(event) => setCityQuery(event.target.value)}
            placeholder="مثلاً تهران، کیش، مشهد..."
            aria-label="شهر مقصد روی نقشه"
          />
          <button type="button" onClick={jumpToCity}>رفتن به شهر آگهی</button>
          {cityMessage && <small>{cityMessage}</small>}
        </div>
      )}

      {!disabled && status !== "missing-key" && (
        <div className="neshan-location-picker__tools">
          <button
            type="button"
            className="neshan-location-picker__locate"
            onClick={() => setShowLocationConsent(true)}
            disabled={geoStatus === "loading"}
          >
            <span aria-hidden="true">📍</span>
            {geoStatus === "loading"
              ? "در حال پیدا کردن موقعیت…"
              : "موقعیت فعلی من"}
          </button>

          {geoStatus === "denied" && (
            <small>اجازه دسترسی به موقعیت داده نشد؛ می‌توانی محل را دستی روی نقشه انتخاب کنی.</small>
          )}
          {geoStatus === "error" && (
            <small>موقعیت فعلی دریافت نشد؛ محل را دستی روی نقشه انتخاب کن.</small>
          )}
          {geoStatus === "unsupported" && (
            <small>مرورگر شما موقعیت مکانی را پشتیبانی نمی‌کند.</small>
          )}
        </div>
      )}

      {status === "missing-key" ? (
        <div className="neshan-location-picker__message">
          کلید نقشه نشان هنوز در فایل محیطی فضاجو تنظیم نشده است.
        </div>
      ) : (
        <div className="neshan-location-picker__map-wrap">
          <div ref={mapElementRef} className="neshan-location-picker__map" />

          {!disabled && status === "ready" && (
            <div className="fazajoo-map-pan" aria-label="کنترل جابه‌جایی نقشه">
              <button type="button" className="fazajoo-map-pan__up" onClick={() => panMap(0, -120)} aria-label="حرکت نقشه به بالا">↑</button>
              <button type="button" className="fazajoo-map-pan__right" onClick={() => panMap(120, 0)} aria-label="حرکت نقشه به راست">→</button>
              <button type="button" className="fazajoo-map-pan__down" onClick={() => panMap(0, 120)} aria-label="حرکت نقشه به پایین">↓</button>
              <button type="button" className="fazajoo-map-pan__left" onClick={() => panMap(-120, 0)} aria-label="حرکت نقشه به چپ">←</button>
            </div>
          )}

          {status === "loading" && (
            <div className="neshan-location-picker__overlay">
              در حال بارگذاری نقشه نشان…
            </div>
          )}

          {status === "error" && (
            <div className="neshan-location-picker__overlay">
              نقشه نشان بارگذاری نشد. اتصال اینترنت و کلید دسترسی را بررسی کن.
            </div>
          )}
        </div>
      )}

      {hasSelectedLocation && !disabled && (
        <button
          type="button"
          className="neshan-location-picker__clear"
          onClick={() => onChange?.({ lat: null, lng: null })}
        >
          پاک کردن موقعیت انتخاب‌شده
        </button>
      )}

      {showLocationConsent && (
        <div className="fazajoo-location-consent" role="dialog" aria-modal="true" aria-labelledby="fazajoo-location-consent-title">
          <div className="fazajoo-location-consent__backdrop" onClick={() => setShowLocationConsent(false)} />
          <div className="fazajoo-location-consent__card">
            <div className="fazajoo-location-consent__icon" aria-hidden="true">📍</div>
            <strong id="fazajoo-location-consent-title">پیدا کردن موقعیت فعلی شما</strong>
            <p>
              فضاجو فقط با اجازه شما از موقعیت دستگاه استفاده می‌کند تا نقشه را نزدیک محل فعلی باز کند.
              بعد از آن می‌توانید نقطه را روی نقشه اصلاح کنید.
            </p>
            <small>موقعیت دقیق در صفحه عمومی آگهی نمایش داده نمی‌شود.</small>
            <div className="fazajoo-location-consent__actions">
              <button
                type="button"
                className="fazajoo-location-consent__accept"
                onClick={() => {
                  setShowLocationConsent(false);
                  requestCurrentLocation();
                }}
              >
                ادامه و درخواست اجازه
              </button>
              <button
                type="button"
                className="fazajoo-location-consent__cancel"
                onClick={() => setShowLocationConsent(false)}
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
