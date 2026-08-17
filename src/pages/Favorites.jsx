import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";

import ParkingCard from "../components/ParkingCard";
import {
  getCurrentSessionUser,
  subscribeToAuth,
} from "../services/authService";
import {
  getFavorites,
  removeFavorite,
} from "../services/favoriteService";
import "./Favorites.css";

function Favorites() {
  const [user, setUser] =
    useState(
      getCurrentSessionUser()
    );

  const [authLoading, setAuthLoading] =
    useState(false);

  const [favorites, setFavorites] =
    useState([]);

  const [favoritesLoading, setFavoritesLoading] =
    useState(true);

  const [favoritesError, setFavoritesError] =
    useState("");

  const [removingId, setRemovingId] =
    useState("");

  const loadFavorites = async (sessionUser = getCurrentSessionUser()) => {
    if (!sessionUser) {
      setFavorites([]);
      setFavoritesLoading(false);
      setFavoritesError("");
      return;
    }

    setFavoritesLoading(true);
    setFavoritesError("");

    try {
      const items = await getFavorites();
      setFavorites(items);
    } catch (error) {
      console.error(
        "Load favorites error:",
        error
      );

      setFavorites([]);
      setFavoritesError(
        error?.message ||
          "دریافت علاقه‌مندی‌ها انجام نشد."
      );
    } finally {
      setFavoritesLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const initialUser =
      getCurrentSessionUser();

    setUser(initialUser);
    setAuthLoading(false);
    loadFavorites(initialUser);

    const unsubscribeAuth =
      subscribeToAuth((sessionUser) => {
        if (!active) {
          return;
        }

        setUser(sessionUser || null);
        setAuthLoading(false);
        loadFavorites(sessionUser);
      });

    const handleChanged = () => {
      if (active) {
        loadFavorites();
      }
    };

    window.addEventListener(
      "fazajoo:favorites-changed",
      handleChanged
    );

    return () => {
      active = false;
      unsubscribeAuth();
      window.removeEventListener(
        "fazajoo:favorites-changed",
        handleChanged
      );
    };
  }, []);

  const normalizedFavorites =
    useMemo(() => {
      return favorites.map(
        (favorite) => ({
          ...favorite,
          id: favorite.id,
          title:
            favorite.title ||
            "آگهی بدون عنوان",
          city:
            favorite.city ||
            "شهر ثبت نشده",
          area:
            favorite.area || "",
          price:
            favorite.price ||
            "توافقی",
          imageUrl:
            favorite.imageUrl || "",
        })
      );
    }, [favorites]);

  const handleRemoveFavorite = async (
    parkingId
  ) => {
    if (!user || !parkingId) {
      return;
    }

    const confirmed =
      window.confirm(
        "این آگهی از علاقه‌مندی‌ها حذف شود؟"
      );

    if (!confirmed) {
      return;
    }

    setRemovingId(
      String(parkingId)
    );

    try {
      await removeFavorite(parkingId);

      setFavorites((current) =>
        current.filter(
          (item) =>
            String(item.id) !==
            String(parkingId)
        )
      );
    } catch (error) {
      console.error(
        "Remove favorite error:",
        error
      );

      alert(
        error?.message ||
          "حذف آگهی از علاقه‌مندی‌ها انجام نشد."
      );
    } finally {
      setRemovingId("");
    }
  };

  if (
    authLoading ||
    favoritesLoading
  ) {
    return (
      <main className="favorites-page">
        <section className="favorites-hero">
          <div className="container">
            <span className="favorites-hero__eyebrow">
              ❤️ علاقه‌مندی‌ها
            </span>

            <h1>
              آگهی‌های ذخیره‌شده
            </h1>

            <p>
              در حال دریافت علاقه‌مندی‌های
              شما هستیم.
            </p>
          </div>
        </section>

        <section className="favorites-content">
          <div className="container">
            <div className="favorites-loading">
              <span>♡</span>

              <strong>
                کمی صبر کنید...
              </strong>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="favorites-page">
        <section className="favorites-hero">
          <div className="container">
            <span className="favorites-hero__eyebrow">
              ❤️ علاقه‌مندی‌ها
            </span>

            <h1>
              آگهی‌های ذخیره‌شده
            </h1>

            <p>
              برای مشاهده علاقه‌مندی‌ها
              وارد حساب کاربری شوید.
            </p>
          </div>
        </section>

        <section className="favorites-content">
          <div className="container">
            <div className="favorites-empty">
              <div className="favorites-empty__icon">
                🔐
              </div>

              <span>
                ورود لازم است
              </span>

              <h2>
                ابتدا وارد حساب شوید
              </h2>

              <p>
                آگهی‌های ذخیره‌شده فقط برای
                صاحب حساب نمایش داده می‌شوند.
              </p>

              <Link
                to="/login"
                className="favorites-empty__button"
              >
                ورود به حساب
                <span>←</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="favorites-page">
      <section className="favorites-hero">
        <div className="favorites-hero__shape favorites-hero__shape--one" />
        <div className="favorites-hero__shape favorites-hero__shape--two" />

        <div className="container favorites-hero__content">
          <div>
            <span className="favorites-hero__eyebrow">
              ❤️ علاقه‌مندی‌ها
            </span>

            <h1>
              آگهی‌های ذخیره‌شده
            </h1>

            <p>
              همه پارکینگ‌هایی که پسندیده‌ای
              در این صفحه نگهداری می‌شوند.
            </p>
          </div>

          <div className="favorites-hero__count">
            <strong>
              {normalizedFavorites.length.toLocaleString(
                "fa-IR"
              )}
            </strong>

            <span>
              آگهی ذخیره‌شده
            </span>
          </div>
        </div>
      </section>

      <section className="favorites-content">
        <div className="container">
          {favoritesError && (
            <div className="favorites-error">
              <span>⚠</span>

              <p>
                {favoritesError}
              </p>
            </div>
          )}

          {normalizedFavorites.length > 0 ? (
            <>
              <div className="favorites-heading">
                <div>
                  <span>
                    انتخاب‌های شما
                  </span>

                  <h2>
                    علاقه‌مندی‌های من
                  </h2>
                </div>

                <Link
                  to="/parking"
                  className="favorites-heading__link"
                >
                  مشاهده همه آگهی‌ها
                  <span>←</span>
                </Link>
              </div>

              <div className="favorites-grid">
                {normalizedFavorites.map(
                  (parking) => (
                    <div
                      key={parking.id}
                      className="favorites-item"
                    >
                      <ParkingCard
                        parking={parking}
                      />

                      <button
                        type="button"
                        className="favorites-item__remove"
                        onClick={() =>
                          handleRemoveFavorite(
                            parking.id
                          )
                        }
                        disabled={
                          removingId ===
                          String(parking.id)
                        }
                      >
                        <span>♥</span>

                        {removingId ===
                        String(parking.id)
                          ? "در حال حذف..."
                          : "حذف از علاقه‌مندی‌ها"}
                      </button>
                    </div>
                  )
                )}
              </div>
            </>
          ) : (
            <div className="favorites-empty">
              <div className="favorites-empty__icon">
                ♡
              </div>

              <span>
                هنوز چیزی ذخیره نشده
              </span>

              <h2>
                علاقه‌مندی‌های شما خالی است
              </h2>

              <p>
                روی قلب کنار هر آگهی بزن تا
                آن آگهی در این صفحه ذخیره شود.
              </p>

              <Link
                to="/parking"
                className="favorites-empty__button"
              >
                مشاهده آگهی‌ها
                <span>←</span>
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Favorites;