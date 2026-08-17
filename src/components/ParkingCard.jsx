import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  getCurrentSessionUser,
  subscribeToAuth,
} from "../services/authService";

import {
  addFavorite,
  getFavoriteStatus,
  removeFavorite,
} from "../services/favoriteService";

import "./ParkingCard.css";

const CATEGORY_INFO = {
  parking: {
    label: "پارکینگ",
    icon: "🚘",
  },
  storage: {
    label: "انبار",
    icon: "📦",
  },
  warehouse: {
    label: "سوله",
    icon: "🏭",
  },
  shop: {
    label: "مغازه",
    icon: "🏪",
  },
  land: {
    label: "زمین",
    icon: "🌱",
  },
  other: {
    label: "سایر فضاها",
    icon: "✨",
  },
};

function ParkingCard({ parking }) {
  const navigate = useNavigate();

  const {
    id,
    title,
    city,
    area,
    price,
    imageUrl,
    status = "active",
    listingType = "offer",
    category = "parking",
    categoryLabel,
    customCategory,
  } = parking;

  const [user, setUser] =
    useState(null);

  const [isFavorite, setIsFavorite] =
    useState(false);

  const [
    favoriteLoading,
    setFavoriteLoading,
  ] = useState(true);

  const [
    favoriteChanging,
    setFavoriteChanging,
  ] = useState(false);

  const isWanted =
    listingType === "wanted";

  const categoryInfo =
    CATEGORY_INFO[category] ||
    CATEGORY_INFO.other;

  const visibleCategory =
    category === "other"
      ? customCategory?.trim() ||
        categoryLabel?.trim() ||
        "سایر فضاها"
      : categoryLabel?.trim() ||
        categoryInfo.label;

  const typeInfo = isWanted
    ? {
        label: "دنبال فضا",
        detail:
          "متقاضی این نوع فضاست",
        icon: "🔎",
        className:
          "parking-card__listing-type--wanted",
      }
    : {
        label: "فضا برای اجاره",
        detail:
          "مالک این فضا را عرضه کرده",
        icon: "🏠",
        className:
          "parking-card__listing-type--offer",
      };

  const getStatusInfo = () => {
    if (isWanted) {
      switch (status) {
        case "rented":
          return {
            label:
              "فضا پیدا شد",
            detail:
              "نیاز متقاضی برطرف شده",
            className:
              "parking-card__status--rented",
          };

        case "inactive":
          return {
            label:
              "غیرفعال",
            detail:
              "درخواست موقتاً غیرفعال است",
            className:
              "parking-card__status--inactive",
          };

        default:
          return {
            label:
              "درخواست فعال",
            detail:
              "هنوز در جستجوی فضاست",
            className:
              "parking-card__status--active",
          };
      }
    }

    switch (status) {
      case "rented":
        return {
          label:
            "اجاره داده شد",
          detail:
            "در حال حاضر در دسترس نیست",
          className:
            "parking-card__status--rented",
        };

      case "inactive":
        return {
          label:
            "غیرفعال",
          detail:
            "آگهی موقتاً غیرفعال است",
          className:
            "parking-card__status--inactive",
        };

      default:
        return {
          label:
            "در دسترس",
          detail:
            "آماده استفاده",
          className:
            "parking-card__status--active",
        };
    }
  };

  const statusInfo =
    getStatusInfo();

  useEffect(() => {
    let active = true;

    const loadFavoriteStatus = async (sessionUser) => {
      if (!active) {
        return;
      }

      setUser(sessionUser || null);

      if (!sessionUser || !id) {
        setIsFavorite(false);
        setFavoriteLoading(false);
        return;
      }

      setFavoriteLoading(true);

      try {
        const result = await getFavoriteStatus(id);

        if (active) {
          setIsFavorite(result);
        }
      } catch (error) {
        console.error(
          "خطا در بررسی علاقه‌مندی:",
          error
        );

        if (error?.status === 401 && active) {
          setUser(null);
          setIsFavorite(false);
        }
      } finally {
        if (active) {
          setFavoriteLoading(false);
        }
      }
    };

    loadFavoriteStatus(
      getCurrentSessionUser()
    );

    const unsubscribeAuth =
      subscribeToAuth((sessionUser) => {
        loadFavoriteStatus(sessionUser);
      });

    const handleFavoritesChanged = () => {
      loadFavoriteStatus(
        getCurrentSessionUser()
      );
    };

    window.addEventListener(
      "fazajoo:favorites-changed",
      handleFavoritesChanged
    );

    return () => {
      active = false;
      unsubscribeAuth();
      window.removeEventListener(
        "fazajoo:favorites-changed",
        handleFavoritesChanged
      );
    };
  }, [id]);

  const handleFavorite =
    async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const sessionUser =
        getCurrentSessionUser();

      if (!sessionUser) {
        alert(
          "برای ذخیره آگهی ابتدا وارد حساب شوید."
        );

        navigate("/login");
        return;
      }

      if (
        favoriteChanging ||
        favoriteLoading
      ) {
        return;
      }

      setUser(sessionUser);
      setFavoriteChanging(true);

      try {
        if (isFavorite) {
          await removeFavorite(id);
          setIsFavorite(false);
        } else {
          await addFavorite(id);
          setIsFavorite(true);
        }
      } catch (error) {
        console.error(
          "خطا در تغییر علاقه‌مندی:",
          error
        );

        if (error?.status === 401) {
          alert(
            "نشست شما منقضی شده است. دوباره وارد شوید."
          );
          navigate("/login");
        } else {
          alert(
            error?.message ||
              "ذخیره علاقه‌مندی انجام نشد. دوباره تلاش کنید."
          );
        }
      } finally {
        setFavoriteChanging(false);
      }
    };

  return (
    <article
      className={[
        "parking-card",
        isWanted
          ? "parking-card--wanted"
          : "parking-card--offer",
        status === "inactive"
          ? "parking-card--inactive"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Link
        to={`/parking/${id}`}
        className="parking-card__image-link"
        aria-label={`مشاهده آگهی ${
          title || visibleCategory
        }`}
      >
        <div className="parking-card__image-wrapper">
          {isWanted ? (
            <div className="parking-card__request-hero">
              <div className="parking-card__request-icon">
                🔎
              </div>

              <span className="parking-card__request-kicker">
                درخواست فضا
              </span>

              <strong className="parking-card__request-title">
                دنبال {visibleCategory}
              </strong>

              <span className="parking-card__request-city">
                در {city || "شهر ثبت نشده"}
              </span>
            </div>
          ) : imageUrl ? (
            <img
              className="parking-card__image"
              src={imageUrl}
              alt={
                title ||
                `تصویر ${visibleCategory}`
              }
              loading="lazy"
            />
          ) : (
            <div className="parking-card__placeholder">
              <div className="parking-card__placeholder-icon">
                {categoryInfo.icon}
              </div>

              <span>
                تصویر {visibleCategory}
              </span>
            </div>
          )}

          <div
            className={`parking-card__status ${statusInfo.className}`}
          >
            <span className="parking-card__status-dot" />

            {statusInfo.label}
          </div>

          <div className="parking-card__category">
            <span>
              {categoryInfo.icon}
            </span>

            {visibleCategory}
          </div>

          <div
            className={`parking-card__listing-type ${typeInfo.className}`}
          >
            <span>
              {typeInfo.icon}
            </span>

            {typeInfo.label}
          </div>
        </div>
      </Link>

      <div className="parking-card__content">
        <div className="parking-card__top">
          <div>
            <div className="parking-card__type-caption">
              {typeInfo.detail}
            </div>

            <Link
              to={`/parking/${id}`}
              className="parking-card__title-link"
            >
              <h3 className="parking-card__title">
                {title ||
                  (isWanted
                    ? `دنبال ${visibleCategory}`
                    : `${visibleCategory} برای اجاره`)}
              </h3>
            </Link>

            <div className="parking-card__location">
              <span className="parking-card__location-icon">
                📍
              </span>

              <span>
                {city ||
                  "شهر ثبت نشده"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={`parking-card__favorite ${
              isFavorite
                ? "parking-card__favorite--active"
                : ""
            }`}
            onClick={
              handleFavorite
            }
            disabled={
              favoriteLoading ||
              favoriteChanging
            }
            aria-label={
              isFavorite
                ? "حذف از علاقه‌مندی‌ها"
                : "افزودن به علاقه‌مندی‌ها"
            }
            title={
              isFavorite
                ? "حذف از علاقه‌مندی‌ها"
                : "ذخیره آگهی"
            }
          >
            {favoriteChanging
              ? "…"
              : isFavorite
                ? "♥"
                : "♡"}
          </button>
        </div>

        <div className="parking-card__features">
          <div className="parking-card__feature">
            <span className="parking-card__feature-icon parking-card__feature-icon--purple">
              ↔
            </span>

            <div>
              <span className="parking-card__feature-label">
                {isWanted
                  ? "متراژ مدنظر"
                  : "متراژ"}
              </span>

              <strong>
                {area
                  ? `${area} متر`
                  : "ثبت نشده"}
              </strong>
            </div>
          </div>

          <div className="parking-card__feature">
            <span className="parking-card__feature-icon parking-card__feature-icon--cyan">
              {isWanted
                ? "🔎"
                : "🛡"}
            </span>

            <div>
              <span className="parking-card__feature-label">
                وضعیت
              </span>

              <strong>
                {
                  statusInfo.detail
                }
              </strong>
            </div>
          </div>
        </div>

        <div className="parking-card__divider" />

        <div className="parking-card__footer">
          <div className="parking-card__price">
            <span className="parking-card__price-label">
              {isWanted
                ? "بودجه"
                : "قیمت"}
            </span>

            <strong>
              {price ||
                "توافقی"}
            </strong>
          </div>

          <Link
            to={`/parking/${id}`}
            className="parking-card__details-button"
          >
            مشاهده جزئیات

            <span aria-hidden="true">
              ←
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ParkingCard;