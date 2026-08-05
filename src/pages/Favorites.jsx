import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth, db } from "../firebase";
import ParkingCard from "../components/ParkingCard";
import "./Favorites.css";

function Favorites() {
  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [favorites, setFavorites] =
    useState([]);

  const [favoritesLoading, setFavoritesLoading] =
    useState(true);

  const [favoritesError, setFavoritesError] =
    useState("");

  const [removingId, setRemovingId] =
    useState("");

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        },
        (error) => {
          console.error(
            "Favorite auth error:",
            error
          );

          setUser(null);
          setAuthLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authLoading) {
      return undefined;
    }

    if (!user) {
      setFavorites([]);
      setFavoritesLoading(false);
      setFavoritesError("");
      return undefined;
    }

    setFavoritesLoading(true);
    setFavoritesError("");

    const favoritesReference =
      collection(
        db,
        "users",
        user.uid,
        "favorites"
      );

    const favoritesQuery = query(
      favoritesReference,
      orderBy("savedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      favoritesQuery,
      (snapshot) => {
        const favoriteItems =
          snapshot.docs.map(
            (favoriteDocument) => ({
              id: favoriteDocument.id,
              ...favoriteDocument.data(),
            })
          );

        setFavorites(favoriteItems);
        setFavoritesLoading(false);
        setFavoritesError("");
      },
      (error) => {
        console.error(
          "Load favorites error:",
          error
        );

        setFavorites([]);
        setFavoritesLoading(false);

        setFavoritesError(
          "دریافت علاقه‌مندی‌ها انجام نشد."
        );
      }
    );

    return unsubscribe;
  }, [
    user,
    authLoading,
  ]);

  const normalizedFavorites =
    useMemo(() => {
      return favorites.map(
        (favorite) => ({
          id:
            favorite.parkingId ||
            favorite.id,

          title:
            favorite.title ||
            "پارکینگ بدون عنوان",

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
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "favorites",
          String(parkingId)
        )
      );
    } catch (error) {
      console.error(
        "Remove favorite error:",
        error
      );

      alert(
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