import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  buildMatchingDashboard,
  getCategoryLabel,
} from "../utils/matchingEngine";

import "./AgencyDashboard.css";

function MatchGroup({
  items = [],
  emptyTitle,
  emptyText,
}) {
  if (!items.length) {
    return (
      <div className="agency-dashboard__empty">
        <span>✨</span>
        <h3>{emptyTitle}</h3>
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="agency-dashboard__smart-matches">
      {items.slice(0, 6).map(
        ({
          request,
          candidates,
        }) => (
          <article
            className="agency-dashboard__smart-card"
            key={request.id}
          >
            <div className="agency-dashboard__smart-request">
              <div>
                <span className="agency-dashboard__request-badge">
                  🔎 درخواست
                </span>

                <h3>
                  {request.title ||
                    `دنبال ${getCategoryLabel(
                      request
                    )}`}
                </h3>

                <p>
                  📍{" "}
                  {request.city ||
                    "شهر ثبت نشده"}
                </p>
              </div>

              <Link
                to={`/parking/${request.id}`}
              >
                جزئیات درخواست
              </Link>
            </div>

            <div className="agency-dashboard__candidate-list">
              {candidates.map(
                ({
                  offer,
                  score,
                  reasons,
                }) => (
                  <div
                    className="agency-dashboard__candidate"
                    key={offer.id}
                  >
                    <div className="agency-dashboard__candidate-score">
                      <strong>
                        {score.toLocaleString(
                          "fa-IR"
                        )}
                        ٪
                      </strong>

                      <span>
                        تطبیق
                      </span>
                    </div>

                    <div className="agency-dashboard__candidate-main">
                      <strong>
                        {offer.title ||
                          getCategoryLabel(
                            offer
                          )}
                      </strong>

                      <span>
                        {offer.city ||
                          "شهر ثبت نشده"}
                        {offer.area
                          ? ` • ${offer.area} متر`
                          : ""}
                      </span>

                      <small>
                        {reasons.join(
                          " • "
                        )}
                      </small>
                    </div>

                    <Link
                      to={`/parking/${offer.id}`}
                    >
                      مشاهده فایل
                    </Link>
                  </div>
                )
              )}
            </div>
          </article>
        )
      )}
    </div>
  );
}

function AgencyDashboard({
  parkings = [],
  currentUser = null,
}) {
  const [activeTab, setActiveTab] =
    useState("my-offers");

  const dashboardData =
    useMemo(
      () =>
        buildMatchingDashboard({
          parkings,
          currentUser,
        }),
      [
        parkings,
        currentUser,
      ]
    );

  const matchedCount =
    dashboardData.networkOpportunities
      .reduce(
        (total, item) =>
          total +
          item.candidates.length,
        0
      );

  const tabItems = {
    "my-offers":
      dashboardData.myOfferOpportunities,

    "my-requests":
      dashboardData.myRequestMatches,

    network:
      dashboardData.networkOpportunities,
  };

  return (
    <main className="agency-dashboard">
      <section className="agency-dashboard__hero">
        <div className="agency-dashboard__container">
          <div className="agency-dashboard__hero-copy">
            <span className="agency-dashboard__eyebrow">
              موتور تطبیق حرفه‌ای فضاجو
            </span>

            <h1>
              فضاجو؛
              <span>
                {" "}
                دستیار فایل و متقاضی شما
              </span>
            </h1>

            <p>
              درخواست‌ها و فایل‌ها را هوشمند کنار هم
              می‌گذاریم تا فرصت‌های واقعی معامله سریع‌تر
              دیده شوند.
            </p>

            <div className="agency-dashboard__hero-actions">
              <Link
                to="/parking"
                className="agency-dashboard__primary-action"
              >
                مشاهده فایل‌ها و درخواست‌ها
              </Link>

              <Link
                to="/add-parking"
                className="agency-dashboard__secondary-action"
              >
                ثبت فایل یا نیاز مشتری
              </Link>
            </div>
          </div>

          <div className="agency-dashboard__hero-card">
            <span className="agency-dashboard__hero-card-icon">
              🧠
            </span>

            <strong>
              موتور تطبیق فضاجو
            </strong>

            <p>
              نوع فضا، شهر، متراژ، بودجه و تازگی فایل
              بررسی می‌شود و نتایج ناسازگار حذف می‌شوند.
            </p>
          </div>
        </div>
      </section>

      <section className="agency-dashboard__content">
        <div className="agency-dashboard__container">
          <div className="agency-dashboard__stats">
            <article>
              <span>فایل‌های عرضه</span>
              <strong>
                {dashboardData.offers.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>
              <small>
                کل فایل‌های قابل بررسی
              </small>
            </article>

            <article>
              <span>درخواست‌ها</span>
              <strong>
                {dashboardData.requests.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>
              <small>
                نیازهای ثبت‌شده
              </small>
            </article>

            <article>
              <span>فرصت‌های تطبیق</span>
              <strong>
                {matchedCount.toLocaleString(
                  "fa-IR"
                )}
              </strong>
              <small>
                فایل‌های نزدیک به درخواست‌ها
              </small>
            </article>

            <article>
              <span>فایل‌های من</span>
              <strong>
                {dashboardData.myOffers.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>
              <small>
                فایل‌های ثبت‌شده شما
              </small>
            </article>
          </div>

          <div className="agency-dashboard__grid">
            <section className="agency-dashboard__panel">
              <div className="agency-dashboard__panel-heading">
                <div>
                  <span>
                    قلب پنل مشاور
                  </span>

                  <h2>
                    موتور تطبیق فضاجو
                  </h2>
                </div>
              </div>

              <div className="agency-dashboard__match-tabs">
                <button
                  type="button"
                  className={
                    activeTab === "my-offers"
                      ? "agency-dashboard__match-tab agency-dashboard__match-tab--active"
                      : "agency-dashboard__match-tab"
                  }
                  onClick={() =>
                    setActiveTab(
                      "my-offers"
                    )
                  }
                >
                  متقاضی مناسب فایل‌های من
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "my-requests"
                      ? "agency-dashboard__match-tab agency-dashboard__match-tab--active"
                      : "agency-dashboard__match-tab"
                  }
                  onClick={() =>
                    setActiveTab(
                      "my-requests"
                    )
                  }
                >
                  فایل مناسب درخواست‌های من
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "network"
                      ? "agency-dashboard__match-tab agency-dashboard__match-tab--active"
                      : "agency-dashboard__match-tab"
                  }
                  onClick={() =>
                    setActiveTab(
                      "network"
                    )
                  }
                >
                  فرصت‌های شبکه فضاجو
                </button>
              </div>

              <MatchGroup
                items={
                  tabItems[activeTab]
                }
                emptyTitle={
                  activeTab === "my-offers"
                    ? "هنوز متقاضی مناسبی برای فایل‌های شما پیدا نشده"
                    : activeTab === "my-requests"
                      ? "هنوز فایل مناسبی برای درخواست‌های شما پیدا نشده"
                      : "هنوز فرصت شبکه‌ای آماده‌ای نداریم"
                }
                emptyText={
                  activeTab === "network"
                    ? "با بیشتر شدن آگهی‌ها و درخواست‌ها، فرصت‌های شبکه فضاجو اینجا نمایش داده می‌شوند."
                    : "با ثبت فایل و درخواست بیشتر، موتور تطبیق نتایج مناسب را همین‌جا نشان می‌دهد."
                }
              />
            </section>

            <aside className="agency-dashboard__tools">
              <div className="agency-dashboard__panel-heading">
                <div>
                  <span>
                    ابزارهای کاری
                  </span>

                  <h2>
                    میانبر مشاور
                  </h2>
                </div>
              </div>

              <div className="agency-dashboard__tool-list">
                <Link to="/agency/applicants">
                  <span>🔍</span>
                  <div>
                    <strong>
                      پیدا کردن متقاضی
                    </strong>
                    <small>
                      درخواست‌های «دنبال فضا» را بررسی کن
                    </small>
                  </div>
                </Link>

                <Link to="/add-parking">
                  <span>＋</span>
                  <div>
                    <strong>
                      ثبت فایل جدید
                    </strong>
                    <small>
                      فایل عرضه یا نیاز مشتری ثبت کن
                    </small>
                  </div>
                </Link>

                <Link to="/agency/inbox">
                  <span>💬</span>
                  <div>
                    <strong>
                      گفتگوهای کاری
                    </strong>
                    <small>
                      همه گفتگوهای واقعی حساب مشاورت را یکجا ببین
                    </small>
                  </div>
                </Link>

                <Link to="/my-parkings">
                  <span>📁</span>
                  <div>
                    <strong>
                      مدیریت فایل‌های من
                    </strong>
                    <small>
                      فایل‌های ثبت‌شده خودت را مدیریت کن
                    </small>
                  </div>
                </Link>
              </div>
            </aside>
          </div>

          <section className="agency-dashboard__roadmap">
            <div>
              <span>
                مرحله بعدی موتور
              </span>

              <h2>
                محله، امکانات و اعلان تطبیق جدید
              </h2>
            </div>

            <div className="agency-dashboard__roadmap-items">
              <span>
                ✓ رد خودکار شهر نامرتبط
              </span>

              <span>
                ✓ تطبیق فضای خاص
              </span>

              <span>
                ✓ وزن‌دهی متراژ و بودجه
              </span>

              <span>
                ✓ آماده توسعه برای اعلان هوشمند
              </span>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default AgencyDashboard;