import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  buildMatchingDashboard,
  getCategoryLabel,
} from "../utils/matchingEngine";

import { AgencyShell, AgencyPager, AgencySpace, AgencyScore, AgencyReasons, agencyPage } from "./AgencyWorkspaceAG01.jsx";
import "./AgencyWorkspaceAG01.css";
import { API_BASE_URL } from "../config/api";

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
  return API_BASE_URL;
}

function getAuthToken() {
  return localStorage.getItem("fazajoo_auth_token") || "";
}

function MatchGroup({ items = [], activeTab, networkState = {} }) {
  const config = TAB_CONFIG[activeTab];
  if (!items.length) return <div className="ag01-empty"><span aria-hidden="true">↔</span><h3>{config.emptyTitle}</h3><p>{config.emptyText}</p></div>;
  return <div className="ag01-list">{items.map(({ request, candidates }) => {
    const first = candidates?.[0];
    if (!first?.offer) return null;
    const { offer, score, reasons = [] } = first;
    const network = activeTab === "network";
    const unlocked = !network || networkState.isUnlocked(request.id, offer.id);
    const myFile = activeTab === "my-offers";
    const key = `${request.id}:${offer.id}`;
    return <article className="ag01-pair" key={key}>
      <div className="ag01-pair-head"><span>{getCategoryLabel(request)} · {request.city || "شهر ثبت نشده"}</span><AgencyScore score={score}/>{network && <span className="ag01-lock" data-open={unlocked}>{unlocked ? "فرصت دریافت‌شده" : "فرصت دریافت‌نشده"}</span>}</div>
      <div className="ag01-compare">
        <AgencySpace item={myFile ? offer : request} label={myFile ? "فایل شما" : network ? "متقاضی شبکه" : "متقاضی شما"} kind={myFile ? "offer" : "wanted"} canOpen={unlocked}/>
        <span className="ag01-connector" aria-hidden="true">↔</span>
        <AgencySpace item={myFile ? request : offer} label={myFile ? "متقاضی مناسب" : network ? "فایل شبکه" : "بهترین فایل پیشنهادی"} kind={myFile ? "wanted" : "offer"} canOpen={unlocked}/>
      </div>
      <div className="ag01-pair-foot"><AgencyReasons reasons={reasons.slice(0,3)}/>{network && !unlocked && <button className="ag01-primary" type="button" disabled={Boolean(networkState.unlockingKey) || !networkState.ready} onClick={() => networkState.unlock(request.id, offer.id)}>{networkState.unlockingKey === key ? "در حال دریافت..." : "دریافت فرصت"}</button>}</div>
      {activeTab === "my-requests" && candidates.length > 1 && <details className="ag01-alternatives"><summary>فایل‌های پیشنهادی دیگر ({faNumber(Math.min(candidates.length, 3)-1)})</summary>{candidates.slice(1,3).map(candidate => <div className="ag01-alternative" key={candidate.offer.id}><AgencySpace item={candidate.offer} label="آگهی پیشنهادی" kind="offer" canOpen/><AgencyScore score={candidate.score}/><AgencyReasons reasons={(candidate.reasons || []).slice(0,3)}/></div>)}</details>}
    </article>;
  })}</div>;
}

