import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ParkingCard from "../components/ParkingCard";
import { normalizeText, scoreMatch } from "../utils/matchingEngine";
import {
  deleteSmartSearch,
  getSmartNotifications,
  getSmartSearches,
  markAllSmartNotificationsRead,
  markSmartNotificationRead,
  saveSmartSearch,
  setSmartSearchActive,
  updateSmartSearch,
} from "../services/smartSearchService";

import "./FindForMe.css";

const ALERT_THRESHOLD = 70;

const CATEGORY_RULES = [
  { category: "villa", label: "ویلا", words: ["ویلا", "ویلای", "اقامتگاه"] },
  { category: "residential", label: "مسکونی", words: ["آپارتمان", "خانه", "منزل", "مسکونی", "سوئیت", "پنت هاوس", "پنت‌هاوس"] },
  { category: "parking", label: "پارکینگ", words: ["پارکینگ", "جای پارک", "پارک خودرو"] },
  { category: "storage", label: "انبار", words: ["انبار", "انباری"] },
  { category: "warehouse", label: "سوله", words: ["سوله", "کارگاه", "صنعتی"] },
  { category: "shop", label: "مغازه", words: ["مغازه", "فروشگاه", "تجاری"] },
  { category: "land", label: "زمین", words: ["زمین", "قطعه زمین"] },
];

const IRAN_CITIES = [
  "تهران", "کرج", "مشهد", "اصفهان", "شیراز", "تبریز", "قم", "اهواز", "رشت",
  "لاهیجان", "شهرضا", "کاشان", "ارومیه", "قزوین", "یزد", "کرمان", "ساری",
  "گرگان", "بندرعباس", "همدان", "اراک", "اردبیل", "سنندج", "خرم آباد",
  "خرم‌آباد", "بوشهر", "زنجان", "شاهین شهر", "شاهین‌شهر", "نجف آباد", "نجف‌آباد",
  "آستانه اشرفیه", "آستانه‌اشرفیه",
];

function toEnglishDigits(value = "") {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(value)
    .replace(/[۰-۹]/g, (digit) => persian.indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => arabic.indexOf(digit));
}

