import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  buildMatchingDashboard,
  getCategoryLabel,
} from "../utils/matchingEngine";

import "./AgencyDashboard.css";

const TAB_CONFIG = {
  "my-offers": {
    eyebrow: "فایل‌های شما",
    title: "متقاضیان مناسب آگهی‌های شما",
    description:
      "درخواست‌هایی که با فایل‌های ثبت‌شده شما هم‌خوانی دارند.",
    emptyTitle: "فعلاً متقاضی مناسبی برای آگهی‌های شما پیدا نشده",
    emptyText:
      "با ثبت درخواست‌های جدید، فضاجو دوباره فایل‌های شما را بررسی می‌کند.",
  },
  "my-requests": {
    eyebrow: "متقاضیان شما",
    title: "آگهی‌های مناسب متقاضیان شما",
    description:
      "فایل‌هایی که با نیازهای ثبت‌شده شما یا مشتریانتان هم‌خوانی دارند.",
    emptyTitle: "فعلاً آگهی مناسبی برای متقاضیان شما پیدا نشده",
    emptyText:
      "با اضافه‌شدن فایل‌های جدید، نتیجه‌های مناسب در همین بخش دیده می‌شوند.",
  },
  network: {
    eyebrow: "شبکه فضاجو",
    title: "فرصت‌های شبکه فضاجو برای شما",
    description:
      "تطبیق‌های ارزشمند بیرون از فایل‌ها و متقاضیان مستقیم شما.",
    emptyTitle: "فعلاً فرصت شبکه‌ای مناسبی آماده نیست",
    emptyText:
      "با رشد آگهی‌ها و درخواست‌های فضاجو، فرصت‌های جدید اینجا نمایش داده می‌شوند.",
  },
};

function faNumber(value) {
  return Number(value || 0).toLocaleString("fa-IR");
}

function getApiBase() {
  return (import.meta.env.VITE_API_URL || "http://localhost:6060/api").replace(/\/$/, "");
}

function getAuthToken() {
  return localStorage.getItem("fazajoo_auth_token") || "";
}

