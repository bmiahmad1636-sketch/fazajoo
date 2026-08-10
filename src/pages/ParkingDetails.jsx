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

  const listingType =
    parking?.listingType || "offer";

  const isWanted =
    listingType === "wanted";

  const category =
    parking?.category || "parking";

  const categoryInfo =
    CATEGORY_INFO[category] ||
    CATEGORY_INFO.other;

  const visibleCategory =
    category === "other"
      ? String(
          parking?.customCategory ||
            parking?.categoryLabel ||
            "سایر فضاها"
        ).trim()
      : String(
          parking?.categoryLabel ||
            categoryInfo.label
        ).trim();

  const categoryIcon =
    categoryInfo.icon;

  const listingTypeLabel =
    isWanted
      ? "دنبال فضا"
      : "فضا برای اجاره";

  const status = parking?.status || "active";

  const isRented = status === "rented";
  const isInactive = status === "inactive";

  const statusLabel = isWanted
    ? isRented
      ? "فضا پیدا شد"
      : isInactive
        ? "غیرفعال"
        : "درخواست فعال"
    : isRented
      ? "اجاره داده شد"
      : isInactive
        ? "غیرفعال"
        : "در دسترس";

  const statusDescription = isWanted
    ? isRented
      ? "نیاز متقاضی برطرف شده است"
      : isInactive
        ? "این درخواست موقتاً غیرفعال است"
        : "متقاضی هنوز در جستجوی فضاست"
    : isRented
      ? "این فضا اجاره داده شده است"
      : isInactive
        ? "این آگهی موقتاً غیرفعال است"
        : "آماده استفاده";

  const ownerDisplayName = (() => {
    const phone = String(
      parking?.phone || ""
    )
      .replace(/\s/g, "")
      .trim();

    if (/^09\d{9}$/.test(phone)) {
      return phone;
    }

    const ownerEmail = String(
      parking?.ownerEmail || ""
    ).trim();

    const mobileMatch =
      ownerEmail.match(/09\d{9}/);

    if (mobileMatch) {
      return mobileMatch[0];
    }

    return isWanted
      ? "متقاضی فضاجو"
      : "آگهی‌دهنده فضاجو";
  })();

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
        `آگهی ${visibleCategory}`,
      text: isWanted
        ? `این درخواست ${visibleCategory} را در فضاجو ببین.`
        : `این آگهی ${visibleCategory} را در فضاجو ببین.`,
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
                <span
                  className={`parking-details-badge ${
                    isRented
                      ? "parking-details-badge--rented"
                      : isInactive
                        ? "parking-details-badge--inactive"
                        : "parking-details-badge--available"
                  }`}
                >
                  <span />
                  {statusLabel}
                </span>

                <span className="parking-details-badge parking-details-badge--type">
                  {categoryIcon} {visibleCategory}
                </span>

                <span className="parking-details-badge parking-details-badge--type">
                  {isWanted ? "🔎" : "🏠"} {listingTypeLabel}
                </span>
              </div>

              <h1>
                {parking.title ||
                  (isWanted
                    ? `دنبال ${visibleCategory}`
                    : `${visibleCategory} برای اجاره`)}
              </h1>

              <p>
                <span>📍</span>

                {parking.city ||
                  "شهر ثبت نشده"}
              </p>
            </div>

            <div className="parking-details-hero__price">
              <span>
                {isWanted ? "بودجه" : "قیمت آگهی"}
              </span>

              <strong>
                {parking.price ||
                  "توافقی"}
              </strong>

              <small>
                {isWanted
                  ? "بودجه ثبت‌شده توسط متقاضی"
                  : "مبلغ ثبت‌شده توسط آگهی‌دهنده"}
              </small>
            </div>
          </div>
        </div>
      </section>

      <section className="parking-details-content">
        <div className="container">
          <div className="parking-details-layout">
            <div className="parking-details-main">
              <article
                className={[
                  "parking-details-gallery",
                  !parking.imageUrl
                    ? "parking-details-gallery--empty"
                    : "",
                  isWanted
                    ? "parking-details-gallery--wanted"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {parking.imageUrl ? (
                  <img
                    src={
                      parking.imageUrl
                    }
                    alt={
                      parking.title ||
                      `تصویر ${visibleCategory}`
                    }
                  />
                ) : (
                  <div className="parking-details-gallery__placeholder">
                    <span>
                      {isWanted ? "🔎" : categoryIcon}
                    </span>

                    <strong>
                      {isWanted
                        ? `درخواست ${visibleCategory}`
                        : `تصویر ${visibleCategory}`}
                    </strong>

                    <p>
                      {isWanted
                        ? "برای این درخواست تصویری ثبت نشده است."
                        : "تصویری برای این آگهی ثبت نشده است."}
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
                      {isWanted
                        ? `نیازمندی ${visibleCategory}`
                        : `اطلاعات ${visibleCategory}`}
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
                        {isWanted ? "متراژ مدنظر" : "متراژ"}
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
                        {statusDescription}
                      </strong>
                    </div>
                  </div>

                  <div className="parking-details-feature">
                    <span className="parking-details-feature__icon parking-details-feature__icon--orange">
                      💰
                    </span>

                    <div>
                      <span>
                        {isWanted ? "بودجه" : "قیمت"}
                      </span>

                      <strong>
                        {parking.price ||
                          "توافقی"}
                      </strong>
                    </div>
                  </div>
                </div>
              </article>

              <article className="parking-details-section parking-details-section--description">
                <div className="parking-details-section__heading">
                  <div className="parking-details-section__icon parking-details-section__icon--description">
                    ☰
                  </div>

                  <div>
                    <span>
                      درباره آگهی
                    </span>

                    <h2>
                      {isWanted
                        ? `توضیحات نیاز به ${visibleCategory}`
                        : `توضیحات ${visibleCategory}`}
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
                    {isWanted
                      ? `محدوده دقیق موردنظر برای ${visibleCategory} را از طریق تماس با متقاضی دریافت کنید.`
                      : `موقعیت دقیق ${visibleCategory} را از طریق تماس با آگهی‌دهنده دریافت کنید.`}
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
                    {isWanted
                      ? "ارتباط با متقاضی"
                      : "ارتباط با آگهی‌دهنده"}
                  </span>

                  <h2>
                    {isWanted
                      ? isRented
                        ? "این درخواست تأمین شده"
                        : isInactive
                          ? "این درخواست غیرفعال است"
                          : "این نیاز را می‌توانی تأمین کنی؟"
                      : isRented
                        ? `این ${visibleCategory} اجاره داده شده`
                        : isInactive
                          ? "این آگهی غیرفعال است"
                          : `این ${visibleCategory} را پسندیدی؟`}
                  </h2>

                  <p>
                    {isWanted
                      ? isRented
                        ? "متقاضی فضای موردنظرش را پیدا کرده است."
                        : isInactive
                          ? "این درخواست فعلاً توسط ثبت‌کننده غیرفعال شده است."
                          : `اگر ${visibleCategory} مناسب داری، برای هماهنگی با متقاضی تماس بگیر یا پیام بده.`
                      : isRented
                        ? "این فضا دیگر برای اجاره در دسترس نیست."
                        : isInactive
                          ? "این آگهی فعلاً توسط صاحب آن غیرفعال شده است."
                          : "برای دریافت اطلاعات بیشتر و هماهنگی، شماره تماس را مشاهده کن."}
                  </p>
                </div>

                {isRented || isInactive ? (
                  <div className="parking-contact-card__unavailable">
                    <span>{isRented ? "✅" : "⏸"}</span>

                    <p>
                      {isWanted
                        ? isRented
                          ? "این درخواست تأمین شده و امکان تماس یا شروع گفتگوی جدید برای آن غیرفعال است."
                          : "این درخواست موقتاً غیرفعال است و امکان تماس یا شروع گفتگوی جدید برای آن وجود ندارد."
                        : isRented
                          ? "این فضا اجاره داده شده و امکان تماس یا شروع گفتگوی جدید برای آن غیرفعال است."
                          : "این آگهی موقتاً غیرفعال است و امکان تماس یا شروع گفتگوی جدید برای آن وجود ندارد."}
                    </p>
                  </div>
                ) : parking.phone ? (
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
                        : isWanted
                          ? "نمایش شماره متقاضی"
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
                      {isWanted
                        ? "شماره تماس برای این درخواست ثبت نشده است."
                        : "شماره تماس برای این آگهی ثبت نشده است."}
                    </p>
                  </div>
                )}

                {!authLoading &&
                  !isOwner &&
                  !isRented &&
                  !isInactive && (
                    <Link
                      to={`/chat/${parking.id}`}
                      className="parking-contact-card__phone-button"
                      style={{
                        marginTop: "12px",
                        textDecoration: "none",
                      }}
                    >
                      <span>💬</span>
                      {isWanted
                        ? "ارسال پیام به متقاضی"
                        : "ارسال پیام به آگهی‌دهنده"}
                    </Link>
                  )}

                <div className="parking-contact-card__divider" />

                <div className="parking-contact-card__owner">
                  <div className="parking-contact-card__avatar">
                    {isWanted ? "م" : "ف"}
                  </div>

                  <div>
                    <span>
                      {isWanted
                        ? "ثبت‌کننده درخواست"
                        : "ثبت‌کننده آگهی"}
                    </span>

                    <strong>
                      {ownerDisplayName}
                    </strong>
                  </div>
                </div>

                <div className="parking-contact-card__notice">
                  <span>🛡</span>

                  <p>
                    {isWanted
                      ? "پیش از هماهنگی یا توافق، جزئیات درخواست را بررسی کنید."
                      : "پیش از پرداخت یا توافق، اطلاعات آگهی را بررسی کنید."}
                  </p>
                </div>
              </div>

              {!authLoading && isOwner && (
                <div className="parking-owner-card">
                  <div className="parking-owner-card__heading">
                    <span>⚙</span>

                    <div>
                      <strong>
                        {isWanted
                          ? "مدیریت درخواست"
                          : "مدیریت آگهی"}
                      </strong>

                      <small>
                        {isWanted
                          ? "این درخواست متعلق به شماست"
                          : "این آگهی متعلق به شماست"}
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="parking-owner-card__edit"
                    onClick={handleEdit}
                  >
                    <span>✎</span>
                    {isWanted
                      ? "ویرایش درخواست"
                      : "ویرایش آگهی"}
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
                      : isWanted
                        ? "حذف درخواست"
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
                      {isWanted
                        ? "فقط ثبت‌کننده درخواست می‌تواند آن را ویرایش یا حذف کند."
                        : "فقط صاحب آگهی می‌تواند آن را ویرایش یا حذف کند."}
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