function extractNumber(raw = "") {
  const normalized = toEnglishDigits(raw).replace(/,/g, "").replace(/٬/g, "");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function normalizePlace(value = "") {
  return normalizeText(value)
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأٱ]/g, "ا")
    .replace(/[،,؛;:_\-–—/\\()\[\]{}]+/g, " ")
    .replace(/^(استان|شهرستان|شهر|بخش|منطقه)\s+/g, "")
    .replace(/\s+(استان|شهرستان|شهر)$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactPlace(value = "") {
  return normalizePlace(value)
    .replace(/\b(استان|شهرستان|شهر|بخش|منطقه)\b/g, " ")
    .replace(/\s+/g, "");
}

function samePlace(a = "", b = "") {
  const first = compactPlace(a);
  const second = compactPlace(b);
  if (!first || !second) return false;
  if (first === second) return true;
  if (Math.min(first.length, second.length) < 4) return false;
  return first.includes(second) || second.includes(first);
}

function extractBudget(text) {
  const normalized = toEnglishDigits(text).replace(/٬/g, ",");
  const moneyPattern = /(\d[\d,]*(?:\.\d+)?)\s*(هزار|میلیون|میلیارد)?\s*(ریال|تومان)/;
  const match = normalized.match(moneyPattern);
  if (!match) return 0;

  let value = extractNumber(match[1]);
  const unit = match[2] || "";
  const currency = match[3] || "";

  if (unit === "هزار") value *= 1_000;
  if (unit === "میلیون") value *= 1_000_000;
  if (unit === "میلیارد") value *= 1_000_000_000;
  if (currency === "تومان") value *= 10;

  return Math.round(value);
}

function parseNaturalRequest(text, parkings = []) {
  const normalized = normalizeText(text);

  // نوع اصلی فضا را از اولین اشارهٔ واقعی کاربر می‌گیریم.
  // مثال: «زمین ۲۰۰۰ متری جهت انبار» => زمین، نه انبار.
  const categoryCandidates = CATEGORY_RULES.flatMap((rule) =>
    rule.words.map((word) => ({
      rule,
      index: normalized.indexOf(normalizeText(word)),
      wordLength: normalizeText(word).length,
    }))
  )
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index || b.wordLength - a.wordLength);

  const categoryRule = categoryCandidates[0]?.rule || null;

  const knownCities = [...new Set([
    ...IRAN_CITIES,
    ...parkings.map((item) => String(item?.city || "").trim()).filter(Boolean),
  ])].sort((a, b) => b.length - a.length);

  const matchedCity = knownCities.find((name) => {
    const place = compactPlace(name);
    const requestText = compactPlace(normalized);
    return Boolean(place && requestText.includes(place));
  });
  const city = matchedCity ? normalizePlace(matchedCity) : "";

  const englishText = toEnglishDigits(normalized);
  const areaMatch = englishText.match(/(\d+(?:\.\d+)?)\s*(?:متر|مترمربع|متر مربع)/);
  const area = areaMatch ? Number(areaMatch[1]) : 0;
  const price = extractBudget(text);

  const bedroomsMatch = englishText.match(/(\d+)\s*(?:خواب|خوابه|اتاق خواب)/);
  const bedrooms = bedroomsMatch ? Number(bedroomsMatch[1]) : 0;

  const request = {
    id: "find-for-me-preview",
    listingType: "wanted",
    category: categoryRule?.category || "other",
    categoryLabel: categoryRule?.label || "سایر فضاها",
    customCategory: categoryRule ? "" : text.trim(),
    title: text.trim(),
    description: text.trim(),
    city,
    area,
    price: price || "",
    status: "active",
    residentialDetails: bedrooms ? { bedrooms } : {},
    villaDetails: bedrooms ? { bedrooms } : {},
  };

  return {
    request,
    extracted: {
      category: categoryRule?.label || "تشخیص داده نشد",
      city: city || "تشخیص داده نشد",
      area,
      price,
      bedrooms,
    },
  };
}

