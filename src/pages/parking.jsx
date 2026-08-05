import { useMemo, useState } from "react";
import {
  Link,
  useSearchParams,
} from "react-router-dom";
import ParkingCard from "../components/ParkingCard";
import "./Parking.css";

function Parking({ parkings = [] }) {
  const [searchParams] = useSearchParams();

  const search = (
    searchParams.get("search") || ""
  ).trim();

  const [selectedCity, setSelectedCity] =
    useState("");

  const [minimumPrice, setMinimumPrice] =
    useState("");

  const [maximumPrice, setMaximumPrice] =
    useState("");

  const [sortType, setSortType] =
    useState("");

  const convertToEnglishDigits = (value) => {
    return String(value || "")
      .replace(
        /[۰-۹]/g,
        (digit) =>
          "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)
      )
      .replace(
        /[٠-٩]/g,
        (digit) =>
          "٠١٢٣٤٥٦٧٨٩".indexOf(digit)
      );
  };

  const getNumericPrice = (price) => {
    if (
      price === null ||
      price === undefined
    ) {
      return 0;
    }

    if (typeof price === "number") {
      return price;
    }

    const normalizedPrice =
      convertToEnglishDigits(price)
        .replace(/,/g, "")
        .replace(/،/g, "")
        .trim();

    const numberMatch =
      normalizedPrice.match(/[\d.]+/);

    if (!numberMatch) {
      return 0;
    }

    let numericPrice = Number(
      numberMatch[0]
    );

    if (
      normalizedPrice.includes("میلیارد")
    ) {
      numericPrice *= 1_000_000_000;
    } else if (
      normalizedPrice.includes("میلیون")
    ) {
      numericPrice *= 1_000_000;
    } else if (
      normalizedPrice.includes("هزار")
    ) {
      numericPrice *= 1_000;
    }

    return numericPrice;
  };

  const normalizePriceInput = (value) => {
    return Number(
      convertToEnglishDigits(value)
        .replace(/,/g, "")
        .replace(/،/g, "")
        .trim()
    );
  };

  const cities = useMemo(() => {
    return [
      ...new Set(
        parkings
          .map((item) =>
            item.city?.trim()
          )
          .filter(Boolean)
      ),
    ];
  }, [parkings]);

  const filteredParkings = useMemo(() => {
    const minimum = minimumPrice
      ? normalizePriceInput(minimumPrice)
      : null;

    const maximum = maximumPrice
      ? normalizePriceInput(maximumPrice)
      : null;

    const normalizedSearch =
      search.toLocaleLowerCase("fa-IR");

    const results = parkings.filter(
      (item) => {
        const title = String(
          item.title || ""
        );

        const city = String(
          item.city || ""
        );

        const itemPrice =
          getNumericPrice(item.price);

        const searchableText =
          `${title} ${city}`.toLocaleLowerCase(
            "fa-IR"
          );

        const matchesSearch =
          normalizedSearch === "" ||
          searchableText.includes(
            normalizedSearch
          );

        const matchesCity =
          selectedCity === "" ||
          city === selectedCity;

        const matchesMinimum =
          minimum === null ||
          itemPrice >= minimum;

        const matchesMaximum =
          maximum === null ||
          itemPrice <= maximum;

        return (
          matchesSearch &&
          matchesCity &&
          matchesMinimum &&
          matchesMaximum
        );
      }
    );

    if (sortType === "lowest") {
      return [...results].sort(
        (firstItem, secondItem) =>
          getNumericPrice(
            firstItem.price
          ) -
          getNumericPrice(
            secondItem.price
          )
      );
    }

    if (sortType === "highest") {
      return [...results].sort(
        (firstItem, secondItem) =>
          getNumericPrice(
            secondItem.price
          ) -
          getNumericPrice(
            firstItem.price
          )
      );
    }

    return results;
  }, [
    parkings,
    search,
    selectedCity,
    minimumPrice,
    maximumPrice,
    sortType,
  ]);

  const clearFilters = () => {
    setSelectedCity("");
    setMinimumPrice("");
    setMaximumPrice("");
    setSortType("");
  };

  const hasActiveFilters =
    selectedCity !== "" ||
    minimumPrice !== "" ||
    maximumPrice !== "" ||
    sortType !== "";

  return (
    <main className="parking-page">
      <section className="parking-page__hero">
        <div className="parking-page__hero-shape parking-page__hero-shape--one" />
        <div className="parking-page__hero-shape parking-page__hero-shape--two" />

        <div className="container parking-page__hero-content">
          <div>
            <span className="parking-page__eyebrow">
              <span>🚘</span>
              انتخاب مطمئن برای خودروی شما
            </span>

            <h1 className="parking-page__title">
              پارکینگ مناسب خودت را
              <span> سریع پیدا کن</span>
            </h1>

            <p className="parking-page__description">
              بین آگهی‌های ثبت‌شده جستجو کن،
              قیمت‌ها را مقایسه کن و بهترین
              فضای پارک را انتخاب کن.
            </p>
          </div>

          <div className="parking-page__hero-stat">
            <span className="parking-page__hero-stat-icon">
              ✨
            </span>

            <div>
              <strong>
                {parkings.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>

              <span>آگهی ثبت‌شده</span>
            </div>
          </div>
        </div>
      </section>

      <section className="parking-page__content page-section">
        <div className="container">
          <div className="parking-filter">
            <div className="parking-filter__header">
              <div>
                <span className="parking-filter__label">
                  جستجوی دقیق
                </span>

                <h2>
                  فیلتر پارکینگ‌ها
                </h2>

                <p>
                  با انتخاب شهر، قیمت و
                  مرتب‌سازی، نتیجه مناسب‌تر را
                  پیدا کن.
                </p>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="parking-filter__clear-top"
                  onClick={clearFilters}
                >
                  پاک‌کردن همه
                </button>
              )}
            </div>

            <div className="parking-filter__grid">
              <label className="parking-filter__field">
                <span>
                  <span className="parking-filter__field-icon parking-filter__field-icon--purple">
                    📍
                  </span>

                  شهر
                </span>

                <select
                  value={selectedCity}
                  onChange={(event) =>
                    setSelectedCity(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    همه شهرها
                  </option>

                  {cities.map((city) => (
                    <option
                      key={city}
                      value={city}
                    >
                      {city}
                    </option>
                  ))}
                </select>
              </label>

              <label className="parking-filter__field">
                <span>
                  <span className="parking-filter__field-icon parking-filter__field-icon--green">
                    ↓
                  </span>

                  حداقل قیمت
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={minimumPrice}
                  onChange={(event) =>
                    setMinimumPrice(
                      event.target.value
                    )
                  }
                  placeholder="مثلاً ۵۰۰۰۰"
                />
              </label>

              <label className="parking-filter__field">
                <span>
                  <span className="parking-filter__field-icon parking-filter__field-icon--orange">
                    ↑
                  </span>

                  حداکثر قیمت
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={maximumPrice}
                  onChange={(event) =>
                    setMaximumPrice(
                      event.target.value
                    )
                  }
                  placeholder="مثلاً ۲۰۰۰۰۰"
                />
              </label>

              <label className="parking-filter__field">
                <span>
                  <span className="parking-filter__field-icon parking-filter__field-icon--cyan">
                    ⇅
                  </span>

                  مرتب‌سازی
                </span>

                <select
                  value={sortType}
                  onChange={(event) =>
                    setSortType(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    جدیدترین آگهی‌ها
                  </option>

                  <option value="lowest">
                    قیمت از کم به زیاد
                  </option>

                  <option value="highest">
                    قیمت از زیاد به کم
                  </option>
                </select>
              </label>

              <button
                type="button"
                className="parking-filter__clear-button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                <span>↻</span>
                پاک‌کردن فیلترها
              </button>
            </div>
          </div>

          <div className="parking-results__header">
            <div>
              <span className="parking-results__label">
                نتیجه جستجو
              </span>

              <h2>
                پارکینگ‌های موجود
              </h2>
            </div>

            <div className="parking-results__count">
              <strong>
                {filteredParkings.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>

              <span>آگهی پیدا شد</span>
            </div>
          </div>

          {search && (
            <div className="parking-search-notice">
              <span>🔎</span>

              <p>
                نتایج جستجو برای:
                <strong> «{search}»</strong>
              </p>
            </div>
          )}

          {filteredParkings.length > 0 ? (
            <div className="parking-grid">
              {filteredParkings.map(
                (parking) => (
                  <ParkingCard
                    key={parking.id}
                    parking={parking}
                  />
                )
              )}
            </div>
          ) : (
            <div className="parking-empty">
              <div className="parking-empty__icon">
                🔍
              </div>

              <span className="parking-empty__label">
                نتیجه‌ای پیدا نشد
              </span>

              <h3>
                پارکینگی مطابق فیلترهای انتخابی
                وجود ندارد
              </h3>

              <p>
                محدوده قیمت یا شهر انتخاب‌شده
                را تغییر بده و دوباره جستجو کن.
              </p>

              <button
                type="button"
                onClick={clearFilters}
              >
                نمایش همه آگهی‌ها
              </button>
            </div>
          )}

          <div className="parking-add-banner">
            <div className="parking-add-banner__icon">
              ＋
            </div>

            <div className="parking-add-banner__content">
              <span>
                جای پارک خالی داری؟
              </span>

              <h3>
                پارکینگت را در فضاجو آگهی کن
              </h3>

              <p>
                در چند دقیقه آگهی بساز و فضای
                خالی خودت را به متقاضیان معرفی
                کن.
              </p>
            </div>

            <Link
              to="/add-parking"
              className="parking-add-banner__button"
            >
              ثبت آگهی جدید
              <span>←</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Parking;