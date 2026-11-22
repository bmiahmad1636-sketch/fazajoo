import { showInSiteAlert } from "../utils/inSiteDialog";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import { getCurrentSessionUser, subscribeToAuth } from "../services/authService";
import { getMySpaces, updateSpace } from "../services/spaceService";

import { formatRialPrice } from "../utils/priceFormatter";

import "./MyParkings.css";
import "./MyParkingsMP01.css";
import "./MyParkingsMP04.css";
import "./MyParkingsMP05.css";
import "./MyParkingsMP06.css";

function MyParkings() {
  const [user, setUser] =
    useState(null);

  const [parkings, setParkings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [updatingId, setUpdatingId] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [searchTerm, setSearchTerm] =
    useState("");

  useEffect(() => {
    let active = true;
    const loadMine = async (currentUser = getCurrentSessionUser()) => {
      setUser(currentUser);
      if (!currentUser) { setParkings([]); setLoading(false); return; }
      setLoading(true);
      try {
        const items = await getMySpaces();
        if (active) setParkings(items);
      } catch (error) {
        console.error(error);
        if (active) showInSiteAlert("خطا در دریافت آگهی‌های شما.");
      } finally { if (active) setLoading(false); }
    };
    loadMine();
    const unsubscribe = subscribeToAuth(loadMine);
    const reload = () => loadMine();
    window.addEventListener("fazajoo:spaces-changed", reload);
    return () => { active=false; unsubscribe(); window.removeEventListener("fazajoo:spaces-changed", reload); };
  }, []);


  const handleStatusChange =
    async (
      parkingId,
      newStatus
    ) => {
      if (
        !user ||
        !parkingId
      ) {
        return;
      }

      setUpdatingId(
        parkingId
      );

      try {
        await updateSpace(parkingId, { status: newStatus });

        setParkings(
          (
            currentParkings
          ) =>
            currentParkings.map(
              (parking) =>
                parking.id ===
                parkingId
                  ? {
                      ...parking,
                      status:
                        newStatus,
                    }
                  : parking
            )
        );
      } catch (error) {
        console.error(
          "Update parking status error:",
          error
        );

        showInSiteAlert("تغییر وضعیت آگهی انجام نشد.");
      } finally {
        setUpdatingId(
          ""
        );
      }
    };

  const getStatusInfo = (
    status
  ) => {
    switch (status) {
      case "rented":
        return {
          label:
            "اجاره داده شد",
          badge:
            "my-parkings-status my-parkings-status--rented",
          icon: "✓",
          short:
            "این فضا اجاره رفته",
        };

      case "inactive":
        return {
          label:
            "غیرفعال",
          badge:
            "my-parkings-status my-parkings-status--inactive",
          icon: "Ⅱ",
          short:
            "نمایش عمومی متوقف است",
        };

      default:
        return {
          label:
            "فعال",
          badge:
            "my-parkings-status my-parkings-status--active",
          icon: "●",
          short:
            "در نتایج عمومی نمایش داده می‌شود",
        };
    }
  };

  const counts =
    useMemo(() => {
      const result = {
        all:
          parkings.length,
        active: 0,
        rented: 0,
        inactive: 0,
      };

      parkings.forEach(
        (parking) => {
          const status =
            parking.status ||
            "active";

          if (
            Object.prototype.hasOwnProperty.call(
              result,
              status
            )
          ) {
            result[
              status
            ] += 1;
          }
        }
      );

      return result;
    }, [parkings]);

  const filteredParkings =
    useMemo(() => {
      const normalized =
        searchTerm
          .trim()
          .toLocaleLowerCase(
            "fa-IR"
          );

      return parkings.filter(
        (parking) => {
          const status =
            parking.status ||
            "active";

          const matchesStatus =
            statusFilter ===
              "all" ||
            status ===
              statusFilter;

          const searchable =
            `${parking.title || ""} ${parking.city || ""}`.toLocaleLowerCase(
              "fa-IR"
            );

          const matchesSearch =
            normalized ===
              "" ||
            searchable.includes(
              normalized
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        }
      );
    }, [
      parkings,
      statusFilter,
      searchTerm,
    ]);

  if (loading) {
    return (
      <main className="my-parkings-page">
        <div className="my-parkings-state">
          <div className="my-parkings-state__icon">
            ⏳
          </div>

          <h1>
            در حال دریافت آگهی‌ها
          </h1>

          <p>
            چند لحظه صبر کنید...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="my-parkings-page">
        <div className="my-parkings-state">
          <div className="my-parkings-state__icon">
            🔐
          </div>

          <h1>
            ورود به حساب لازم است
          </h1>

          <p>
            برای مشاهده و مدیریت آگهی‌های خود وارد حساب شوید.
          </p>

          <Link
            className="my-parkings-primary-button"
            to="/login"
          >
            رفتن به صفحه ورود
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="my-parkings-page">
      <section className="my-parkings-hero">
        <div className="container my-parkings-hero__content">
          <div>
            <span className="my-parkings-eyebrow">
              پنل شخصی فضاجو
            </span>

            <h1>
              آگهی‌های من
            </h1>

            <p>
              وضعیت آگهی‌ها، نمایش عمومی و ویرایش اطلاعات را از همین‌جا مدیریت کنید.
            </p>
          </div>

          <Link
            to="/add-parking"
            className="my-parkings-add-button"
          >
            <span>
              ＋
            </span>
            ثبت آگهی جدید
          </Link>
        </div>
      </section>

      <section className="my-parkings-content">
        <div className="container">
          <div className="my-parkings-summary">
            <button
              type="button"
              className={`my-parkings-summary-card ${
                statusFilter ===
                "all"
                  ? "my-parkings-summary-card--selected"
                  : ""
              }`}
              aria-pressed={statusFilter === "all"}
              onClick={() =>
                setStatusFilter(
                  "all"
                )
              }
            >
              <span className="my-parkings-summary-card__icon">
                ▦
              </span>

              <div>
                <span>
                  همه آگهی‌ها
                </span>

                <strong>
                  {counts.all.toLocaleString(
                    "fa-IR"
                  )}
                </strong>
              </div>
            </button>

            <button
              type="button"
              className={`my-parkings-summary-card ${
                statusFilter ===
                "active"
                  ? "my-parkings-summary-card--selected"
                  : ""
              }`}
              aria-pressed={statusFilter === "active"}
              onClick={() =>
                setStatusFilter(
                  "active"
                )
              }
            >
              <span className="my-parkings-summary-card__icon my-parkings-summary-card__icon--active">
                ●
              </span>

              <div>
                <span>
                  فعال
                </span>

                <strong>
                  {counts.active.toLocaleString(
                    "fa-IR"
                  )}
                </strong>
              </div>
            </button>

            <button
              type="button"
              className={`my-parkings-summary-card ${
                statusFilter ===
                "rented"
                  ? "my-parkings-summary-card--selected"
                  : ""
              }`}
              aria-pressed={statusFilter === "rented"}
              onClick={() =>
                setStatusFilter(
                  "rented"
                )
              }
            >
              <span className="my-parkings-summary-card__icon my-parkings-summary-card__icon--rented">
                ✓
              </span>

              <div>
                <span>
                  اجاره داده شد
                </span>

                <strong>
                  {counts.rented.toLocaleString(
                    "fa-IR"
                  )}
                </strong>
              </div>
            </button>

            <button
              type="button"
              className={`my-parkings-summary-card ${
                statusFilter ===
                "inactive"
                  ? "my-parkings-summary-card--selected"
                  : ""
              }`}
              aria-pressed={statusFilter === "inactive"}
              onClick={() =>
                setStatusFilter(
                  "inactive"
                )
              }
            >
              <span className="my-parkings-summary-card__icon my-parkings-summary-card__icon--inactive">
                Ⅱ
              </span>

              <div>
                <span>
                  غیرفعال
                </span>

                <strong>
                  {counts.inactive.toLocaleString(
                    "fa-IR"
                  )}
                </strong>
              </div>
            </button>
          </div>

          <div className="my-parkings-toolbar">
            <div className="my-parkings-toolbar__heading">
              <span>
                مدیریت آگهی‌ها
              </span>

              <h2>
                {statusFilter ===
                "all"
                  ? "همه آگهی‌های شما"
                  : statusFilter ===
                      "active"
                    ? "آگهی‌های فعال"
                    : statusFilter ===
                        "rented"
                      ? "آگهی‌های اجاره داده شده"
                      : "آگهی‌های غیرفعال"}
              </h2>
            </div>

            <div className="my-parkings-search">
              <span>
                🔎
              </span>

              <input
                type="text"
                value={
                  searchTerm
                }
                onChange={(
                  event
                ) =>
                  setSearchTerm(
                    event.target
                      .value
                  )
                }
                placeholder="نام آگهی یا شهر را بنویسید..."
                aria-label="جست‌وجو در عنوان و شهر آگهی‌های من"
              />
            </div>
          </div>

          {parkings.length ===
          0 ? (
            <div className="my-parkings-empty">
              <div className="my-parkings-empty__icon">
                🅿
              </div>

              <h2>
                هنوز آگهی‌ای ثبت نکرده‌اید
              </h2>

              <p>
                اولین فضای خالی خود را در فضاجو ثبت کنید و مدیریت آن را از همین صفحه انجام دهید.
              </p>

              <Link
                to="/add-parking"
                className="my-parkings-primary-button"
              >
                ثبت اولین آگهی
              </Link>
            </div>
          ) : filteredParkings.length ===
            0 ? (
            <div className="my-parkings-empty">
              <div className="my-parkings-empty__icon">
                🔍
              </div>

              <h2>
                آگهی‌ای پیدا نشد
              </h2>

              <p>
                فیلتر وضعیت یا عبارت جستجو را تغییر دهید.
              </p>

              <button
                type="button"
                className="my-parkings-primary-button"
                onClick={() => {
                  setStatusFilter(
                    "all"
                  );
                  setSearchTerm(
                    ""
                  );
                }}
              >
                نمایش همه آگهی‌ها
              </button>
            </div>
          ) : (
            <div className="my-parkings-grid">
              {filteredParkings.map(
                (parking) => {
                  const status =
                    parking.status ||
                    "active";

                  const statusInfo =
                    getStatusInfo(
                      status
                    );

                  return (
                    <article
                      key={
                        parking.id
                      }
                      className={`my-parking-card my-parking-card--${status}`}
                    >
                      <div className="my-parking-card__media">
                        {parking.imageUrl ? (
                          <img
                            src={
                              parking.imageUrl
                            }
                            alt={
                              parking.title ||
                              "تصویر آگهی"
                            }
                          />
                        ) : (
                          <div className="my-parking-card__placeholder">
                            <span>
                              🅿
                            </span>

                            <small>
                              بدون تصویر
                            </small>
                          </div>
                        )}

                        <span
                          className={
                            statusInfo.badge
                          }
                        >
                          <span>
                            {
                              statusInfo.icon
                            }
                          </span>

                          {
                            statusInfo.label
                          }
                        </span>
                      </div>

                      <div className="my-parking-card__body">
                        <div className="my-parking-card__heading">
                          <h3 title={parking.title || "آگهی بدون عنوان"}>
                            {parking.title || "آگهی بدون عنوان"}
                          </h3>
                        </div>

                        <div className="my-parking-card__overview" aria-label="شهر و متراژ آگهی">
                          <span className="my-parking-card__city">
                            <span aria-hidden="true">⌖</span>
                            {parking.city || "شهر ثبت نشده"}
                          </span>
                          <span className="my-parking-card__meta-dot" aria-hidden="true">·</span>
                          <span className="my-parking-card__area">
                            {parking.area ? `${parking.area} متر` : "متراژ نامشخص"}
                          </span>
                        </div>

                        <div className="my-parking-card__price">
                          <span>قیمت آگهی</span>
                          <strong>
                            {formatRialPrice(parking.price, {
                              priceType: parking.priceType || "monthly",
                              fallback: "توافقی",
                            })}
                          </strong>
                        </div>

                        <div className="my-parking-card__actions">
                          <Link
                            to={`/parking/${parking.id}`}
                            className="my-parking-card__action my-parking-card__action--secondary"
                          >
                            مشاهده آگهی
                          </Link>
                          <details className="my-parking-card__management">
                            <summary aria-label={`مدیریت آگهی ${parking.title || "بدون عنوان"}`}>
                              مدیریت آگهی
                              <span className="my-parking-card__manage-chevron" aria-hidden="true">⌄</span>
                            </summary>
                            <div className="my-parking-card__management-panel">
                              <div className="my-parking-card__status-control">
                                <label htmlFor={`status-${parking.id}`}>
                                  وضعیت نمایش
                                </label>
                                <div className="my-parking-card__select-wrap">
                                  <select
                                    id={`status-${parking.id}`}
                                    value={status}
                                    disabled={updatingId === parking.id}
                                    onChange={(event) =>
                                      handleStatusChange(parking.id, event.target.value)
                                    }
                                  >
                                    <option value="active">فعال</option>
                                    <option value="rented">اجاره داده شد</option>
                                    <option value="inactive">غیرفعال</option>
                                  </select>
                                  <span aria-hidden="true">▾</span>
                                </div>
                                {updatingId === parking.id && (
                                  <div className="my-parking-card__saving" role="status">
                                    در حال ذخیره تغییرات...
                                  </div>
                                )}
                              </div>
                              <Link
                                to={`/edit-parking/${parking.id}`}
                                className="my-parking-card__action my-parking-card__action--primary"
                              >
                                ویرایش آگهی
                              </Link>
                            </div>
                          </details>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default MyParkings;