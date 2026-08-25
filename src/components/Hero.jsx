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
            مسکونی، پارکینگ، انبار، سوله،
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