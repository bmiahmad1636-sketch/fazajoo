import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AnimatedLogo from "./AnimatedLogo";
import "./Hero.css";

const categories = [
  {
    title: "مسکونی",
    search: "مسکونی",
  },
  {
    title: "ویلا",
    search: "ویلا",
  },
  {
    title: "مغازه",
    search: "مغازه",
  },
  {
    title: "زمین",
    search: "زمین",
  },
  {
    title: "پارکینگ",
    search: "پارکینگ",
  },
  {
    title: "انبار",
    search: "انبار",
  },
  {
    title: "سوله",
    search: "سوله",
  },
  {
    title: "سایر فضاها",
    search: "سایر فضاها",
  },
];

function Hero() {
  const navigate = useNavigate();

  const [search, setSearch] =
    useState("");

  const handleSearch = (event) => {
    event.preventDefault();

    const value = search.trim();

    if (!value) {
      navigate("/parking");
      return;
    }

    navigate(
      `/parking?search=${encodeURIComponent(
        value
      )}`
    );
  };

  const handleCategoryClick = (
    category
  ) => {
    navigate(
      `/parking?search=${encodeURIComponent(
        category.search
      )}`
    );
  };

  return (
    <section className="home-hero">
      <div className="home-hero__decoration home-hero__decoration--one" />

      <div className="home-hero__decoration home-hero__decoration--two" />

      <div className="home-hero__container">
        <div className="home-hero__content">
          <span className="home-hero__badge">
            جستجوی ساده میان آگهی‌های واقعی
          </span>

          <h1 className="home-hero__title">
            هر نیاز،
            <span> یک فضا.</span>
          </h1>

          <p className="home-hero__description">
            مسکونی، ویلا، پارکینگ، انبار، سوله،
            مغازه، زمین و سایر فضاها؛ مستقیم
            از مالک و بدون واسطه.
          </p>

          <form
            className="home-hero__search"
            onSubmit={handleSearch}
          >
            <div className="home-hero__search-input">
              <span aria-hidden="true">
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="شهر، محله یا نوع فضا را جستجو کن..."
                aria-label="جستجوی فضا"
              />
            </div>

            <button type="submit">
              جستجوی فضا

              <span aria-hidden="true">
                ←
              </span>
            </button>
          </form>

          <button
            type="button"
            className="home-hero__smart-find"
            onClick={() => navigate("/find-for-me")}
            aria-label="جستجوی هوشمند فضاجو"
          >
            <span className="home-hero__smart-find-info">
              <span className="home-hero__smart-find-icon" aria-hidden="true">
                <span className="home-hero__smart-find-lens">
                  <span className="home-hero__smart-find-glint" />
                </span>
                <span className="home-hero__smart-find-handle" />
                  <span className="home-hero__smart-find-finger" aria-hidden="true">👆</span>
              </span>
              <span>
                <strong>جستجوی هوشمند</strong>
                <small>سریع، دقیق و هوشمند</small>
              </span>
            </span>

            <span className="home-hero__smart-find-mark" aria-hidden="true">!</span>

            <span className="home-hero__smart-find-copy">
              <strong>فضاجو،</strong>
              <small>خواسته ات رو بنویس، فضاجو بهترین گزینه‌ها رو برات پیدا می‌کنه.</small>
              <span className="home-hero__smart-find-cta">شروع جستجوی هوشمند <b aria-hidden="true">←</b></span>
            </span>

            <span className="home-hero__smart-find-sparkles" aria-hidden="true">✦ ✧</span>
          </button>

          <div className="home-hero__categories">
            {categories.map(
              (category) => (
                <button
                  type="button"
                  key={
                    category.title
                  }
                  onClick={() =>
                    handleCategoryClick(
                      category
                    )
                  }
                >
                  {category.title}
                </button>
              )
            )}
          </div>

          <div className="home-hero__benefits">
            <span>
              آگهی‌های واقعی
            </span>

            <i />

            <span>
              ارتباط مستقیم با مالک
            </span>

            <i />

            <span>
              ثبت آگهی آسان
            </span>
          </div>
        </div>

        <div className="home-hero__brand">
          <div className="home-hero__brand-glow" />

          <AnimatedLogo
            size={205}
            className="home-hero__animated-logo"
          />

          <p>
            فضای مناسب، نزدیک‌تر از چیزی
            است که فکر می‌کنی.
          </p>
        </div>
      </div>
    </section>
  );
}

export default Hero;