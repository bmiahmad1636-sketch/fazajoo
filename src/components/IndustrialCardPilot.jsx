import { Link } from "react-router-dom";
import { getIndustrialCardModel } from "../utils/industrialCardModel.js";
import "./IndustrialCardPilot.css";

const requestedStatus = {
  active: "درخواست فعال",
  rented: "فضا پیدا شد",
  inactive: "درخواست غیرفعال",
};
const offeredStatus = {
  active: "در دسترس",
  rented: "اجاره داده شد",
  inactive: "آگهی غیرفعال",
};

/**
 * Deliberately scoped to category=warehouse by ParkingCard.jsx.
 * Pilot: one visual template for supply and demand, using current live listing data.
 */
export default function IndustrialCardPilot({ parking, requested, favorite, onFavorite, favoriteDisabled }) {
  const model = getIndustrialCardModel(parking, requested);
  const { wanted, title, areaText, badges, moneyRows } = model;
  const id = parking.id;
  const statusLabel = wanted ? requestedStatus[model.status] : offeredStatus[model.status];
  const statusActive = model.status === "active";
  const url = `/parking/${encodeURIComponent(id)}`;
  const categoryLabel = requested?.spaceType === "workshop" ? "کارگاه" : "سوله";

  return (
    <article className={`fj-industrial-card${wanted ? " fj-industrial-card--wanted" : ""}`} dir="rtl">
      <Link to={url} className="fj-industrial-card__media" aria-label={`مشاهده آگهی ${title}`}>
        {wanted ? (
          <div className="fj-industrial-card__illustration">
            <img src="/images/fj-industrial-demand.webp" alt="تصویرسازی نمادین سوله موردتقاضا" loading="lazy" />
          </div>
        ) : parking.imageUrl ? (
          <img className="fj-industrial-card__photo" src={parking.imageUrl} alt={parking.title || "تصویر سوله"} loading="lazy" />
        ) : (
          <div className="fj-industrial-card__missing-photo" aria-label="تصویری برای این آگهی ثبت نشده است">
            <span aria-hidden="true">▤</span>
            <span>بدون تصویر</span>
          </div>
        )}
        <div className="fj-industrial-card__chips">
          <span className="fj-industrial-card__side">{wanted ? "تقاضا" : "عرضه"}</span>
          <span className="fj-industrial-card__category">{categoryLabel}</span>
        </div>
        {statusLabel && <span className={`fj-industrial-card__status${statusActive ? " fj-industrial-card__status--active" : ""}`}>
          <span className="fj-industrial-card__status-dot" aria-hidden="true" />
          {statusLabel}
        </span>}
      </Link>
      <div className="fj-industrial-card__body">
        <div className="fj-industrial-card__head">
          <Link to={url} className="fj-industrial-card__title" title={title}><h3>{title}</h3></Link>
          <button type="button" className={`fj-industrial-card__favorite${favorite ? " is-favorite" : ""}`}
            onClick={onFavorite} disabled={favoriteDisabled} aria-label={favorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}>
            <span aria-hidden="true">{favorite ? "♥" : "♡"}</span>
          </button>
        </div>
        <div className="fj-industrial-card__summary">
          {badges.map((badge, index) => <span
            key={`${badge.label}-${index}`}
            className={`fj-industrial-card__term fj-industrial-card__term--${badge.state}`}>
            {badge.label}
            {badge.ticks && <span aria-label={badge.state === "primary" ? "مدت اصلی" : "مدت جایگزین توافقی"} className="fj-industrial-card__ticks">{badge.ticks}</span>}
          </span>)}
          {areaText && <span className="fj-industrial-card__area">متراژ <bdi>{areaText}</bdi></span>}
        </div>
        {moneyRows.length > 0 && <div className="fj-industrial-card__finance" aria-label={wanted ? "بودجه تقاضا" : "شرایط مالی عرضه"}>
          {moneyRows.map((row, index) => <div className="fj-industrial-card__money-row" key={`${row.label}-${index}`}>
            <span className="fj-industrial-card__money-label">{row.label}</span>
            <bdi className="fj-industrial-card__money-amount">{row.amount}</bdi>
          </div>)}
        </div>}
        <Link to={url} className="fj-industrial-card__button">مشاهده جزئیات <span aria-hidden="true">←</span></Link>
      </div>
    </article>
  );
}
