import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getCategoryLabel,
  scoreMatch,
} from "../utils/matchingEngine";

import { AgencyShell, AgencyPager, AgencySpace, AgencyScore, AgencyReasons, agencyPage } from "./AgencyWorkspaceAG01.jsx";
import { agencyRequestSummary } from "../utils/agencyRequestSummaryAG01.js";
import "./AgencyWorkspaceAG01.css";

function AgencyApplicants({
  parkings = [],
  currentUser = null,
}) {
  const [page, setPage] = useState(1);
  const [selectedCity, setSelectedCity] =
    useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("");
  const [minimumScore, setMinimumScore] =
    useState(0);

  const myOffers = useMemo(() => {
    if (!currentUser?.uid) {
      return [];
    }

    return parkings.filter(
      (item) =>
        (item.listingType || "offer") !==
          "wanted" &&
        item.status === "active" &&
        item.ownerId === currentUser.uid
    );
  }, [parkings, currentUser]);

  const applicants = useMemo(() => {
    const requests = parkings.filter(
      (item) =>
        item.listingType === "wanted" &&
        item.status !== "inactive" &&
        item.ownerId !== currentUser?.uid
    );

    return requests
      .map((request) => {
        const ranked = myOffers
          .map((offer) => ({
            offer,
            ...scoreMatch(request, offer),
          }))
          .sort((a, b) => b.score - a.score);

        const bestMatch = ranked[0] || null;

        return {
          request,
          bestMatch,
          eligible:
            Boolean(bestMatch?.eligible),
        };
      })
      .sort(
        (a, b) =>
          (b.bestMatch?.score || 0) -
          (a.bestMatch?.score || 0)
      );
  }, [parkings, currentUser, myOffers]);

  const cities = useMemo(
    () => [
      ...new Set(
        applicants
          .map((item) =>
            item.request.city?.trim()
          )
          .filter(Boolean)
      ),
    ],
    [applicants]
  );

  const filteredApplicants = useMemo(
    () =>
      applicants.filter((item) => {
        const request = item.request;
        const category =
          request.category || "parking";
        const score =
          item.bestMatch?.score || 0;

        return (
          (!selectedCity ||
            request.city === selectedCity) &&
          (!selectedCategory ||
            category === selectedCategory) &&
          score >= Number(minimumScore || 0)
        );
      }),
    [
      applicants,
      selectedCity,
      selectedCategory,
      minimumScore,
    ]
  );

  const matchedCount = applicants.filter(
    (item) => item.eligible
  ).length;

  const categories = [
    { value: "residential", label: "مسکونی" },
    { value: "villa", label: "ویلا" },
    { value: "parking", label: "پارکینگ" },
    { value: "storage", label: "انبار" },
    { value: "warehouse", label: "سوله" },
    { value: "shop", label: "مغازه" },
    { value: "land", label: "زمین" },
    { value: "garden", label: "باغ" },
    { value: "other", label: "سایر فضاها" },
  ];

  const clearFilters = () => {
    setPage(1);
    setSelectedCity("");
    setSelectedCategory("");
    setMinimumScore(0);
  };

  const visible = agencyPage(filteredApplicants, page);
  return <AgencyShell active="applicants" title="متقاضیان فضا" subtitle="درخواست‌ها را با بهترین فایل فعال خود مقایسه کنید."
    stats={[["درخواست‌ها",applicants.length],["فایل‌های فعال من",myOffers.length],["تطبیق مناسب",matchedCount]]}>
    <section className="ag01-panel">
      <header className="ag01-section-head"><div><h2>جستجوی متقاضیان</h2><p>فیلتر شهر، نوع فضا و حداقل امتیاز تطبیق</p></div><span>{filteredApplicants.length.toLocaleString("fa-IR")} نتیجه</span></header>
      <div className="ag01-filters">
        <label>شهر<select value={selectedCity} onChange={e=>{setSelectedCity(e.target.value);setPage(1);}}><option value="">همه شهرها</option>{cities.map(city=><option key={city} value={city}>{city}</option>)}</select></label>
        <label>نوع فضا<select value={selectedCategory} onChange={e=>{setSelectedCategory(e.target.value);setPage(1);}}><option value="">همه فضاها</option>{categories.map(category=><option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
        <label>حداقل تطبیق<select value={minimumScore} onChange={e=>{setMinimumScore(e.target.value);setPage(1);}}><option value="0">همه نتایج</option><option value="45">۴۵٪ به بالا</option><option value="60">۶۰٪ به بالا</option><option value="75">۷۵٪ به بالا</option><option value="90">۹۰٪ به بالا</option></select></label>
        <button type="button" className="ag01-secondary" onClick={clearFilters}>پاک‌کردن فیلترها</button>
      </div>
      {visible.items.length ? <div className="ag01-list">{visible.items.map(({request,bestMatch,eligible})=>{
        const summary = agencyRequestSummary(request);
        const { area, budget } = summary;
        return <article className="ag01-pair" key={request.id}>
          <div className="ag01-pair-head"><span>{getCategoryLabel(request)} · {request.city || "شهر ثبت نشده"}</span>{bestMatch && <AgencyScore score={bestMatch.score} eligible={eligible}/>}</div>
          <div className="ag01-compare"><AgencySpace item={request} kind="wanted" label="درخواست متقاضی" canOpen area={area} budget={budget}/><span className="ag01-connector" aria-hidden="true">↔</span>{bestMatch ? <AgencySpace item={bestMatch.offer} kind="offer" label={eligible ? "بهترین فایل پیشنهادی شما" : "نزدیک‌ترین فایل شما"} canOpen/> : <div className="ag01-space ag01-space--offer"><small>فایل‌های شما</small><strong>هنوز فایل فعالی ندارید</strong><Link to="/add-parking">ثبت فایل جدید ←</Link></div>}</div>
          <div className="ag01-pair-foot"><AgencyReasons reasons={bestMatch?.reasons || []}/><Link className="ag01-primary" to={`/chat/${request.id}?chatType=agency`}>شروع گفتگوی کاری</Link></div>
          {summary?.description && <details className="ag01-alternatives"><summary>توضیحات درخواست</summary><p>{summary.description}</p></details>}
        </article>;
      })}</div> : <div className="ag01-empty"><span aria-hidden="true">⌕</span><h3>متقاضی مطابق این فیلتر پیدا نشد</h3><p>فیلترها را تغییر دهید یا همه متقاضیان را ببینید.</p><button className="ag01-secondary" type="button" onClick={clearFilters}>نمایش همه متقاضیان</button></div>}
      <AgencyPager data={visible} onPage={setPage}/>
    </section>
  </AgencyShell>;
}
export default AgencyApplicants;
