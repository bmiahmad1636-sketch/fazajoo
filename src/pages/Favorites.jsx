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

  const [removeDialogOpen, setRemoveDialogOpen] =
    useState(false);
  const [removeDialogId, setRemoveDialogId] =
    useState("");
  const [removeDialogTitle, setRemoveDialogTitle] =
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

  const openRemoveDialog = (parkingId, title = "این آگهی") => {
    if (!user || !parkingId) return;
    setRemoveDialogId(String(parkingId));
    setRemoveDialogTitle(title || "این آگهی");
    setRemoveDialogOpen(true);
  };

  const closeRemoveDialog = () => {
    if (removingId) return;
    setRemoveDialogOpen(false);
    setRemoveDialogId("");
    setRemoveDialogTitle("");
  };

  const handleRemoveFavorite = async () => {
    const parkingId = removeDialogId;
    if (!user || !parkingId || removingId) return;

    setRemovingId(parkingId);

    try {
      await removeFavorite(parkingId);

      setFavorites((current) =>
        current.filter(
          (item) => String(item.id) !== parkingId
        )
      );

      setRemoveDialogOpen(false);
      setRemoveDialogId("");
      setRemoveDialogTitle("");
    } catch (error) {
      console.error(
        "Remove favorite error:",
        error
      );

      setRemoveDialogTitle(
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
                          openRemoveDialog(
                            parking.id,
                            parking.title
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

      {removeDialogOpen && (
        <div
          className="fazajoo-favorites-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeRemoveDialog();
          }}
          role="presentation"
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(31,29,26,.48)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, direction: "rtl"
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: "min(460px,100%)", background: "#fffdf9",
              border: "1px solid rgba(183,106,32,.22)",
              borderRadius: 20, boxShadow: "0 24px 70px rgba(0,0,0,.22)",
              padding: 24, fontFamily: "Estedad, Tahoma, sans-serif", textAlign: "right"
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 15, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: "#fff1df", color: "#a85f1b", fontSize: 24, marginBottom: 14
            }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#302b27", marginBottom: 9 }}>
              حذف از علاقه‌مندی‌ها
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.9, color: "#625b54", whiteSpace: "pre-wrap" }}>
              {removingId
                ? "در حال حذف آگهی..."
                : `آیا مطمئن هستید که «${removeDialogTitle}» از علاقه‌مندی‌های شما حذف شود؟`}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-start", marginTop: 22 }}>
              <button
                type="button"
                onClick={closeRemoveDialog}
                disabled={Boolean(removingId)}
                style={{
                  border: 0, borderRadius: 12, padding: "10px 18px",
                  font: "inherit", fontWeight: 700, cursor: removingId ? "default" : "pointer",
                  background: "#eee9e3", color: "#514a44", opacity: removingId ? .6 : 1
                }}
              >انصراف</button>
              <button
                type="button"
                onClick={handleRemoveFavorite}
                disabled={Boolean(removingId)}
                style={{
                  border: 0, borderRadius: 12, padding: "10px 18px",
                  font: "inherit", fontWeight: 700, cursor: removingId ? "default" : "pointer",
                  background: "#c8792d", color: "#fff", opacity: removingId ? .7 : 1
                }}
              >
                {removingId ? "در حال حذف..." : "حذف از علاقه‌مندی‌ها"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Favorites;