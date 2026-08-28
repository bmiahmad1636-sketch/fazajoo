import { useMemo, useState } from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import ParkingCard from "../components/ParkingCard";
import "./Parking.css";

function Parking({ parkings = [], initialListingType = "", showHero = true }) {
  const [searchParams] =
    useSearchParams();

  const search = (
    searchParams.get("search") || ""
  ).trim();

  const [
    selectedCity,
    setSelectedCity,
  ] = useState("");

  const [
    selectedListingType,
    setSelectedListingType,
  ] = useState(initialListingType);

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("");

  const [selectedPropertyType, setSelectedPropertyType] = useState("");
  const [minimumBedrooms, setMinimumBedrooms] = useState("");

  const [
    minimumPrice,
    setMinimumPrice,
  ] = useState("");

  const [
    maximumPrice,
    setMaximumPrice,
  ] = useState("");

  const [
    sortType,
    setSortType,
  ] = useState("");

  const convertToEnglishDigits = (
    value
  ) => {
    return String(value || "")
      .replace(
        /[۰-۹]/g,
        (digit) =>
          "۰۱۲۳۴۵۶۷۸۹".indexOf(
            digit
          )
      )
      .replace(
        /[٠-٩]/g,
        (digit) =>
          "٠١٢٣٤٥٦٧٨٩".indexOf(
            digit
          )
      );
  };

  const getNumericPrice = (
    price
  ) => {
    if (
      price === null ||
      price === undefined
    ) {
      return 0;
    }

    if (
      typeof price === "number"
    ) {
      return price;
    }

    const normalizedPrice =
      convertToEnglishDigits(
        price
      )
        .replace(/,/g, "")
        .replace(/،/g, "")
        .trim();

    const numberMatch =
      normalizedPrice.match(
        /[\d.]+/
      );

    if (!numberMatch) {
      return 0;
    }

    let numericPrice =
      Number(
        numberMatch[0]
      );

    if (
      normalizedPrice.includes(
        "میلیارد"
      )
    ) {
      numericPrice *=
        1_000_000_000;
    } else if (
      normalizedPrice.includes(
        "میلیون"
      )
    ) {
      numericPrice *=
        1_000_000;
    } else if (
      normalizedPrice.includes(
        "هزار"
      )
    ) {
      numericPrice *=
        1_000;
    }

    return numericPrice;
  };

  const normalizePriceInput = (
    value
  ) => {
    return Number(
      convertToEnglishDigits(
        value
      )
        .replace(/,/g, "")
        .replace(/،/g, "")
        .trim()
    );
  };

  const categories = [
    { value: "parking", label: "پارکینگ", icon: "🚘" },
    { value: "residential", label: "مسکونی", icon: "🏠" },
    { value: "villa", label: "ویلا", icon: "🏡" },
    { value: "storage", label: "انبار", icon: "📦" },
    { value: "warehouse", label: "سوله", icon: "🏭" },
    { value: "shop", label: "مغازه", icon: "🏪" },
    { value: "land", label: "زمین", icon: "🌱" },
    { value: "other", label: "سایر فضاها", icon: "✨" },
  ];

  const getItemCategory = (item) => {
    // آگهی‌های قدیمی قبل از چنددسته‌ای شدن فضاجو، پارکینگ محسوب می‌شوند.
    return item.category || "parking";
  };

  const getItemListingType = (item) => {
    // آگهی‌های قدیمی از نوع «فضا برای اجاره دارم» هستند.
    return item.listingType || "offer";
  };

  const publicParkings =
    useMemo(() => {
      return parkings.filter(
        (item) =>
          item.status !==
          "inactive"
      );
    }, [parkings]);

  const cities = useMemo(() => {
    return [
      ...new Set(
        publicParkings
          .map((item) =>
            item.city?.trim()
          )
          .filter(Boolean)
      ),
    ];
  }, [publicParkings]);

  const filteredParkings =
    useMemo(() => {
      const minimum =
        minimumPrice
          ? normalizePriceInput(
              minimumPrice
            )
          : null;

      const maximum =
        maximumPrice
          ? normalizePriceInput(
              maximumPrice
            )
          : null;

      const normalizedSearch =
        search.toLocaleLowerCase(
          "fa-IR"
        );

      const results =
        publicParkings.filter(
          (item) => {
            const title =
              String(
                item.title || ""
              );

            const city =
              String(
                item.city || ""
              );

            const itemPrice =
              getNumericPrice(
                item.price
              );

            const category =
              getItemCategory(item);

            const listingType =
              getItemListingType(item);

            const categoryLabel =
              String(
                item.categoryLabel ||
                  (category === "parking"
                    ? "پارکینگ"
                    : "")
              );

            const customCategory =
              String(
                item.customCategory || ""
              );

            const description =
              String(
                item.description || ""
              );

            const searchableText =
              `${title} ${city} ${categoryLabel} ${customCategory} ${description}`.toLocaleLowerCase(
                "fa-IR"
              );

            const matchesSearch =
              normalizedSearch ===
                "" ||
              searchableText.includes(
                normalizedSearch
              );

            const matchesCity =
              selectedCity ===
                "" ||
              city ===
                selectedCity;

            const matchesListingType =
              selectedListingType ===
                "" ||
              listingType ===
                selectedListingType;

            const matchesCategory =
              selectedCategory ===
                "" ||
              category ===
                selectedCategory;

            const residential = item.residentialDetails || {};
            const matchesPropertyType =
              selectedCategory !== "residential" ||
              selectedPropertyType === "" ||
              residential.propertyType === selectedPropertyType;
            const matchesBedrooms =
              selectedCategory !== "residential" ||
              minimumBedrooms === "" ||
              Number(residential.bedrooms || 0) >= Number(minimumBedrooms);

            const matchesMinimum =
              minimum === null ||
              itemPrice >=
                minimum;

            const matchesMaximum =
              maximum === null ||
              itemPrice <=
                maximum;

            return (
              matchesSearch &&
              matchesCity &&
              matchesListingType &&
              matchesCategory &&
              matchesPropertyType &&
              matchesBedrooms &&
              matchesMinimum &&
              matchesMaximum
            );
          }
        );

      if (
        sortType ===
        "lowest"
      ) {
        return [
          ...results,
        ].sort(
          (
            firstItem,
            secondItem
          ) =>
            getNumericPrice(
              firstItem.price
            ) -
            getNumericPrice(
              secondItem.price
            )
        );
      }

      if (
        sortType ===
        "highest"
      ) {
        return [
          ...results,
        ].sort(
          (
            firstItem,
            secondItem
          ) =>
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
      publicParkings,
      search,
      selectedCity,
      selectedListingType,
      selectedCategory,
      selectedPropertyType,
      minimumBedrooms,
      minimumPrice,
      maximumPrice,
      sortType,
    ]);

  const clearFilters = () => {
    setSelectedCity("");
    setSelectedListingType("");
    setSelectedCategory("");
    setSelectedPropertyType("");
    setMinimumBedrooms("");
    setMinimumPrice("");
    setMaximumPrice("");
    setSortType("");
  };

  const hasActiveFilters =
    selectedCity !== "" ||
    selectedListingType !== "" ||
    selectedCategory !== "" ||
    minimumPrice !== "" ||
    maximumPrice !== "" ||
    sortType !== "";

  return (
    <main className="parking-page">
      {showHero && (
      <section className="parking-page__hero">
        <div className="parking-page__hero-shape parking-page__hero-shape--one" />
        <div className="parking-page__hero-shape parking-page__hero-shape--two" />

        <div className="container parking-page__hero-content">
          <div>
            <span className="parking-page__eyebrow">
              <span>✨</span>
              بازار تخصصی اجاره فضا
            </span>

            <h1 className="parking-page__title">
              فضای مناسب خودت را
              <span> سریع پیدا کن</span>
            </h1>

            <p className="parking-page__description">
              بین انواع فضاها جستجو کن؛
              چه فضای خالی برای اجاره بخواهی،
              چه دنبال فضای مناسب باشی.
            </p>
          </div>

          <div className="parking-page__hero-stat">
            <span className="parking-page__hero-stat-icon">
              ✨
            </span>

            <div>
              <strong>
                {publicParkings.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>

              <span>
                آگهی ثبت‌شده
              </span>
            </div>
          </div>
        </div>
      </section>
      )}

      <section className="parking-page__content page-section">
        <div className="container">
          <div className="parking-filter">
            <div className="parking-filter__header">
              <div>
                <span className="parking-filter__label">
                  جستجوی دقیق
                </span>

                <h2>
                  فیلتر آگهی‌ها
                </h2>

                <p>
                  نوع آگهی، نوع فضا، شهر و
                  محدوده قیمت را انتخاب کن تا
                  سریع‌تر به نتیجه برسی.
                </p>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="parking-filter__clear-top"
                  onClick={
                    clearFilters
                  }
                >
                  پاک‌کردن همه
                </button>
              )}
            </div>

            <div className="parking-filter__grid">
              <label className="parking-filter__field">
                <span>
                  <span className="parking-filter__field-icon parking-filter__field-icon--orange">
                    ↔
                  </span>

                  نوع آگهی
                </span>

                <select
                  value={selectedListingType}
                  onChange={(event) =>
                    setSelectedListingType(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    همه آگهی‌ها
                  </option>

                  <option value="offer">
                    فضا برای اجاره دارم
                  </option>

                  <option value="wanted">
                    دنبال فضا هستم
                  </option>
                </select>
              </label>

              <label className="parking-filter__field">
                <span>
                  <span className="parking-filter__field-icon parking-filter__field-icon--cyan">
                    ◫
                  </span>

                  نوع فضا
                </span>

                <select
                  value={selectedCategory}
                  onChange={(event) =>
                    setSelectedCategory(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    همه فضاها
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category.value}
                        value={category.value}
                      >
                        {category.icon}{" "}
                        {category.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              {selectedCategory === "residential" && (
                <>
                  <label className="parking-filter__field">
                    <span>🏠 نوع ملک</span>
                    <select value={selectedPropertyType} onChange={(e)=>setSelectedPropertyType(e.target.value)}>
                      <option value="">همه انواع مسکونی</option>
                      <option value="apartment">آپارتمان</option>
                      <option value="house">خانه</option>
                      <option value="villa">خانه ویلایی</option>
                      <option value="suite">سوئیت</option>
                      <option value="penthouse">پنت‌هاوس</option>
                      <option value="other">سایر مسکونی</option>
                    </select>
                  </label>
                  <label className="parking-filter__field">
                    <span>🛏 حداقل اتاق</span>
                    <select value={minimumBedrooms} onChange={(e)=>setMinimumBedrooms(e.target.value)}>
                      <option value="">مهم نیست</option>
                      <option value="1">۱ اتاق</option><option value="2">۲ اتاق</option>
                      <option value="3">۳ اتاق</option><option value="4">۴ اتاق و بیشتر</option>
                    </select>
                  </label>
                </>
              )}

              <label className="parking-filter__field">
                <span>
                  <span className="parking-filter__field-icon parking-filter__field-icon--purple">
                    📍
                  </span>

                  شهر
                </span>

                <select
                  value={
                    selectedCity
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedCity(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="">
                    همه شهرها
                  </option>

                  {cities.map(
                    (city) => (
                      <option
                        key={
                          city
                        }
                        value={
                          city
                        }
                      >
                        {city}
                      </option>
                    )
                  )}
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
                  value={
                    minimumPrice
                  }
                  onChange={(
                    event
                  ) =>
                    setMinimumPrice(
                      event.target
                        .value
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
                  value={
                    maximumPrice
                  }
                  onChange={(
                    event
                  ) =>
                    setMaximumPrice(
                      event.target
                        .value
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
                  value={
                    sortType
                  }
                  onChange={(
                    event
                  ) =>
                    setSortType(
                      event.target
                        .value
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
                onClick={
                  clearFilters
                }
                disabled={
                  !hasActiveFilters
                }
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
                آگهی‌های فضا
              </h2>
            </div>

            <div className="parking-results__count">
              <strong>
                {filteredParkings.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>

              <span>
                آگهی پیدا شد
              </span>
            </div>
          </div>

          {search && (
            <div className="parking-search-notice">
              <span>🔎</span>

              <p>
                نتایج جستجو برای:
                <strong>
                  {" "}
                  «{search}»
                </strong>
              </p>
            </div>
          )}

          {filteredParkings.length >
          0 ? (
            <div className="parking-grid">
              {filteredParkings.map(
                (parking) => (
                  <ParkingCard
                    key={
                      parking.id
                    }
                    parking={
                      parking
                    }
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
                آگهی‌ای مطابق فیلترهای انتخابی
                وجود ندارد
              </h3>

              <p>
                نوع آگهی، نوع فضا، شهر یا محدوده
                قیمت را تغییر بده و دوباره جستجو کن.
              </p>

              <button
                type="button"
                onClick={
                  clearFilters
                }
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
                فضایی داری یا دنبال فضا هستی؟
              </span>

              <h3>
                در فضاجو آگهی خودت را ثبت کن
              </h3>

              <p>
                در چند دقیقه آگهی بساز؛ فضای
                خالی‌ات را معرفی کن یا نیازت به
                یک فضای مناسب را ثبت کن.
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