import { useState } from "react";
import { useNavigate } from "react-router-dom";

import FeaturedShowcaseHP03 from "./FeaturedShowcaseHP03";
import "./Hero.css";
import "./HeroPremiumHP01.css";
import "./HeroCompactHP02.css";
import "./FeaturedShowcaseHP03.css";

// Preserve the nine existing category values: Parking uses them as URL filters.
const categories = [
  { title: "مسکونی", value: "residential" },
  { title: "مغازه", value: "shop" },
  { title: "زمین", value: "land" },
  { title: "باغ", value: "garden" },
  { title: "پارکینگ", value: "parking" },
  { title: "انبار", value: "storage" },
  { title: "سوله", value: "warehouse" },
  { title: "ویلا", value: "villa" },
  { title: "سایر", value: "other" },
];

function CategoryIcon({ type }) {
  const paths = {
    residential: ["M3 11 12 3l9 8v10H3V11Z", "M9 21v-7h6v7"],
    shop: ["M3 9h18l-2-6H5L3 9Z", "M4 9v12h16V9", "M9 21v-8h6v8"],
    land: ["m4 8 7-5 9 4-3 13-13 1V8Z", "M4 13h14", "M11 3v10"],
    garden: ["M12 22v-9", "M6 13a5 5 0 0 1 2-9 5 5 0 0 1 8 0 5 5 0 0 1 2 9 5 5 0 0 1-12 0Z", "M7 22h10"],
    parking: ["M4 3h16v18H4z", "M9 17V7h4a3 3 0 0 1 0 6H9"],
    storage: ["M3 8 12 3l9 5v13H3V8Z", "M3 8h18", "M8 21v-9h8v9"],
    warehouse: ["M2 20V9l6 4V9l6 4V5h8v15H2Z", "M6 17h2", "M12 17h2", "M18 17h2"],
    villa: ["M3 11 12 3l9 8", "M5 10v11h14V10", "M9 21v-7h6v7", "M18 2v4", "M16 4h4"],
    other: ["M12 4v16", "M4 12h16", "M6 6h12v12H6z"],
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[type].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

function Hero() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/parking?search=${encodeURIComponent(query)}` : "/parking");
  };

  const handleCategoryClick = (category) => {
    navigate(`/parking?category=${encodeURIComponent(category.value)}`);
  };

  return (
    <section className="home-hero hp01-hero" dir="rtl" aria-label="معرفی فضاجو و جستجوی فضا">
      <div className="hp01-hero__glow hp01-hero__glow--one" aria-hidden="true" />
      <div className="hp01-hero__glow hp01-hero__glow--two" aria-hidden="true" />
      <div className="hp01-hero__container">
        <div className="hp01-hero__copy">
          <span className="hp01-hero__eyebrow"><span className="hp01-hero__eyebrow-mark" />بازار تخصصی اجاره فضا <span aria-hidden="true">/</span> فضاجو</span>
          <h1 className="hp01-hero__headline">
            <span>هر فضا،</span>
            <strong>یک فرصت</strong>
          </h1>
          <p className="hp01-hero__lead">
            برای زندگی، کسب‌وکار یا نگهداری؛ فضای موردنیازت رو پیدا کن، شرایطش رو ببین و مستقیم گفتگو رو شروع کن.
          </p>
          <form className="hp01-hero__search" role="search" onSubmit={handleSearch}>
            <label htmlFor="hp01-search-input" className="hp01-hero__search-label">جستجو در آگهی‌های فضاجو</label>
            <div className="hp01-hero__search-bar">
              <span className="hp01-hero__search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="10.7" cy="10.7" r="6.6"/><path d="m16 16 5 5"/></svg>
              </span>
              <input id="hp01-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="نام فضا، شهر یا ویژگی موردنظر..." autoComplete="off" />
              <button type="submit" aria-label="جستجوی آگهی‌ها"><span>جستجو</span><b aria-hidden="true">←</b></button>
            </div>
            <small>مثلاً: سوله، اصفهان، پارکینگ، باغ</small>
          </form>
          <div className="hp01-hero__actions">
            <button type="button" className="hp01-hero__action hp01-hero__action--primary" onClick={() => navigate("/parking")}>مشاهده همه آگهی‌ها <span aria-hidden="true">←</span></button>
            <button type="button" className="hp01-hero__action hp01-hero__action--outline" onClick={() => navigate("/add-parking")}>ثبت آگهی جدید <span aria-hidden="true">＋</span></button>
          </div>
          <div className="hp01-hero__promises" aria-label="امکانات فضاجو">
            <span><i />عرضه و درخواست فضا</span><span><i />گفتگوی مستقیم</span><span><i />جستجوی هوشمند</span>
          </div>
        </div>

        <div className="hp01-hero__art" aria-label="نمایی از تنوع فضاها در فضاجو">
          <div className="hp01-hero__art-top"><span>فضا برای هر نیاز</span><span className="hp01-hero__art-index" dir="ltr">FAZAJOO / 01</span></div>
          <FeaturedShowcaseHP03 />
          <div className="hp01-hero__art-footer">
            <div><small>برای پیدا کردن فضای مناسب</small><strong>فقط یک جستجو فاصله‌ست.</strong></div>
            <button type="button" onClick={() => navigate("/find-for-me")}><span aria-hidden="true">✦</span><span>فضاجو برات پیدا می‌کنه</span><b aria-hidden="true">←</b></button>
          </div>
        </div>
      </div>

      <div className="hp01-hero__categories-wrap">
        <div className="hp01-hero__categories-head"><div><span>از هر فضا، یک فرصت</span><h2>دسته‌بندی فضاها</h2></div><p>نوع فضای موردنظرت رو انتخاب کن و آگهی‌های مرتبط رو ببین.</p></div>
        <div className="hp01-hero__categories" aria-label="دسته‌بندی‌های فضاجو">
          {categories.map((category) => (
            <button type="button" key={category.value} onClick={() => handleCategoryClick(category)} aria-label={`مشاهده آگهی‌های ${category.title}`}>
              <span className="hp01-hero__category-icon"><CategoryIcon type={category.value} /></span>
              <strong>{category.title}</strong>
              <span className="hp01-hero__category-arrow" aria-hidden="true">↖</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Hero;
