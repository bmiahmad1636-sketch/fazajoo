import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  deleteDoc,
  doc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import "./ParkingDetails.css";

function ParkingDetails({
  parkings = [],
  deleteParking,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [showPhone, setShowPhone] =
    useState(false);

  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [deleting, setDeleting] =
    useState(false);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  const parking = useMemo(() => {
    return parkings.find(
      (item) =>
        String(item.id) === String(id)
    );
  }, [parkings, id]);

  const isOwner =
    Boolean(user) &&
    Boolean(parking?.ownerId) &&
    user.uid === parking.ownerId;

  const handleDelete = async () => {
    if (!user) {
      alert(
        "برای حذف آگهی ابتدا وارد حساب شوید."
      );

      navigate("/login");
      return;
    }

    if (!isOwner) {
      alert(
        "شما اجازه حذف این آگهی را ندارید."
      );

      return;
    }

    const confirmDelete =
      window.confirm(
        "آیا از حذف این آگهی مطمئن هستید؟"
      );

    if (!confirmDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteDoc(
        doc(
          db,
          "spaces",
          String(id)
        )
      );

      if (
        typeof deleteParking ===
        "function"
      ) {
        deleteParking(id);
      }

      alert(
        "آگهی با موفقیت حذف شد."
      );

      navigate("/parking");
    } catch (error) {
      console.error(error);

      alert(
        "خطا در حذف آگهی."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    if (!user) {
      alert(
        "برای ویرایش آگهی ابتدا وارد حساب شوید."
      );

      navigate("/login");
      return;
    }

    if (!isOwner) {
      alert(
        "شما اجازه ویرایش این آگهی را ندارید."
      );

      return;
    }

    navigate(
      `/edit-parking/${id}`
    );
  };

  const handleShare = async () => {
    const shareData = {
      title:
        parking?.title ||
        "آگهی پارکینگ",
      text:
        "این آگهی پارکینگ را در فضاجو ببین.",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(
          shareData
        );

        return;
      }

      await navigator.clipboard.writeText(
        window.location.href
      );

      alert(
        "لینک آگهی کپی شد."
      );
    } catch (error) {
      if (
        error?.name !==
        "AbortError"
      ) {
        console.error(error);

        alert(
          "امکان اشتراک‌گذاری لینک وجود ندارد."
        );
      }
    }
  };

  if (!parking) {
    return (
      <main className="parking-details-not-found">
        <div className="parking-details-not-found__card">
          <div className="parking-details-not-found__icon">
            🔍
          </div>

          <span>
            نتیجه‌ای پیدا نشد
          </span>

          <h1>
            این آگهی در دسترس نیست
          </h1>

          <p>
            ممکن است آگهی حذف شده
            باشد یا نشانی آن درست
            نباشد.
          </p>

          <Link
            to="/parking"
            className="parking-details-not-found__button"
          >
            بازگشت به آگهی‌ها
            <span>←</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="parking-details-page">
      <section className="parking-details-hero">
        <div className="parking-details-hero__glow parking-details-hero__glow--one" />
        <div className="parking-details-hero__glow parking-details-hero__glow--two" />

        <div className="container">
          <div className="parking-details-toolbar">
            <Link
              to="/parking"
              className="parking-details-toolbar__back"
            >
              <span>→</span>
              بازگشت به آگهی‌ها
            </Link>

            <div className="parking-details-toolbar__actions">
              <button
                type="button"
                onClick={handleShare}
              >
                <span>↗</span>
                اشتراک‌گذاری
              </button>

              <button
                type="button"
                aria-label="افزودن به علاقه‌مندی‌ها"
              >
                <span>♡</span>
                ذخیره آگهی
              </button>
            </div>
          </div>

          <div className="parking-details-hero__content">
            <div>
              <div className="parking-details-hero__badges">
                <span className="parking-details-badge parking-details-badge--available">
                  <span />
                  در دسترس
                </span>

                <span className="parking-details-badge parking-details-badge--type">
                  پارکینگ
                </span>
              </div>

              <h1>
                {parking.title ||
                  "پارکینگ بدون عنوان"}
              </h1>

              <p>
                <span>📍</span>

                {parking.city ||
                  "شهر ثبت نشده"}
              </p>
            </div>

            <div className="parking-details-hero__price">
              <span>
                قیمت آگهی
              </span>

              <strong>
                {parking.price ||
                  "توافقی"}
              </strong>

              <small>
                مبلغ ثبت‌شده توسط
                آگهی‌دهنده
              </small>
            </div>
          </div>
        </div>
      </section>

      <section className="parking-details-content">
        <div className="container">
          <div className="parking-details-layout">
            <div className="parking-details-main">
              <article className="parking-details-gallery">
                {parking.imageUrl ? (
                  <img
                    src={
                      parking.imageUrl
                    }
                    alt={
                      parking.title ||
                      "تصویر پارکینگ"
                    }
                  />
                ) : (
                  <div className="parking-details-gallery__placeholder">
                    <span>🚘</span>

                    <strong>
                      تصویر پارکینگ
                    </strong>

                    <p>
                      تصویری برای این
                      آگهی ثبت نشده است.
                    </p>
                  </div>
                )}

                <div className="parking-details-gallery__overlay">
                  <span>
                    تصویر آگهی
                  </span>
                </div>
              </article>

              <article className="parking-details-section">
                <div className="parking-details-section__heading">
                  <div className="parking-details-section__icon">
                    ✨
                  </div>

                  <div>
                    <span>
                      مشخصات اصلی
                    </span>

                    <h2>
                      اطلاعات پارکینگ
                    </h2>
                  </div>
                </div>

                <div className="parking-details-features">
                  <div className="parking-details-feature">
                    <span className="parking-details-feature__icon parking-details-feature__icon--purple">
                      📍
                    </span>

                    <div>
                      <span>
                        شهر
                      </span>

                      <strong>
                        {parking.city ||
                          "ثبت نشده"}
                      </strong>
                    </div>
                  </div>

                  <div className="parking-details-feature">
                    <span className="parking-details-feature__icon parking-details-feature__icon--cyan">
                      ↔
                    </span>

                    <div>
                      <span>
                        متراژ
                      </span>

                      <strong>
                        {parking.area
                          ? `${parking.area} متر`
                          : "ثبت نشده"}
                      </strong>
                    </div>
                  </div>

                  <div className="parking-details-feature">
                    <span className="parking-details-feature__icon parking-details-feature__icon--green">
                      🛡
                    </span>

                    <div>
                      <span>
                        وضعیت
                      </span>

                      <strong>
                        آماده استفاده
                      </strong>
                    </div>
                  </div>

                  <div className="parking-details-feature">
                    <span className="parking-details-feature__icon parking-details-feature__icon--orange">
                      💰
                    </span>

                    <div>
                      <span>
                        قیمت
                      </span>

                      <strong>
                        {parking.price ||
                          "توافقی"}
                      </strong>
                    </div>
                  </div>
                </div>
              </article>

              <article className="parking-details-section">
                <div className="parking-details-section__heading">
                  <div className="parking-details-section__icon parking-details-section__icon--description">
                    ☰
                  </div>

                  <div>
                    <span>
                      درباره آگهی
                    </span>

                    <h2>
                      توضیحات پارکینگ
                    </h2>
                  </div>
                </div>

                <p className="parking-details-description">
                  {parking.description ||
                    "توضیحی برای این آگهی ثبت نشده است."}
                </p>
              </article>

              <article className="parking-details-location">
                <div>
                  <span>
                    موقعیت تقریبی
                  </span>

                  <h2>
                    {parking.city ||
                      "شهر ثبت نشده"}
                  </h2>

                  <p>
                    موقعیت دقیق پارکینگ
                    را از طریق تماس با
                    آگهی‌دهنده دریافت
                    کنید.
                  </p>
                </div>

                <div className="parking-details-location__visual">
                  <span>📍</span>

                  <div className="parking-details-location__ring parking-details-location__ring--one" />
                  <div className="parking-details-location__ring parking-details-location__ring--two" />
                </div>
              </article>
            </div>

            <aside className="parking-details-sidebar">
              <div className="parking-contact-card">
                <div className="parking-contact-card__header">
                  <span className="parking-contact-card__eyebrow">
                    ارتباط با آگهی‌دهنده
                  </span>

                  <h2>
                    این پارکینگ را
                    پسندیدی؟
                  </h2>

                  <p>
                    برای دریافت اطلاعات
                    بیشتر و هماهنگی،
                    شماره تماس را مشاهده
                    کن.
                  </p>
                </div>

                {parking.phone ? (
                  <div className="parking-contact-card__phone">
                    <button
                      type="button"
                      className="parking-contact-card__phone-button"
                      onClick={() =>
                        setShowPhone(
                          (current) =>
                            !current
                        )
                      }
                    >
                      <span>
                        📞
                      </span>

                      {showPhone
                        ? "پنهان کردن شماره"
                        : "نمایش شماره تماس"}
                    </button>

                    {showPhone && (
                      <a
                        href={`tel:${parking.phone}`}
                        className="parking-contact-card__phone-number"
                      >
                        <span>
                          تماس مستقیم
                        </span>

                        <strong>
                          {parking.phone}
                        </strong>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="parking-contact-card__unavailable">
                    <span>📵</span>

                    <p>
                      شماره تماس برای این
                      آگهی ثبت نشده است.
                    </p>
                  </div>
                )}

                {!authLoading && !isOwner && (
                  <Link
                    to={`/chat/${parking.id}`}
                    className="parking-contact-card__phone-button"
                    style={{
                      marginTop: "12px",
                      textDecoration: "none",
                    }}
                  >
                    <span>💬</span>
                    ارسال پیام به آگهی‌دهنده
                  </Link>
                )}

                <div className="parking-contact-card__divider" />

                <div className="parking-contact-card__owner">
                  <div className="parking-contact-card__avatar">
                    {parking.ownerEmail
                      ? parking.ownerEmail
                          .charAt(0)
                          .toUpperCase()
                      : "ف"}
                  </div>

                  <div>
                    <span>
                      ثبت‌کننده آگهی
                    </span>

                    <strong>
                      {parking.ownerEmail ||
                        "کاربر فضاجو"}
                    </strong>
                  </div>
                </div>

                <div className="parking-contact-card__notice">
                  <span>🛡</span>

                  <p>
                    پیش از پرداخت یا
                    توافق، اطلاعات آگهی
                    را بررسی کنید.
                  </p>
                </div>
              </div>

              {!authLoading && isOwner && (
                <div className="parking-owner-card">
                  <div className="parking-owner-card__heading">
                    <span>⚙</span>

                    <div>
                      <strong>
                        مدیریت آگهی
                      </strong>

                      <small>
                        این آگهی متعلق به
                        شماست
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="parking-owner-card__edit"
                    onClick={handleEdit}
                  >
                    <span>✎</span>
                    ویرایش آگهی
                  </button>

                  <button
                    type="button"
                    className="parking-owner-card__delete"
                    onClick={
                      handleDelete
                    }
                    disabled={deleting}
                  >
                    <span>⌫</span>

                    {deleting
                      ? "در حال حذف..."
                      : "حذف آگهی"}
                  </button>
                </div>
              )}

              {!authLoading &&
                user &&
                !isOwner && (
                  <div className="parking-owner-note">
                    <span>ℹ</span>

                    <p>
                      فقط صاحب آگهی
                      می‌تواند آن را
                      ویرایش یا حذف کند.
                    </p>
                  </div>
                )}
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ParkingDetails;