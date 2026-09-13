import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPublicAgencyProfile } from "../services/agencyPublicService";
import { formatRialPrice } from "../utils/priceFormatter";
import "./AgencyPublicProfile.css";

const CATEGORY_LABELS = {
  parking: "پارکینگ",
  residential: "مسکونی",
  villa: "ویلا",
  storage: "انبار",
  warehouse: "سوله",
  shop: "مغازه",
  land: "زمین",
  other: "سایر",
};

function formatPersianDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function displayPrice(item) {
  if (item?.category === "residential") return item?.price || "توافقی";
  if (!item?.price) return "توافقی";
  return formatRialPrice(item.price) || item.price;
}

export default function AgencyPublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const data = await getPublicAgencyProfile(userId);
        if (active) setProfile(data);
      } catch (err) {
        if (active) setError(err?.message || "دریافت پروفایل انجام نشد.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [userId]);

  const initials = useMemo(() => {
    const source = profile?.agencyName || "فضاجو";
    return source.trim().slice(0, 2);
  }, [profile]);

  if (loading) {
    return <div className="agency-public-state">در حال دریافت پروفایل مشاور...</div>;
  }

  if (error || !profile) {
    return (
      <div className="agency-public-state agency-public-state--error">
        <strong>پروفایل قابل نمایش نیست</strong>
        <span>{error || "اطلاعات این مشاور در دسترس نیست."}</span>
        <button type="button" onClick={() => navigate(-1)}>بازگشت</button>
      </div>
    );
  }

  return (
    <main className="agency-public-page" dir="rtl">
      <section className="agency-public-hero">
        <div className="agency-public-shell">
          <button
            type="button"
            className="agency-public-back"
            onClick={() => navigate(-1)}
          >
            ← بازگشت
          </button>

          <div className="agency-public-identity">
            <div className="agency-public-avatar" aria-hidden="true">{initials}</div>
            <div className="agency-public-title">
              <div className="agency-public-verified">
                <span>✓</span>
                مشاور املاک تأییدشده فضاجو
              </div>
              <h1>{profile.agencyName}</h1>
              <p>{profile.responsibleName}</p>
            </div>
          </div>

          <div className="agency-public-trust-note">
            <span>🛡️</span>
            <div>
              <strong>هویت این مشاور توسط فضاجو بررسی شده است</strong>
              <small>اطلاعات حساس، مدارک و شماره تماس در پروفایل عمومی منتشر نمی‌شوند.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="agency-public-shell agency-public-content">
        <div className="agency-public-stats">
          <article>
            <span>شهر فعالیت</span>
            <strong>{profile.city || "—"}</strong>
          </article>
          <article>
            <span>آگهی فعال</span>
            <strong>{Number(profile.activeListingsCount || 0).toLocaleString("fa-IR")}</strong>
          </article>
          <article>
            <span>همراه فضاجو از</span>
            <strong>{formatPersianDate(profile.memberSince)}</strong>
          </article>
        </div>

        <div className="agency-public-section-heading">
          <div>
            <span>فایل‌های این مشاور</span>
            <h2>آگهی‌های فعال</h2>
          </div>
          <small>تا ۱۲ آگهی جدید نمایش داده می‌شود</small>
        </div>

        {profile.listings?.length ? (
          <div className="agency-public-grid">
            {profile.listings.map((item) => {
              const categoryLabel =
                item.category === "other"
                  ? item.customCategory || item.categoryLabel || "سایر"
                  : item.categoryLabel || CATEGORY_LABELS[item.category] || "فضا";

              return (
                <Link
                  key={item.id}
                  to={`/parking/${item.id}`}
                  className="agency-public-card"
                >
                  <div className="agency-public-card__image">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} loading="lazy" />
                    ) : (
                      <div className="agency-public-card__placeholder">فضاجو</div>
                    )}
                    <span>{categoryLabel}</span>
                  </div>
                  <div className="agency-public-card__body">
                    <h3>{item.title}</h3>
                    <p>{item.city} · {Number(item.area || 0).toLocaleString("fa-IR")} متر</p>
                    <strong>{displayPrice(item)}</strong>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="agency-public-empty">
            این مشاور در حال حاضر آگهی فعال عمومی ندارد.
          </div>
        )}
      </section>
    </main>
  );
}
