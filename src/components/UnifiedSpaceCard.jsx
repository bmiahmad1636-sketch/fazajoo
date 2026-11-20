import { Link } from 'react-router-dom';
import { getUnifiedCardModel } from '../utils/unifiedCardModel.js';
// Exactly the same approved Compact15 visual styling as the industrial card.
import './IndustrialCardPilot.css';
import './UnifiedSpaceCard.css';

const requestedStatus={active:'درخواست فعال',rented:'فضا پیدا شد',inactive:'درخواست غیرفعال'};
const offeredStatus={active:'در دسترس',rented:'اجاره داده شد',inactive:'آگهی غیرفعال'};

export default function UnifiedSpaceCard({parking, request, termDeclared, areaText, moneyRows,
  fallbackText, categoryLabel, favorite, onFavorite, favoriteDisabled}) {
  const model=getUnifiedCardModel(parking,{request,termDeclared,areaText,moneyRows,fallbackText,categoryLabel});
  const {wanted,title,badges,moneyRows:finance}=model;
  const url=`/parking/${encodeURIComponent(parking.id)}`;
  const label=(wanted?requestedStatus:offeredStatus)[model.status] || (wanted?'درخواست فعال':'در دسترس');
  return <article className={`fj-industrial-card fj-unified-card fj-unified-card--${model.category}${wanted?' fj-industrial-card--wanted':''}`} dir="rtl">
    <Link to={url} className="fj-industrial-card__media" aria-label={`مشاهده آگهی ${title}`}>
      {wanted ? <div className="fj-industrial-card__illustration fj-unified-card__illustration">
        <img src={model.image} alt={`تصویرسازی نمادین ${model.illustrationLabel} مورد تقاضا، نه عکس واقعی ملک`} loading="lazy" />
      </div> : parking.imageUrl ?
        <img className="fj-industrial-card__photo" src={parking.imageUrl} alt={parking.title||`تصویر ${model.categoryLabel}`} loading="lazy" /> :
        <div className="fj-industrial-card__missing-photo"><span aria-hidden="true">▤</span><span>بدون تصویر</span></div>}
      <div className="fj-industrial-card__chips"><span className="fj-industrial-card__side">{wanted?'تقاضا':'عرضه'}</span>
        <span className="fj-industrial-card__category">{model.categoryLabel}</span></div>
      {label&&<span className={`fj-industrial-card__status${model.status==='active'?' fj-industrial-card__status--active':''}`}>
        <span className="fj-industrial-card__status-dot" aria-hidden="true"/>{label}</span>}
    </Link>
    <div className="fj-industrial-card__body">
      <div className="fj-industrial-card__head">
        <Link className="fj-industrial-card__title" to={url} title={title}><h3>{title}</h3></Link>
        <button type="button" className={`fj-industrial-card__favorite${favorite?' is-favorite':''}`}
          onClick={onFavorite} disabled={favoriteDisabled} aria-label={favorite?'حذف از علاقه‌مندی‌ها':'افزودن به علاقه‌مندی‌ها'}>
          <span aria-hidden="true">{favorite?'♥':'♡'}</span>
        </button>
      </div>
      <div className="fj-industrial-card__summary">
        {badges.map((badge,i)=><span key={`${badge.label}-${i}`} className={`fj-industrial-card__term fj-industrial-card__term--${badge.state}`}>
          {badge.label}{badge.ticks&&<span className="fj-industrial-card__ticks" aria-label={badge.state==='primary'?'مدت اصلی':'مدت جایگزین توافقی'}>{badge.ticks}</span>}
        </span>)}
        {model.areaText&&<span className="fj-industrial-card__area">متراژ <bdi>{model.areaText}</bdi></span>}
      </div>
      {finance.length>0&&<div className="fj-industrial-card__finance" aria-label={wanted?'شرایط مالی تقاضا':'شرایط مالی عرضه'}>
        {finance.map((row,i)=><div className="fj-industrial-card__money-row" key={`${row.label}-${i}`}>
          <span className="fj-industrial-card__money-label">{row.label}</span><bdi className="fj-industrial-card__money-amount">{row.amount}</bdi>
        </div>)}
      </div>}
      <Link to={url} className="fj-industrial-card__button">مشاهده جزئیات <span aria-hidden="true">←</span></Link>
    </div>
  </article>;
}
