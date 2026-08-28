import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ParkingCard from "../components/ParkingCard";
import { normalizeText, scoreMatch } from "../utils/matchingEngine";

import "./FindForMe.css";

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

  const categoryRule = CATEGORY_RULES.find((rule) =>
    rule.words.some((word) => normalized.includes(normalizeText(word)))
  );

  const knownCities = [...new Set([
    ...IRAN_CITIES,
    ...parkings.map((item) => String(item?.city || "").trim()).filter(Boolean),
  ])].sort((a, b) => b.length - a.length);

  const city = knownCities.find((name) => normalized.includes(normalizeText(name))) || "";

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

function FindForMe({ parkings = [] }) {
  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState("");

  const parsed = useMemo(
    () => (submittedText ? parseNaturalRequest(submittedText, parkings) : null),
    [submittedText, parkings]
  );

  const matches = useMemo(() => {
    if (!parsed) return [];

    const request = parsed.request;
    const requestCity = normalizeText(request.city);
    const requestCategory = request.category;
    const requestBedrooms = Number(request.villaDetails?.bedrooms || request.residentialDetails?.bedrooms || 0);

    return parkings
      .filter((offer) => (offer.listingType || "offer") !== "wanted" && (!offer.status || offer.status === "active"))
      .map((offer) => {
        const strict = scoreMatch(request, offer);
        const sameCategory = requestCategory === "other" || offer.category === requestCategory;
        if (!sameCategory) return { offer, score: 0, reasons: [], eligible: false };

        let score = Math.max(strict.score || 0, 45);
        const reasons = [...(strict.reasons || [])];
        const offerCity = normalizeText(offer.city);

        if (requestCity && offerCity) {
          if (requestCity === offerCity) {
            score = Math.max(score, 70);
            if (!reasons.includes("شهر یکسان")) reasons.push("شهر یکسان");
          } else {
            score = Math.max(35, score - 22);
            reasons.push(`شهر آگهی: ${offer.city}`);
          }
        }

        if (requestCategory === "villa" && requestBedrooms > 0) {
          const offerBedrooms = Number(offer.villaDetails?.bedrooms || 0);
          if (offerBedrooms > 0) {
            if (offerBedrooms >= requestBedrooms) {
              score += 8;
              reasons.push("تعداد خواب مناسب");
            } else {
              score -= 5;
            }
          }
        }

        const reqArea = Number(request.area || 0);
        const offerArea = Number(offer.area || 0);
        if (reqArea && offerArea) {
          const diff = Math.abs(reqArea - offerArea) / Math.max(reqArea, 1);
          if (diff <= 0.25 && !reasons.some((r) => r.includes("متراژ"))) {
            score += 7; reasons.push("متراژ نزدیک");
          }
        }

        score = Math.max(0, Math.min(100, Math.round(score)));
        return { offer, score, reasons: [...new Set(reasons)], eligible: score >= 35 };
      })
      .filter((item) => item.eligible)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [parkings, parsed]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = text.trim();
    if (value.length < 4) return;
    setSubmittedText(value);
  };

  return (
    <main className="find-for-me" dir="rtl">
      <section className="find-for-me__hero">
        <span className="find-for-me__eyebrow">✨ جستجوی هوشمند فضاجو</span>
        <h1>فضاجو، برام پیدا کن</h1>
        <p>
          مثل یک آدم معمولی بنویس دنبال چه فضایی هستی؛ فضاجو خواسته‌ات را می‌فهمد
          و نزدیک‌ترین آگهی‌های موجود را با درصد تطبیق مرتب می‌کند.
        </p>

        <form onSubmit={handleSubmit} className="find-for-me__form">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="مثلاً: یک ویلای ۲ خوابه در لاهیجان می‌خوام، حدود ۱۲۰ متر، شبی تا ۳۰ میلیون ریال"
            rows={4}
          />
          <div className="find-for-me__form-footer">
            <span>نوع فضا، شهر، متراژ و بودجه را اگر می‌دانی بنویس.</span>
            <button type="submit">✨ برام پیدا کن</button>
          </div>
        </form>

        <div className="find-for-me__examples">
          <button type="button" onClick={() => setText("یک انبار ۲۰۰ متر در شهرضا می‌خوام تا ۱۵۰ میلیون ریال")}>انبار ۲۰۰ متری در شهرضا</button>
          <button type="button" onClick={() => setText("ویلای ۲ خوابه در لاهیجان تا ۳۰ میلیون ریال")}>ویلای ۲ خوابه در لاهیجان</button>
          <button type="button" onClick={() => setText("مغازه ۵۰ متر در اصفهان تا ۲۰۰ میلیون ریال")}>مغازه ۵۰ متری در اصفهان</button>
        </div>
      </section>

      {parsed && (
        <>
          <section className="find-for-me__understood">
            <div>
              <span>فضاجو از درخواستت این‌ها را فهمید:</span>
              <h2>{submittedText}</h2>
            </div>
            <div className="find-for-me__chips">
              <span>نوع: <b>{parsed.extracted.category}</b></span>
              <span>شهر: <b>{parsed.extracted.city}</b></span>
              {parsed.extracted.area > 0 && <span>متراژ: <b>{parsed.extracted.area.toLocaleString("fa-IR")} متر</b></span>}
              {parsed.extracted.price > 0 && <span>بودجه: <b>{formatRial(parsed.extracted.price)}</b></span>}
              {parsed.extracted.bedrooms > 0 && <span>خواب: <b>{parsed.extracted.bedrooms.toLocaleString("fa-IR")}</b></span>}
            </div>
          </section>

          <section className="find-for-me__results">
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
                  درخواستت خوب ثبت شده؛ با زیاد شدن آگهی‌ها همین موتور می‌تواند فایل‌های جدید را هم برایت پیدا کند.
                  در نسخه بعدی، ذخیره درخواست و اعلان خودکار را به همین بخش وصل می‌کنیم.
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
