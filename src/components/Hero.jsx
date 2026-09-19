import { useNavigate } from "react-router-dom";

import AnimatedLogo from "./AnimatedLogo";
import "./Hero.css";

const categories = [
  { title: "مسکونی", value: "residential", icon: "⌂" },
  { title: "مغازه", value: "shop", icon: "▤" },
  { title: "زمین", value: "land", icon: "◇" },
  { title: "پارکینگ", value: "parking", icon: "P" },
  { title: "انبار", value: "storage", icon: "□" },
  { title: "سوله", value: "warehouse", icon: "⌁" },
  { title: "ویلا", value: "villa", icon: "⌂" },
  { title: "سایر", value: "other", icon: "+" },
];

function Hero() {
  const navigate = useNavigate();

  const handleCategoryClick = (category) => {
    navigate(`/parking?category=${encodeURIComponent(category.value)}`);
  };

  return (
    <section className="home-hero" dir="rtl">
      <div className="home-hero__orb home-hero__orb--top" />
      <div className="home-hero__orb home-hero__orb--bottom" />

      <div className="home-hero__container">
        <div className="home-hero__content">
          <div className="home-hero__eyebrow">
            <span className="home-hero__eyebrow-dot" />
            بازار تخصصی اجاره فضا
          </div>

          <h1 className="home-hero__title">
            فضای درست،
            <br />
            <span>برای نیاز واقعی تو.</span>
          </h1>

          <p className="home-hero__description">
            از خانه و مغازه تا پارکینگ، انبار و سوله؛ فضاهای مناسب را
            ساده‌تر پیدا کن، مقایسه کن و مستقیم گفتگو را شروع کن.
          </p>

          <div className="home-hero__actions">
            <button
              type="button"
              className="home-hero__primary"
              onClick={() => navigate("/parking")}
            >
              <span>مشاهده فضاها</span>
              <b aria-hidden="true">←</b>
            </button>

            <button
              type="button"
              className="home-hero__secondary"
              onClick={() => navigate("/add-parking")}
            >
              <span className="home-hero__plus" aria-hidden="true">+</span>
              ثبت آگهی
            </button>
          </div>

          <div className="home-hero__categories" aria-label="دسته‌بندی فضاها">
            {categories.map((category) => (
              <button
                type="button"
                key={category.title}
                onClick={() => handleCategoryClick(category)}
              >
                <span className="home-hero__category-icon" aria-hidden="true">
                  {category.icon}
                </span>
                <span>{category.title}</span>
              </button>
            ))}
          </div>

          <div className="home-hero__trust-row">
            <span>جستجوی تخصصی</span>
            <i />
            <span>گفتگوی مستقیم</span>
            <i />
            <span>پیگیری هوشمند</span>
          </div>
        </div>

        <div className="home-hero__visual" aria-label="فضاجو، بازار تخصصی اجاره فضا">
          <div className="home-hero__visual-grid" />
          <div className="home-hero__logo-shell">
            <AnimatedLogo size={190} className="home-hero__animated-logo" />
            <p>هر فضا، یک فرصت تازه.</p>
          </div>

          <div className="home-hero__float-card home-hero__float-card--search">
            <span className="home-hero__float-icon">⌕</span>
            <span>
              <small>جستجوی هدفمند</small>
              <strong>همان فضایی که می‌خواهی</strong>
            </span>
          </div>

          <button
            type="button"
            className="home-hero__float-card home-hero__float-card--smart"
            onClick={() => navigate("/find-for-me")}
          >
            <span className="home-hero__smart-mark">!</span>
            <span>
              <small>خبرم کن</small>
              <strong>فضاجو برات پیدا می‌کنه</strong>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;
