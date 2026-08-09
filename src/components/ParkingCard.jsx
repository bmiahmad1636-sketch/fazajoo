import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
  db,
} from "../firebase";

import "./ParkingCard.css";

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

  const getStatusInfo = () => {
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
    let isMounted = true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!isMounted) {
            return;
          }

          setUser(currentUser);

          if (!currentUser || !id) {
            setIsFavorite(false);
            setFavoriteLoading(false);
            return;
          }

          try {
            const favoriteReference =
              doc(
                db,
                "users",
                currentUser.uid,
                "favorites",
                String(id)
              );

            const favoriteSnapshot =
              await getDoc(
                favoriteReference
              );

            if (isMounted) {
              setIsFavorite(
                favoriteSnapshot.exists()
              );
            }
          } catch (error) {
            console.error(
              "خطا در بررسی علاقه‌مندی:",
              error
            );
          } finally {
            if (isMounted) {
              setFavoriteLoading(
                false
              );
            }
          }
        }
      );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [id]);

  const handleFavorite =
    async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!user) {
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

      setFavoriteChanging(true);

      const favoriteReference =
        doc(
          db,
          "users",
          user.uid,
          "favorites",
          String(id)
        );

      try {
        if (isFavorite) {
          await deleteDoc(
            favoriteReference
          );

          setIsFavorite(false);
        } else {
          await setDoc(
            favoriteReference,
            {
              parkingId:
                String(id),

              title:
                title ||
                "پارکینگ بدون عنوان",

              city:
                city ||
                "شهر ثبت نشده",

              area:
                area || "",

              price:
                price ||
                "توافقی",

              imageUrl:
                imageUrl || "",

              status,

              savedAt:
                serverTimestamp(),
            }
          );

          setIsFavorite(true);
        }
      } catch (error) {
        console.error(
          "خطا در تغییر علاقه‌مندی:",
          error
        );

        alert(
          "ذخیره علاقه‌مندی انجام نشد. دوباره تلاش کنید."
        );
      } finally {
        setFavoriteChanging(false);
      }
    };

  return (
    <article
      className={`parking-card ${
        status === "inactive"
          ? "parking-card--inactive"
          : ""
      }`}
    >
      <Link
        to={`/parking/${id}`}
        className="parking-card__image-link"
        aria-label={`مشاهده آگهی ${
          title || "پارکینگ"
        }`}
      >
        <div className="parking-card__image-wrapper">
          {imageUrl ? (
            <img
              className="parking-card__image"
              src={imageUrl}
              alt={
                title ||
                "تصویر پارکینگ"
              }
              loading="lazy"
            />
          ) : (
            <div className="parking-card__placeholder">
              <span>
                🚗
              </span>

              <span>
                تصویر پارکینگ
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
            پارکینگ
          </div>
        </div>
      </Link>

      <div className="parking-card__content">
        <div className="parking-card__top">
          <div>
            <Link
              to={`/parking/${id}`}
              className="parking-card__title-link"
            >
              <h3 className="parking-card__title">
                {title ||
                  "پارکینگ بدون عنوان"}
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
                متراژ
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
              🛡
            </span>

            <div>
              <span className="parking-card__feature-label">
                وضعیت
              </span>

              <strong>
                {statusInfo.detail}
              </strong>
            </div>
          </div>
        </div>

        <div className="parking-card__divider" />

        <div className="parking-card__footer">
          <div className="parking-card__price">
            <span className="parking-card__price-label">
              قیمت
            </span>

            <strong>
              {price || "توافقی"}
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