function MatchGroup({ items = [], activeTab, networkState = {} }) {
  const config = TAB_CONFIG[activeTab];

  if (!items.length) {
    return (
      <div className="agency-dashboard__empty">
        <span className="agency-dashboard__empty-icon">⌁</span>
        <h3>{config.emptyTitle}</h3>
        <p>{config.emptyText}</p>
      </div>
    );
  }

  return (
    <div className="agency-dashboard__match-list">
      {items.slice(0, 8).map(({ request, candidates }) => {
        const primaryCandidate = candidates?.[0];
        const offer = primaryCandidate?.offer;
        const score = primaryCandidate?.score;
        const reasons = primaryCandidate?.reasons || [];

        if (!offer) return null;

        return (
          <article className="agency-dashboard__match-row" key={`${request.id}-${offer.id}`}>
            {activeTab === "my-offers" ? (
              <>
                <div className="agency-dashboard__side-card agency-dashboard__side-card--my-file">
                  <div className="agency-dashboard__role-head">
                    <span className="agency-dashboard__card-label">فایل شما</span>
                    <span className="agency-dashboard__property-match-badge" title="درصد تطبیق این فایل با متقاضی">
                      <b>{faNumber(score)}٪</b>
                      <small>تطبیق فایل</small>
                    </span>
                  </div>
                  <h3 className="agency-dashboard__file-title">
                    {offer.title || getCategoryLabel(offer)}
                  </h3>
                  <p>
                    {offer.city || "شهر ثبت نشده"}
                    {offer.area ? ` • ${faNumber(offer.area)} متر` : ""}
                  </p>

                  {!!reasons.length && (
                    <div className="agency-dashboard__reasons">
                      {reasons.slice(0, 3).map((reason) => (
                        <span key={reason}>✓ {reason}</span>
                      ))}
                    </div>
                  )}

                  <Link to={`/parking/${offer.id}`}>مشاهده فایل شما</Link>
                </div>

                <div className="agency-dashboard__match-connector" aria-hidden="true">
                  <span>↔</span>
                </div>

                <div className="agency-dashboard__side-card agency-dashboard__side-card--matched-applicant">
                  <span className="agency-dashboard__card-label">متقاضی مناسب این فایل</span>
                  <h3 className="agency-dashboard__applicant-title">
                    {request.title || `دنبال ${getCategoryLabel(request)}`}
                  </h3>
                  <p>
                    {request.city || "شهر ثبت نشده"}
                    {request.area ? ` • ${faNumber(request.area)} متر` : ""}
                  </p>
                  <Link to={`/parking/${request.id}`}>مشاهده متقاضی</Link>
                </div>
              </>
            ) : activeTab === "network" ? (
              <>
                <div className="agency-dashboard__side-card agency-dashboard__side-card--network-request">
                  <span className="agency-dashboard__card-label">متقاضی شبکه فضاجو</span>
                  <h3 className="agency-dashboard__applicant-title">
                    {request.title || `دنبال ${getCategoryLabel(request)}`}
                  </h3>
                  <p>
                    {request.city || "شهر ثبت نشده"}
                    {request.area ? ` • ${faNumber(request.area)} متر` : ""}
                  </p>
                  {networkState.isUnlocked(request.id, offer.id) ? (
                    <Link to={`/parking/${request.id}`}>مشاهده متقاضی</Link>
                  ) : (
                    <span className="agency-dashboard__locked-link">اطلاعات کامل پس از دریافت فرصت</span>
                  )}
                </div>

                <div className="agency-dashboard__network-match-score" aria-label={`درصد تطبیق ${faNumber(score)} درصد`}>
                  <b>{faNumber(score)}٪</b>
                  <small>تطبیق</small>
                </div>

                <div className="agency-dashboard__side-card agency-dashboard__side-card--network-offer">
                  <span className="agency-dashboard__card-label">فایل شبکه فضاجو</span>
                  <h3 className="agency-dashboard__file-title">
                    {offer.title || getCategoryLabel(offer)}
                  </h3>
                  <p>
                    {offer.city || "شهر ثبت نشده"}
                    {offer.area ? ` • ${faNumber(offer.area)} متر` : ""}
                  </p>

                  {!!reasons.length && (
                    <div className="agency-dashboard__reasons">
                      {reasons.slice(0, 3).map((reason) => (
                        <span key={reason}>✓ {reason}</span>
                      ))}
                    </div>
                  )}

                  {networkState.isUnlocked(request.id, offer.id) ? (
                    <Link to={`/parking/${offer.id}`}>مشاهده فایل</Link>
                  ) : (
                    <button
                      type="button"
                      className="agency-dashboard__unlock-button"
                      disabled={networkState.unlockingKey === `${request.id}:${offer.id}`}
                      onClick={() => networkState.unlock(request.id, offer.id)}
                    >
                      {networkState.unlockingKey === `${request.id}:${offer.id}`
                        ? "در حال دریافت..."
                        : "دریافت فرصت"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="agency-dashboard__side-card agency-dashboard__side-card--request agency-dashboard__side-card--my-applicant">
                  <div className="agency-dashboard__role-head">
                    <span className="agency-dashboard__card-label">متقاضی شما</span>
                    <span className="agency-dashboard__applicant-match-badge" title="درصد تطبیق متقاضی شما با این فایل">
                      <b>{faNumber(primaryCandidate?.score)}٪</b>
                      <small>تطبیق متقاضی</small>
                    </span>
                  </div>
                  <h3 className="agency-dashboard__applicant-title">
                    {request.title || `دنبال ${getCategoryLabel(request)}`}
                  </h3>
                  <p>
                    {request.city || "شهر ثبت نشده"}
                    {request.area ? ` • ${faNumber(request.area)} متر` : ""}
                  </p>
                  <Link to={`/parking/${request.id}`}>مشاهده درخواست</Link>
                </div>

                <div className="agency-dashboard__match-connector" aria-hidden="true">
                  <span>↔</span>
                  <small>تطبیق فضاجو</small>
                </div>

                <div className="agency-dashboard__candidate-stack">
                  {candidates.slice(0, 3).map(({ offer, score, reasons }, index) => (
                    <div className="agency-dashboard__side-card agency-dashboard__side-card--offer" key={offer.id}>
                      <div className="agency-dashboard__offer-head">
                        <span className="agency-dashboard__card-label">
                          {index === 0 ? "بهترین آگهی پیشنهادی" : "آگهی پیشنهادی"}
                        </span>
                      </div>

                      <h3 className="agency-dashboard__file-title">{offer.title || getCategoryLabel(offer)}</h3>
                      <p>
                        {offer.city || "شهر ثبت نشده"}
                        {offer.area ? ` • ${faNumber(offer.area)} متر` : ""}
                      </p>

                      {!!reasons?.length && (
                        <div className="agency-dashboard__reasons">
                          {reasons.slice(0, 3).map((reason) => (
                            <span key={reason}>✓ {reason}</span>
                          ))}
                        </div>
                      )}

                      <Link to={`/parking/${offer.id}`}>مشاهده آگهی</Link>
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}

function AgencyDashboard({ parkings = [], currentUser = null }) {
  const [activeTab, setActiveTab] = useState("my-offers");
  const [networkQuota, setNetworkQuota] = useState(null);
  const [networkError, setNetworkError] = useState("");
  const [unlockingKey, setUnlockingKey] = useState("");

  const loadNetworkQuota = async () => {
    try {
      setNetworkError("");
      const response = await fetch(`${getApiBase()}/agency/network/quota`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.message || "دریافت سهمیه انجام نشد.");
      setNetworkQuota(data);
    } catch (error) {
      setNetworkError(error.message || "دریافت سهمیه انجام نشد.");
    }
  };

  useEffect(() => {
    loadNetworkQuota();
  }, []);

  const unlockedKeys = useMemo(
    () =>
      new Set(
        (networkQuota?.unlocked || []).map(
          (item) => `${item.requestSpaceId}:${item.offerSpaceId}`
        )
      ),
    [networkQuota]
  );

  const isNetworkUnlocked = (requestId, offerId) =>
    unlockedKeys.has(`${requestId}:${offerId}`);

  const unlockNetworkOpportunity = async (requestId, offerId) => {
    const key = `${requestId}:${offerId}`;
    try {
      setUnlockingKey(key);
      setNetworkError("");
      const response = await fetch(`${getApiBase()}/agency/network/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ requestSpaceId: requestId, offerSpaceId: offerId }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.message || "دریافت فرصت انجام نشد.");
      setNetworkQuota(data.quota);
    } catch (error) {
      setNetworkError(error.message || "دریافت فرصت انجام نشد.");
    } finally {
      setUnlockingKey("");
    }
  };

  const dashboardData = useMemo(
    () => buildMatchingDashboard({ parkings, currentUser }),
    [parkings, currentUser]
  );

  const tabItems = {
    "my-offers": dashboardData.myOfferOpportunities,
    "my-requests": dashboardData.myRequestMatches,
    network: dashboardData.networkOpportunities,
  };

  const tabCounts = {
    "my-offers": dashboardData.myOfferOpportunities.length,
    "my-requests": dashboardData.myRequestMatches.length,
    network: dashboardData.networkOpportunities.length,
  };

  const activeConfig = TAB_CONFIG[activeTab];
  const displayName =
    currentUser?.displayName ||
    currentUser?.fullName ||
    currentUser?.name ||
    "مشاور فضاجو";

  return (
    <main className="agency-dashboard">
      <section className="agency-dashboard__hero">
        <div className="agency-dashboard__container agency-dashboard__hero-inner">
          <div>
            <span className="agency-dashboard__eyebrow">پنل حرفه‌ای مشاور املاک</span>
            <h1 className="agency-dashboard__welcome-title">
              <strong>سلام {displayName}</strong>
              <span>، فرصت‌های مناسب را یکجا ببینید</span>
            </h1>
            <p>
              فضاجو فایل‌ها و درخواست‌ها را کنار هم می‌گذارد تا سریع‌تر به
              متقاضی، آگهی و فرصت مناسب برسید.
            </p>
          </div>

          <div className="agency-dashboard__hero-actions">
            <Link to="/add-parking" className="agency-dashboard__primary-action">
              + ثبت فایل یا درخواست
            </Link>
            <Link to="/agency/inbox" className="agency-dashboard__secondary-action">
              گفتگوهای کاری
            </Link>
          </div>
        </div>
      </section>

      <section className="agency-dashboard__content">
        <div className="agency-dashboard__container">
          <nav className="agency-dashboard__section-tabs" aria-label="بخش‌های تطبیق مشاور">
            {Object.entries(TAB_CONFIG).map(([key, item]) => (
              <button
                key={key}
                type="button"
                className={
                  activeTab === key
                    ? "agency-dashboard__section-tab agency-dashboard__section-tab--active"
                    : "agency-dashboard__section-tab"
                }
                onClick={() => setActiveTab(key)}
              >
                <span className="agency-dashboard__section-tab-copy">
                  <small>{item.eyebrow}</small>
                  <strong>{item.title}</strong>
                </span>
                <span className="agency-dashboard__section-tab-count">
                  {faNumber(tabCounts[key])}
                </span>
              </button>
            ))}
          </nav>

          <div className="agency-dashboard__workspace">
            <section className="agency-dashboard__results">
              <header className="agency-dashboard__results-heading">
                <div>
                  <span>{activeConfig.eyebrow}</span>
                  <h2>{activeConfig.title}</h2>
                  <p>{activeConfig.description}</p>
                </div>
                <strong>{faNumber(tabCounts[activeTab])} نتیجه</strong>
              </header>

              {activeTab === "network" && (
                <div className="agency-dashboard__quota-card">
                  <div>
                    <span>سهمیه فرصت‌های شبکه</span>
                    <strong>
                      {networkQuota
                        ? `${faNumber(networkQuota.totalRemaining)} فرصت باقی‌مانده`
                        : "در حال دریافت سهمیه..."}
                    </strong>
                    <small>
                      {networkQuota
                        ? `${faNumber(networkQuota.freeRemaining)} رایگان${networkQuota.paidRemaining ? ` + ${faNumber(networkQuota.paidRemaining)} خریداری‌شده` : ""}`
                        : "دیدن خلاصه فرصت از سهمیه کم نمی‌کند."}
                    </small>
                  </div>
                  <span className="agency-dashboard__quota-badge">
                    {networkQuota ? faNumber(networkQuota.totalRemaining) : "…"}
                  </span>
                </div>
              )}

              {networkError && (
                <div className="agency-dashboard__network-error">{networkError}</div>
              )}

              <MatchGroup
                items={tabItems[activeTab]}
                activeTab={activeTab}
                networkState={{
                  isUnlocked: isNetworkUnlocked,
                  unlock: unlockNetworkOpportunity,
                  unlockingKey,
                }}
              />
            </section>

            <aside className="agency-dashboard__tools">
              <div className="agency-dashboard__tools-heading">
                <span>دسترسی سریع</span>
                <h2>ابزارهای کاری شما</h2>
              </div>

              <div className="agency-dashboard__tool-list">
                <Link to="/agency/applicants">
                  <span>⌕</span>
                  <div>
                    <strong>متقاضیان ثبت‌شده</strong>
                    <small>درخواست‌های دنبال فضا را ببینید</small>
                  </div>
                </Link>

                <Link to="/add-parking">
                  <span>＋</span>
                  <div>
                    <strong>ثبت فایل جدید</strong>
                    <small>فایل عرضه یا نیاز مشتری ثبت کنید</small>
                  </div>
                </Link>

                <Link to="/agency/inbox">
                  <span>◌</span>
                  <div>
                    <strong>گفتگوهای کاری</strong>
                    <small>پیام‌های واقعی حساب مشاور</small>
                  </div>
                </Link>

                <Link to="/my-parkings">
                  <span>▣</span>
                  <div>
                    <strong>مدیریت فایل‌های من</strong>
                    <small>آگهی‌ها و درخواست‌های خودتان</small>
                  </div>
                </Link>
              </div>

              <div className="agency-dashboard__summary">
                <span>خلاصه حساب</span>
                <div>
                  <p>فایل‌های من <strong>{faNumber(dashboardData.myOffers.length)}</strong></p>
                  <p>درخواست‌های من <strong>{faNumber(dashboardData.myRequests.length)}</strong></p>
                </div>
              </div>
            </aside>
          </div>

          {activeTab === "network" && (
            <div className="agency-dashboard__network-note">
              <strong>فرصت‌های شبکه فضاجو</strong>
              <p>
                خلاصه فرصت‌ها رایگان دیده می‌شود. فقط با انتخاب «دریافت فرصت»
                یک سهمیه مصرف می‌شود و اطلاعات کامل همان تطبیق برای شما باز می‌شود.
                هر فرصت شبکه حداکثر برای سه مشاور قابل دریافت است.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default AgencyDashboard;
