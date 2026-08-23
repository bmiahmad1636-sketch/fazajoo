import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getCategoryLabel,
  scoreMatch,
} from "../utils/matchingEngine";

import { formatRialPrice } from "../utils/priceFormatter";

import "./AgencyApplicants.css";

function AgencyApplicants({
  parkings = [],
  currentUser = null,
}) {
  const [selectedCity, setSelectedCity] =
    useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("");
  const [minimumScore, setMinimumScore] =
    useState(0);

  const myOffers = useMemo(() => {
    if (!currentUser?.uid) {
      return [];
    }

    return parkings.filter(
      (item) =>
        (item.listingType || "offer") !==
          "wanted" &&
        item.status === "active" &&
        item.ownerId === currentUser.uid
    );
  }, [parkings, currentUser]);

  const applicants = useMemo(() => {
    const requests = parkings.filter(
      (item) =>
        item.listingType === "wanted" &&
        item.status !== "inactive" &&
        item.ownerId !== currentUser?.uid
    );

    return requests
      .map((request) => {
        const ranked = myOffers
          .map((offer) => ({
            offer,
            ...scoreMatch(request, offer),
          }))
          .sort((a, b) => b.score - a.score);

        const bestMatch = ranked[0] || null;

        return {
          request,
          bestMatch,
          eligible:
            Boolean(bestMatch?.eligible),
        };
      })
      .sort(
        (a, b) =>
          (b.bestMatch?.score || 0) -
          (a.bestMatch?.score || 0)
      );
  }, [parkings, currentUser, myOffers]);

  const cities = useMemo(
    () => [
      ...new Set(
        applicants
          .map((item) =>
            item.request.city?.trim()
          )
          .filter(Boolean)
      ),
    ],
    [applicants]
  );

  const filteredApplicants = useMemo(
    () =>
      applicants.filter((item) => {
        const request = item.request;
        const category =
          request.category || "parking";
        const score =
          item.bestMatch?.score || 0;

        return (
          (!selectedCity ||
            request.city === selectedCity) &&
          (!selectedCategory ||
            category === selectedCategory) &&
          score >= Number(minimumScore || 0)
        );
      }),
    [
      applicants,
      selectedCity,
      selectedCategory,
      minimumScore,
    ]
  );

  const matchedCount = applicants.filter(
    (item) => item.eligible
  ).length;

  const categories = [
    { value: "parking", label: "پارکینگ" },
    { value: "storage", label: "انبار" },
    { value: "warehouse", label: "سوله" },
    { value: "shop", label: "مغازه" },
    { value: "land", label: "زمین" },
    { value: "other", label: "سایر فضاها" },
  ];

  const clearFilters = () => {
    setSelectedCity("");
    setSelectedCategory("");
    setMinimumScore(0);
  };

  return (
    <main className="agency-applicants">
      <section className="agency-applicants__hero">
        <div className="agency-applicants__container agency-applicants__hero-inner">
          <div>
            <span className="agency-applicants__eyebrow">
              🔎 متقاضی‌های مناسب فایل‌های شما
            </span>

            <h1>
              هر درخواست را با
              <span> بهترین فایل خودت </span>
              مقایسه کن
            </h1>

            <p>
              فضاجو نوع فضا، شهر، متراژ و بودجه را
              بررسی می‌کند و بهترین فایل شما را برای هر
              متقاضی پیشنهاد می‌دهد.
            </p>
          </div>

          <Link
            to="/agency"
            className="agency-applicants__back"
          >
            بازگشت به پنل مشاور ←
          </Link>
        </div>
      </section>

      <section className="agency-applicants__content">
        <div className="agency-applicants__container">
          <div className="agency-applicants__stats">
            <article>
              <span>درخواست‌های متقاضی</span>
              <strong>
                {applicants.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>
              <small>درخواست‌های فعال دیگران</small>
            </article>

            <article>
              <span>فایل‌های من</span>
              <strong>
                {myOffers.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>
              <small>فایل‌های فعال قابل تطبیق</small>
            </article>

            <article>
              <span>تطبیق مناسب</span>
              <strong>
                {matchedCount.toLocaleString("fa-IR")}
              </strong>
              <small>امتیاز ۴۵٪ و بالاتر</small>
            </article>
          </div>

          <div className="agency-applicants__filters">
            <div>
              <span>فیلتر حرفه‌ای</span>
              <h2>متقاضی موردنظر را سریع‌تر پیدا کن</h2>
            </div>

            <label>
              <span>شهر</span>
              <select
                value={selectedCity}
                onChange={(event) =>
                  setSelectedCity(event.target.value)
                }
              >
                <option value="">همه شهرها</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>نوع فضا</span>
              <select
                value={selectedCategory}
                onChange={(event) =>
                  setSelectedCategory(
                    event.target.value
                  )
                }
              >
                <option value="">همه فضاها</option>
                {categories.map((category) => (
                  <option
                    key={category.value}
                    value={category.value}
                  >
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>حداقل تطبیق</span>
              <select
                value={minimumScore}
                onChange={(event) =>
                  setMinimumScore(event.target.value)
                }
              >
                <option value="0">همه نتایج</option>
                <option value="45">۴۵٪ به بالا</option>
                <option value="60">۶۰٪ به بالا</option>
                <option value="75">۷۵٪ به بالا</option>
                <option value="90">۹۰٪ به بالا</option>
              </select>
            </label>

            <button
              type="button"
              onClick={clearFilters}
            >
              پاک‌کردن فیلترها
            </button>
          </div>

          <div className="agency-applicants__heading">
            <div>
              <span>نتیجه تطبیق</span>
              <h2>متقاضی‌ها</h2>
            </div>

            <strong>
              {filteredApplicants.length.toLocaleString(
                "fa-IR"
              )}{" "}
              نتیجه
            </strong>
          </div>

          {filteredApplicants.length ? (
            <div className="agency-applicants__list">
              {filteredApplicants.map(
                ({
                  request,
                  bestMatch,
                  eligible,
                }) => (
                  <article
                    key={request.id}
                    className="agency-applicants__card"
                  >
                    <div className="agency-applicants__request">
                      <div className="agency-applicants__request-top">
                        <span className="agency-applicants__request-badge">
                          🔎 دنبال فضا
                        </span>

                        <span className="agency-applicants__category">
                          {getCategoryLabel(request)}
                        </span>
                      </div>

                      <h3>
                        {request.title ||
                          `دنبال ${getCategoryLabel(
                            request
                          )}`}
                      </h3>

                      <div className="agency-applicants__request-info">
                        <span>
                          📍 {request.city || "شهر ثبت نشده"}
                        </span>
                        <span>
                          ↔ {request.area || "—"} متر
                        </span>
                        <span>
                          💰 {formatRialPrice(request.price, {
                            priceType:
                              request.priceType ||
                              "monthly",
                            fallback: "توافقی",
                          })}
                        </span>
                      </div>

                      <p>
                        {request.description ||
                          "توضیحی برای این درخواست ثبت نشده است."}
                      </p>

                      <Link
                        to={`/parking/${request.id}`}
                        className="agency-applicants__request-link"
                      >
                        مشاهده جزئیات درخواست
                      </Link>
                    </div>

                    <div
                      className={`agency-applicants__match ${
                        eligible
                          ? "agency-applicants__match--good"
                          : "agency-applicants__match--weak"
                      }`}
                    >
                      {bestMatch ? (
                        <>
                          <div className="agency-applicants__score">
                            <strong>
                              {bestMatch.score.toLocaleString(
                                "fa-IR"
                              )}
                              ٪
                            </strong>
                            <span>تطبیق</span>
                          </div>

                          <div className="agency-applicants__match-main">
                            <span>
                              {eligible
                                ? "بهترین فایل پیشنهادی شما"
                                : "نزدیک‌ترین فایل شما"}
                            </span>

                            <h4>
                              {bestMatch.offer.title ||
                                getCategoryLabel(
                                  bestMatch.offer
                                )}
                            </h4>

                            <p>
                              📍 {bestMatch.offer.city || "—"}
                              {bestMatch.offer.area
                                ? ` • ${bestMatch.offer.area} متر`
                                : ""}
                            </p>

                            {bestMatch.reasons.length ? (
                              <div className="agency-applicants__reasons">
                                {bestMatch.reasons.map(
                                  (reason) => (
                                    <span key={reason}>
                                      ✓ {reason}
                                    </span>
                                  )
                                )}
                              </div>
                            ) : (
                              <small>
                                این فایل از نظر شهر یا نوع فضا تطابق کافی ندارد.
                              </small>
                            )}

                            <Link
                              to={`/parking/${bestMatch.offer.id}`}
                              className="agency-applicants__offer-link"
                            >
                              مشاهده فایل پیشنهادی
                            </Link>
                          </div>
                        </>
                      ) : (
                        <div className="agency-applicants__no-offer">
                          <span>📁</span>
                          <strong>هنوز فایل فعالی ندارید</strong>
                          <p>
                            برای محاسبه تطبیق، ابتدا یک فایل عرضه ثبت کنید.
                          </p>
                          <Link to="/add-parking">
                            ثبت فایل جدید
                          </Link>
                        </div>
                      )}
                    </div>
                  </article>
                )
              )}
            </div>
          ) : (
            <div className="agency-applicants__empty">
              <span>✨</span>
              <h3>متقاضی مطابق این فیلتر پیدا نشد</h3>
              <p>
                فیلترها را تغییر بده یا با ثبت درخواست‌های بیشتر دوباره بررسی کن.
              </p>
              <button
                type="button"
                onClick={clearFilters}
              >
                نمایش همه متقاضی‌ها
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default AgencyApplicants;