function formatRial(value) {
  return Number(value || 0).toLocaleString("fa-IR") + " ریال";
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatLastCheck(value) {
  if (!value) return "هنوز بررسی نشده";
  try {
    return `آخرین بررسی: ${new Intl.DateTimeFormat("fa-IR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))}`;
  } catch {
    return "";
  }
}

function getLastFindStorageKey(user) {
  const userId = user?.id || user?.uid || user?.backendId || "guest";
  return `fazajoo:last-find-for-me:${userId}`;
}


function buildMatches(request, parkings = []) {
  if (!request) return [];

  const toComparableNumber = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const normalized = toEnglishDigits(String(value || ""))
      .replace(/[٬,]/g, "");
    const match = normalized.match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  };

  const getBedrooms = (value = {}) => Math.max(
    0,
    Number(
      value?.villaDetails?.bedrooms ??
      value?.villa_details?.bedrooms ??
      value?.residentialDetails?.bedrooms ??
      value?.residential_details?.bedrooms ??
      0
    ) || 0
  );

  // این تابع عمداً همان منطق امتیازدهی اعلان‌های بک‌اند را اجرا می‌کند.
  // بنابراین یک آگهی در «اعلان‌ها» و «فضاجو برام پیدا کن» یک درصد خواهد داشت.
  const scoreLikeBackendNotification = (offer) => {
    const requestCategory = String(request.category || "other");
    const offerCategory = String(offer.category || "other");

    if (requestCategory !== "other" && requestCategory !== offerCategory) {
      return null;
    }

    let score = 45;
    const reasons = ["نوع فضا مناسب"];

    const requestCity = normalizePlace(request.city);
    const offerCity = normalizePlace(offer.city);
    const cityMatched = Boolean(requestCity && offerCity && samePlace(requestCity, offerCity));
    if (offerCity) {
      if (cityMatched) {
        score += 30;
        reasons.push("شهر یکسان");
      } else if (requestCity) {
        score -= 10;
      }
    }

    const requestArea = toComparableNumber(request.area);
    const offerArea = toComparableNumber(offer.area);
    if (requestArea > 0 && offerArea > 0) {
      const diff = Math.abs(requestArea - offerArea) / Math.max(requestArea, 1);
      if (diff <= 0.25) {
        score += 10;
        reasons.push("متراژ نزدیک");
      } else if (diff <= 0.5) {
        score += 5;
        reasons.push("متراژ قابل قبول");
      } else {
        score -= 5;
      }
    }

    const budget = toComparableNumber(request.price);
    const offerPrice = toComparableNumber(offer.price);
    if (budget > 0 && offerPrice > 0) {
      if (offerPrice <= budget) {
        score += 10;
        reasons.push("در محدوده بودجه");
      } else if (offerPrice <= budget * 1.2) {
        score += 3;
        reasons.push("نزدیک به بودجه");
      } else {
        score -= 10;
      }
    }

    const requestBedrooms = getBedrooms(request);
    const offerBedrooms = getBedrooms(offer);
    if (requestBedrooms > 0 && offerBedrooms > 0) {
      if (offerBedrooms >= requestBedrooms) {
        score += 8;
        reasons.push("تعداد خواب مناسب");
      } else {
        score -= 5;
      }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    return { offer, score, reasons: [...new Set(reasons)], eligible: true };
  };

  return parkings
    .filter((offer) => (offer.listingType || "offer") !== "wanted" && (!offer.status || offer.status === "active"))
    .map(scoreLikeBackendNotification)
    .filter(Boolean)
    .filter((item) => item.eligible)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function FindForMe({ parkings = [], user = null }) {
  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [savedSearches, setSavedSearches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [panelLoading, setPanelLoading] = useState(false);
  const [editingSearchId, setEditingSearchId] = useState(null);
  const [autoFollowMessage, setAutoFollowMessage] = useState("");
  const [lastSubmissionKind, setLastSubmissionKind] = useState(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(getLastFindStorageKey(user));
      if (saved && saved.trim().length >= 4) {
        // آخرین جستجو برای ادامه نتایج حفظ می‌شود، اما کادر ورود دوباره خالی باز می‌شود.
        setSubmittedText(saved);
      }
    } catch {
      // اگر ذخیره‌سازی مرورگر در دسترس نبود، خود جستجو همچنان کار می‌کند.
    }
  }, [user?.id, user?.uid, user?.backendId]);

  const parsed = useMemo(
    () => (submittedText ? parseNaturalRequest(submittedText, parkings) : null),
    [submittedText, parkings]
  );

  const matches = useMemo(
    () => (parsed ? buildMatches(parsed.request, parkings) : []),
    [parkings, parsed]
  );

  const groupedTrackings = useMemo(
    () => savedSearches.map((search) => {
      const criteria = search.criteria && typeof search.criteria === "object"
        ? search.criteria
        : parseNaturalRequest(search.rawText || "", parkings).request;
      const results = buildMatches(criteria, parkings)
        .filter((item) => item.score >= Number(search.threshold || ALERT_THRESHOLD));
      return { search, results };
    }),
    [savedSearches, parkings]
  );


  useEffect(() => {
    if (!submittedText || !parsed || !user || lastSubmissionKind !== "search") return;

    if (matches.length > 0) {
      setAutoFollowMessage(
        `✨ پیداشون کردم! همین الان ${matches.length.toLocaleString("fa-IR")} آگهی مناسب برات پیدا کردم؛ از بهترین تطبیق شروع کردم. پیگیریت هم فعاله و اگر مورد تازه‌ای برسه، خبرت می‌کنم.`
      );
    } else {
      setAutoFollowMessage(
        "🔎 فعلاً مورد مناسبی پیدا نکردم؛ ولی پیگیریت فعاله و به محض رسیدن آگهی مناسب، فضاجو خبرت می‌کنه."
      );
    }

    const timer = window.setTimeout(() => {
      const target = document.getElementById("fazajoo-smart-results");
      if (!target) return;

      const startY = window.scrollY;
      const headerOffset = 112;
      const targetY = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset);
      const distance = targetY - startY;
      const duration = 1500;
      const startedAt = performance.now();
      const easeInOutCubic = (t) => t < 0.5
        ? 8 * t * t * t * t
        : 1 - Math.pow(-2 * t + 2, 4) / 2;

      const animateScroll = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        window.scrollTo(0, startY + distance * easeInOutCubic(progress));
        if (progress < 1) window.requestAnimationFrame(animateScroll);
      };

      window.requestAnimationFrame(animateScroll);
    }, 260);

    return () => window.clearTimeout(timer);
  }, [submittedText, parsed, matches.length, user, lastSubmissionKind]);

  const loadSmartPanel = async () => {
    if (!user) {
      setSavedSearches([]);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setPanelLoading(true);
    try {
      const [searches, notificationData] = await Promise.all([
        getSmartSearches(),
        getSmartNotifications(),
      ]);
      setSavedSearches(searches);
      setNotifications(notificationData.notifications || []);
      setUnreadCount(Number(notificationData.unreadCount || 0));
    } catch (error) {
      console.error("Load smart search panel error:", error);
    } finally {
      setPanelLoading(false);
    }
  };

  useEffect(() => {
    loadSmartPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.uid, user?.backendId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (value.length < 4) return;

    setAlertMessage("");
    setAutoFollowMessage("");
    setLastSubmissionKind(editingSearchId ? "edit" : "search");
    setSubmittedText(value);
    try {
      window.localStorage.setItem(getLastFindStorageKey(user), value);
    } catch {
      // ذخیره آخرین جستجو نباید اجرای جستجو را متوقف کند.
    }

    if (!user) {
      setAutoFollowMessage("برای نگه‌داشتن پیگیری هوشمند، وارد حساب فضاجو شو.");
      return;
    }

    const nextParsed = parseNaturalRequest(value, parkings);
    setSavingAlert(true);
    try {
      if (editingSearchId) {
        await updateSmartSearch(editingSearchId, {
          rawText: value,
          criteria: nextParsed.request,
          threshold: ALERT_THRESHOLD,
          isActive: true,
          bestSeenScore: 0,
        });
        setAutoFollowMessage("✓ تقاضا ویرایش شد و پیگیری هوشمند دوباره فعال است.");
        setEditingSearchId(null);
      } else {
        await saveSmartSearch({
          rawText: value,
          criteria: nextParsed.request,
          threshold: ALERT_THRESHOLD,
          bestSeenScore: 0,
        });
      }
      setText("");
      await loadSmartPanel();
    } catch (error) {
      setAutoFollowMessage(error?.message || "ذخیره پیگیری هوشمند انجام نشد.");
    } finally {
      setSavingAlert(false);
    }
  };

  const handleEditSearch = (search) => {
    setText(search.rawText || "");
    setSubmittedText("");
    setEditingSearchId(search.id);
    setAutoFollowMessage("تقاضا را در کادر بالا اصلاح کن و «ذخیره و پیدا کن» را بزن.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditSearch = () => {
    setEditingSearchId(null);
    setText("");
    setAutoFollowMessage("");
  };

  const handleToggle = async (search) => {
    try {
      const updated = await setSmartSearchActive(search.id, !search.isActive);
      setSavedSearches((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setAlertMessage(error?.message || "تغییر وضعیت پیگیری انجام نشد.");
    }
  };

  const handleDelete = async (id) => {
    const deletedSearch = savedSearches.find((item) => item.id === id);
    try {
      await deleteSmartSearch(id);
      setSavedSearches((items) => items.filter((item) => item.id !== id));
      if (deletedSearch?.rawText && deletedSearch.rawText.trim() === submittedText.trim()) {
        setSubmittedText("");
        setAutoFollowMessage("");
        setLastSubmissionKind(null);
        try { window.localStorage.removeItem(getLastFindStorageKey(user)); } catch {}
      }
    } catch (error) {
      setAlertMessage(error?.message || "حذف پیگیری انجام نشد.");
    }
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      try {
        await markSmartNotificationRead(notification.id);
        setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        // باز شدن آگهی به خاطر خطای ثبت خوانده‌شدن متوقف نمی‌شود.
      }
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllSmartNotificationsRead();
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      setAlertMessage(error?.message || "ثبت مشاهده اعلان‌ها انجام نشد.");
    }
  };

  return (
    <main className="find-for-me" dir="rtl">
      <section className="find-for-me__hero">
        <span className="find-for-me__eyebrow">✨ جستجوی هوشمند فضاجو</span>
        <p className="find-for-me__intro">
          مثل یک آدم معمولی بنویس دنبال چه فضایی هستی؛ فضاجو خواسته‌ات را می‌فهمد و نزدیک‌ترین آگهی‌های موجود را با درصد تطبیق مرتب می‌کند.
        </p>

        <form onSubmit={handleSubmit} className="find-for-me__form">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="مثلاً: یک ویلای ۲ خوابه در لاهیجان می‌خوام، حدود ۱۲۰ متر، شبی تا ۳۰ میلیون ریال"
            rows={2}
          />
          <div className="find-for-me__form-footer">
            <span>نوع فضا، شهر، متراژ و بودجه را اگر می‌دانی بنویس.</span>
            <div className="find-for-me__submit-actions">
              {editingSearchId && (
                <button type="button" className="find-for-me__cancel-edit" onClick={cancelEditSearch}>
                  انصراف از ویرایش
                </button>
              )}
              <button type="submit" disabled={savingAlert}>
                {savingAlert ? "در حال ذخیره..." : editingSearchId ? "✓ ذخیره و پیدا کن" : "✨ برام پیدا کن"}
              </button>
            </div>
          </div>
        </form>

        <div className="find-for-me__examples">
          <button type="button" onClick={() => setText("یک انبار ۲۰۰ متر در شهرضا می‌خوام تا ۱۵۰ میلیون ریال")}>انبار ۲۰۰ متری در شهرضا</button>
          <button type="button" onClick={() => setText("ویلای ۲ خوابه در لاهیجان تا ۳۰ میلیون ریال")}>ویلای ۲ خوابه در لاهیجان</button>
          <button type="button" onClick={() => setText("مغازه ۵۰ متر در اصفهان تا ۲۰۰ میلیون ریال")}>مغازه ۵۰ متری در اصفهان</button>
        </div>
      </section>

      {user && (notifications.length > 0 || savedSearches.length > 0 || panelLoading) && (
        <section className="find-for-me__watch-panel">
          <div className="find-for-me__watch-head">
            <div>
              <span>🔔 پیگیری هوشمند من</span>
              <h2>{unreadCount ? `${unreadCount.toLocaleString("fa-IR")} نتیجه تازه برای پیگیری‌هایت داری` : "فضاجو حواسش به درخواست‌هایت هست"}</h2>
            </div>
            {unreadCount > 0 && <button type="button" onClick={handleReadAll}>همه را دیدم</button>}
          </div>

          {unreadCount > 0 && (
            <div className="find-for-me__fresh-summary">
              <strong>✨ {unreadCount.toLocaleString("fa-IR")} نتیجه تازه پیدا شده</strong>
              <span>نتیجه‌ها را پایین صفحه به‌صورت کامل و با درصد تطبیق می‌بینی.</span>
            </div>
          )}

          {groupedTrackings.length > 0 && (
            <div className="find-for-me__saved-searches">
              {groupedTrackings.map(({ search, results }) => {
                const previewResults = results.slice(0, 3);
                const freshCount = Number(search.unreadCount || 0);
                return (
                  <article className="find-for-me__tracking-card" key={search.id}>
                    <div className="find-for-me__saved-row">
                      <div>
                        <strong>{search.rawText}</strong>
                        <span>اعلان از {Number(search.threshold || ALERT_THRESHOLD).toLocaleString("fa-IR")}٪ تطابق به بالا</span>
                        <div className="find-for-me__saved-meta">
                          <small>{formatLastCheck(search.lastCheckedAt)}</small>
                          <small>{results.length.toLocaleString("fa-IR")} مورد مناسب فعلی</small>
                          {freshCount > 0 && <b>{freshCount.toLocaleString("fa-IR")} جدید</b>}
                        </div>
                      </div>
                      <div className="find-for-me__saved-actions">
                        <span className={`find-for-me__status-badge ${search.isActive ? "is-on" : "is-off"}`}>{search.isActive ? "● فعال" : "○ متوقف"}</span>
                        <button type="button" className="is-edit" onClick={() => handleEditSearch(search)}>ویرایش تقاضا</button>
                        <button type="button" className="is-toggle" onClick={() => handleToggle(search)}>{search.isActive ? "توقف پیگیری" : "فعال‌کردن پیگیری"}</button>
                        <button type="button" className="is-delete" onClick={() => handleDelete(search.id)}>حذف</button>
                      </div>
                    </div>
                    {previewResults.length > 0 ? (
                      <div className="find-for-me__tracking-results">
                        <div className="find-for-me__tracking-results-head">
                          <strong>{results.length.toLocaleString("fa-IR")} آگهی مناسب این پیگیری</strong>
                          {results.length > 3 && <span>۳ مورد برتر نمایش داده شده</span>}
                        </div>
                        <div className="find-for-me__tracking-mini-grid">
                          {previewResults.map((item) => (
                            <Link to={`/parking/${item.offer.id}`} className="find-for-me__tracking-mini" key={`${search.id}-${item.offer.id}`}>
                              <div>
                                <strong>{item.offer.title || "آگهی فضاجو"}</strong>
                                <span>{item.offer.city || "—"}{item.offer.area ? ` · ${Number(item.offer.area).toLocaleString("fa-IR")} متر` : ""}</span>
                              </div>
                              <b>{item.score.toLocaleString("fa-IR")}٪</b>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="find-for-me__tracking-empty">
                        {search.isActive ? "فعلاً مورد مناسبی برای این پیگیری پیدا نشده؛ فضاجو همچنان حواسش هست." : "این پیگیری متوقف است."}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {parsed && lastSubmissionKind && (
        <>

          <section id="fazajoo-smart-results" className="find-for-me__results">
            {autoFollowMessage && (
              <div className="find-for-me__auto-follow-message find-for-me__auto-follow-message--results">
                {autoFollowMessage}
              </div>
            )}
            <div className="find-for-me__results-head">
              <div>
                <span>پیشنهادهای فضاجو</span>
                <h2>{matches.length ? `${matches.length.toLocaleString("fa-IR")} آگهی مناسب پیدا شد` : "هنوز آگهی مناسبی پیدا نشد"}</h2>
              </div>
              <Link to="/parking">دیدن همه آگهی‌ها ←</Link>
            </div>

            {matches.length ? (
              <div className="find-for-me__grid">
                {matches.map((item) => (
                  <article className="find-for-me__match" key={item.offer.id}>
                    <div className="find-for-me__score">
                      <strong>{item.score.toLocaleString("fa-IR")}٪</strong>
                      <span>تطبیق</span>
                    </div>
                    <ParkingCard parking={item.offer} />
                    {!!item.reasons.length && (
                      <div className="find-for-me__reasons">
                        {item.reasons.slice(0, 4).map((reason) => <span key={reason}>✓ {reason}</span>)}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="find-for-me__empty">
                <div>🔎</div>
                <h3>این یکی را هنوز پیدا نکردیم</h3>
                <p>
                  پیگیری این درخواست فعال است؛ اگر آگهی تازه‌ای با حداقل ۷۰٪ تطابق پیدا شود، فضاجو بهت خبر می‌دهد.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default FindForMe;