function AgencyDashboard({ parkings = [], currentUser = null }) {
  const [activeTab, setActiveTab] = useState("my-offers");
  const [page, setPage] = useState(1);
  const [networkQuota, setNetworkQuota] = useState(null);
  const [networkError, setNetworkError] = useState("");
  const [unlockingKey, setUnlockingKey] = useState("");
  const [purchaseConfig, setPurchaseConfig] = useState(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [walletBalance, setWalletBalance] = useState(null);
  const [pendingPurchaseKey, setPendingPurchaseKey] = useState(null);

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

  const loadPurchaseData = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const [configResponse, balanceResponse] = await Promise.all([
        fetch(`${getApiBase()}/wallet/network-purchase/config`, { headers, cache: "no-store" }),
        fetch(`${getApiBase()}/wallet/balance`, { headers, cache: "no-store" }),
      ]);
      const configData = await configResponse.json().catch(() => ({}));
      const balanceData = await balanceResponse.json().catch(() => ({}));
      setPurchaseConfig(configResponse.ok && configData.ok ? configData : { enabled: false });
      setWalletBalance(balanceResponse.ok && balanceData.ok ? balanceData.balanceRial : null);
    } catch {
      setPurchaseConfig({ enabled: false });
      setWalletBalance(null);
    }
  };

  useEffect(() => { loadPurchaseData(); }, []);

  const buyNetworkCredits = async () => {
    if (purchaseBusy || !purchaseConfig?.enabled) return;
    const unit = BigInt(purchaseConfig.unitPriceRial);
    const total = unit * BigInt(purchaseQuantity);
    if (walletBalance === null || BigInt(walletBalance) < total) {
      setPurchaseMessage("موجودی کیف پول برای این خرید کافی نیست.");
      return;
    }
    if (!window.confirm(`خرید آزمایشی ${faNumber(purchaseQuantity)} سهمیه با هزینه ${faNumber(total.toString())} ریال تأیید می‌شود؟`)) return;
    const key = pendingPurchaseKey || `ui_${crypto.randomUUID()}`;
    setPendingPurchaseKey(key);
    setPurchaseBusy(true);
    setPurchaseMessage("");
    try {
      const response = await fetch(`${getApiBase()}/wallet/network-purchase`, {
        method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ quantity: purchaseQuantity, idempotencyKey: key }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        if (response.status === 409) setPendingPurchaseKey(null);
        throw new Error(data.message || "خرید آزمایشی انجام نشد.");
      }
      setPendingPurchaseKey(null);
      setPurchaseMessage(data.alreadyPurchased ? "این خرید قبلاً ثبت شده بود؛ برداشت مجدد انجام نشد." : "خرید آزمایشی با موفقیت ثبت شد.");
      await Promise.all([loadNetworkQuota(), loadPurchaseData()]);
    } catch (error) {
      setPurchaseMessage(error.message || "خطا در ثبت خرید. پیش از تلاش دوباره، سوابق کیف پول را بررسی کنید.");
    } finally {
      setPurchaseBusy(false);
    }
  };

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

  const visible = agencyPage(tabItems[activeTab], page);
  return <AgencyShell active="dashboard" title="میز کار مشاور" subtitle={`سلام ${displayName}؛ فایل‌ها و فرصت‌های مناسب را یکجا مدیریت کنید.`}
    stats={[["فایل‌های من", dashboardData.myOffers.length], ["درخواست‌های من", dashboardData.myRequests.length]]}>
    <nav className="ag01-tabs" aria-label="بخش‌های تطبیق مشاور">
      {Object.entries(TAB_CONFIG).map(([key,item]) => <button key={key} type="button" aria-pressed={activeTab === key} onClick={() => {setActiveTab(key); setPage(1);}}><span><small>{item.eyebrow}</small><strong>{item.title}</strong></span><b>{faNumber(tabCounts[key])}</b></button>)}
    </nav>
    <section className="ag01-panel">
      <header className="ag01-section-head"><div><h2>{activeConfig.title}</h2><p>{activeConfig.description}</p></div><span>{faNumber(tabCounts[activeTab])} نتیجه</span></header>
      {activeTab === "network" && <>
        <div className="ag01-quota"><div><small>سهمیه فرصت‌های شبکه</small><strong>{networkQuota ? `${faNumber(networkQuota.totalRemaining)} فرصت باقی‌مانده` : networkError ? "سهمیه نامشخص" : "در حال دریافت سهمیه..."}</strong><p>{networkQuota ? `${faNumber(networkQuota.freeRemaining)} رایگان${networkQuota.paidRemaining ? ` + ${faNumber(networkQuota.paidRemaining)} خریداری‌شده` : ""}` : "مشاهده خلاصه، سهمیه مصرف نمی‌کند."}</p></div>{!networkQuota && networkError && <button type="button" className="ag01-secondary" onClick={loadNetworkQuota}>تلاش دوباره</button>}</div>
        <p className="ag01-note">مشاهده خلاصه رایگان است. دریافت هر فرصت جدید یک سهمیه مصرف می‌کند؛ هر فرصت حداکثر برای سه مشاور قابل دریافت است.</p>
      </>}
              {activeTab === "network" && (
                <details className="ag01-purchase agency-dashboard__quota-purchase">
                  <summary>خرید آزمایشی سهمیه با کیف پول</summary>
                  <p>خرید سهمیه فقط در محیط آزمایشی فعال می‌شود؛ پرداخت بانکی انجام نمی‌شود.</p>
                  {purchaseConfig?.enabled ? (
                    <div className="agency-dashboard__quota-purchase-controls">
                      <label htmlFor="network-purchase-count">تعداد سهمیه</label>
                      <select id="network-purchase-count" value={purchaseQuantity} onChange={(e) => { setPurchaseQuantity(Number(e.target.value)); setPendingPurchaseKey(null); setPurchaseMessage(""); }}>
                        {[1, 3, 5, 10].map((n) => <option key={n} value={n}>{faNumber(n)}</option>)}
                      </select>
                      <span>قیمت هر سهمیه: {faNumber(purchaseConfig.unitPriceRial)} ریال</span>
                      <span>جمع: {faNumber((BigInt(purchaseConfig.unitPriceRial) * BigInt(purchaseQuantity)).toString())} ریال</span>
                      <span>موجودی کیف پول: {walletBalance === null ? "نامشخص" : `${faNumber(walletBalance)} ریال`}</span>
                      <button type="button" disabled={purchaseBusy || walletBalance === null || BigInt(walletBalance) < BigInt(purchaseConfig.unitPriceRial) * BigInt(purchaseQuantity)} onClick={buyNetworkCredits}>
                        {purchaseBusy ? "در حال ثبت..." : "خرید آزمایشی از کیف پول"}
                      </button>
                    </div>
                  ) : <small>خرید تا تعیین قیمت آزمایشی و فعال‌سازی امن در لوکال غیرفعال است.</small>}
                  {purchaseMessage && <p role="status">{purchaseMessage}</p>}
                  <Link to="/wallet">مشاهده کیف پول و سوابق تراکنش‌ها</Link>
                </details>
              )}

      {activeTab === "network" && networkError && <div className="ag01-error" role="alert">{networkError}</div>}
      <MatchGroup items={visible.items} activeTab={activeTab} networkState={{ isUnlocked: isNetworkUnlocked, unlock: unlockNetworkOpportunity, unlockingKey, ready: Boolean(networkQuota) }}/>
      <AgencyPager data={visible} onPage={setPage}/>
    </section>
  </AgencyShell>;
}

export default AgencyDashboard;
