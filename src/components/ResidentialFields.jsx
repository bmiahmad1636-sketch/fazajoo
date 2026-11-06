import { useEffect, useState } from "react";
import { emptyResidentialDetails } from "./residentialDetails";
import ClimateFields from "./ClimateFields";
import {
  RESIDENTIAL_OFFER_DEFAULT, RESIDENTIAL_OFFER_TYPES, RESIDENTIAL_FINANCIAL_MODES, RESIDENTIAL_SHORT_RATE_UNITS,
  residentialMoneyDigits, residentialMoneyDisplay,
} from "../utils/residentialOffer";
import "./ResidentialFields.css";

export default function ResidentialFields({ value = {}, onChange, offer = {}, onOfferChange,
  note = "", onNoteChange, error = "", disabled = false }) {
  const f = { ...emptyResidentialDetails, ...value };
  const o = { ...RESIDENTIAL_OFFER_DEFAULT, ...offer };
  const [expanded, setExpanded] = useState(false);
  const isShort = o.rentalTerm === "short";
  const set = (name, next) => onChange({ ...f, [name]: next });
  const updateOffer = (key, next) => onOfferChange?.({ ...o, [key]: next });
  const changeType = (propertyType) => {
    const next = { ...f, propertyType };
    if (!["apartment", "penthouse"].includes(propertyType)) {
      next.floor = ""; next.unitsPerFloor = ""; next.elevator = false;
    }
    if (!["apartment", "penthouse", "house", "villa"].includes(propertyType)) next.totalFloors = "";
    if (!["apartment", "penthouse", "house", "villa"].includes(propertyType)) next.balcony = false;
    if (propertyType !== "penthouse") next.roofGarden = false;
    if (propertyType !== "villa") next.buildingUse = "";
    if (propertyType === "room") next.bedrooms = "";
    onChange(next);
    onOfferChange?.({ ...o, otherType: propertyType === "other" ? o.otherType : "",
      features: ["house", "villa"].includes(propertyType) ? o.features : [] });
  };
  const changeMode = (financialMode) => {
    onOfferChange?.({ ...o, financialMode });
    onChange({ ...f,
      deposit: financialMode === "rent_only" ? "" : f.deposit,
      monthlyRent: financialMode === "full_deposit" ? "" : f.monthlyRent,
    });
  };
  const errorTarget = /نوع|سایر/.test(error) ? "type" : /متراژ/.test(error) ? "area" : "finance";
  useEffect(() => {
    if (!error) return;
    const el = document.getElementById(`fj-residential-${errorTarget}`);
    const frame = requestAnimationFrame(() => el?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [error, errorTarget]);
  const amenityOptions = [
    ["elevator", "آسانسور", ["apartment", "penthouse"].includes(f.propertyType)],
    ["parking", "پارکینگ", true], ["storage", "انباری", true], ["furnished", "مبله", true],
    ["balcony", "بالکن", ["apartment", "penthouse", "house", "villa"].includes(f.propertyType)],
    ["roofGarden", "تراس اختصاصی / روف‌گاردن", f.propertyType === "penthouse"],
    ["renovated", "بازسازی‌شده", true], ["convertible", "قابل تبدیل رهن و اجاره", true],
  ];
  const field = (title, key, placeholder, limit = 3) => <label className="residential-fields__field">
    <span>{title}</span>
    <input disabled={disabled} inputMode="numeric" value={f[key] || ""} maxLength={limit}
      onChange={(e) => set(key, residentialMoneyDigits(e.target.value).slice(0, limit))} placeholder={placeholder} />
  </label>;
  const amountField = (title, key) => <label className="residential-fields__field">
    <span>{title} <b>*</b></span>
    <input disabled={disabled} inputMode="numeric" dir="ltr" value={residentialMoneyDisplay(f[key])}
      onChange={(e) => set(key, residentialMoneyDigits(e.target.value).slice(0, 15))} placeholder="مثلاً 1,000,000,000" />
    <small>مبلغ واقعی به ریال؛ جدا از سایر پرداخت‌ها</small>
  </label>;
  return <section className="residential-fields" dir="rtl" aria-label="عرضه تخصصی ملک مسکونی">
    <header className="residential-fields__head"><span aria-hidden="true">🏠</span>
      <div><strong>مشخصات واقعی ملک مسکونی</strong><small>نوع ملک و شرایط مالی را مشخص کن؛ جزئیات بیشتر اختیاری است.</small></div>
    </header>
    <div className="residential-fields__term" role="group" aria-label="مدت اجاره مسکونی">
      {[ ["long", "بلندمدت"], ["short", "کوتاه‌مدت / اقامت موقت"] ].map(([id,label]) =>
        <button type="button" key={id} disabled={disabled} aria-pressed={o.rentalTerm === id}
          className={`residential-fields__choice${o.rentalTerm === id ? " is-selected" : ""}`}
          onClick={() => onOfferChange?.({...o,rentalTerm:id,canNegotiateOtherTerm:false})}>{label}</button>)}
    </div>
    <label className="residential-fields__conversion">
      <input type="checkbox" disabled={disabled} checked={o.canNegotiateOtherTerm === true}
        onChange={(e) => updateOffer("canNegotiateOtherTerm",e.target.checked)} />
      <span>اگر متقاضی بخواهد، با <b>بررسی اجاره {isShort ? "بلندمدت" : "کوتاه‌مدت"}</b> هم موافقم.</span>
    </label>
    <small className="residential-fields__conversion-help">روش دوم فقط قابل مذاکره است؛ مبلغ، نوع قرارداد و پذیرش آن قطعی نیست.</small>
    <div id="fj-residential-type" className="residential-fields__grid">
      <label className="residential-fields__field"><span>نوع فضای مسکونی <b>*</b></span>
        <select disabled={disabled} value={f.propertyType || ""} onChange={(e) => changeType(e.target.value)}>
          <option value="">انتخاب کنید</option>
          {RESIDENTIAL_OFFER_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      {f.propertyType === "other" && <label className="residential-fields__field"><span>نوع فضای دیگر <b>*</b></span>
        <input disabled={disabled} maxLength={80} value={o.otherType || ""} onChange={(e) => updateOffer("otherType", e.target.value)} placeholder="مثلاً واحد مسکونی داخل مجموعه" />
      </label>}
    </div>
    {error && errorTarget === "type" && <p role="alert" className="residential-fields__error">{error}</p>}
    {error && errorTarget === "area" && <p id="fj-residential-area" role="alert" className="residential-fields__error">{error} (متراژ در اطلاعات اصلی همین مرحله وارد می‌شود.)</p>}
    {isShort ? <div id="fj-residential-finance" className="residential-fields__finance">
      <strong>شرایط اقامت کوتاه‌مدت <b>*</b></strong>
      <div className="residential-fields__grid">
        <label className="residential-fields__field"><span>دوره محاسبه مبلغ <b>*</b></span>
          <select disabled={disabled} value={o.shortRateUnit || "night"} onChange={(e) => updateOffer("shortRateUnit",e.target.value)}>
            {RESIDENTIAL_SHORT_RATE_UNITS.map(([id,label])=><option key={id} value={id}>{label}</option>)}
          </select></label>
        <label className="residential-fields__field"><span>اجاره هر دوره (ریال) <b>*</b></span>
          <input disabled={disabled} inputMode="numeric" dir="ltr" value={residentialMoneyDisplay(o.shortRateRial)}
            onChange={(e)=>updateOffer("shortRateRial",residentialMoneyDigits(e.target.value).slice(0,15))} placeholder="مثلاً ۱۰,۰۰۰,۰۰۰" />
          <small>هزینه اجاره، نه مبلغ رهن.</small></label>
        <label className="residential-fields__field"><span>ودیعه / ضمانت خسارت (اختیاری، ریال)</span>
          <input disabled={disabled} inputMode="numeric" dir="ltr" value={residentialMoneyDisplay(o.securityHoldRial)}
            onChange={(e)=>updateOffer("securityHoldRial",residentialMoneyDigits(e.target.value).slice(0,15))} placeholder="اگر دریافت نمی‌کنی خالی بگذار" />
          <small>این ودیعه فقط برای ضمانت خسارت اقامت است و با رهن قرارداد بلندمدت تفاوت دارد؛ در صورت عدم دریافت، خالی بگذار.</small></label>
      </div>
      {error && errorTarget === "finance" && <p role="alert" className="residential-fields__error">{error}</p>}
    </div> : <div id="fj-residential-finance" className="residential-fields__finance">
      <strong>شرایط رهن و اجاره <b>*</b></strong>
      <div className="residential-fields__choices">
        {RESIDENTIAL_FINANCIAL_MODES.map(([id, label]) => <button key={id} type="button" disabled={disabled}
          aria-pressed={o.financialMode === id} className={`residential-fields__choice${o.financialMode === id ? " is-selected" : ""}`}
          onClick={() => changeMode(id)}>{o.financialMode === id ? "✓ " : ""}{label}</button>)}
      </div>
      {o.financialMode && <div className="residential-fields__grid">
        {o.financialMode !== "rent_only" && amountField("ودیعه / رهن (ریال)", "deposit")}
        {o.financialMode !== "full_deposit" && amountField("اجاره ماهانه (ریال)", "monthlyRent")}
      </div>}
      {error && errorTarget === "finance" && <p role="alert" className="residential-fields__error">{error}</p>}
      <small>در حالت رهن کامل مبلغ اجاره ثبت نمی‌شود. مبلغ ودیعه هرگز به‌جای اجاره نمایش داده نمی‌شود.</small>
    </div>}
    <button type="button" className="residential-fields__more" disabled={disabled} aria-expanded={expanded}
      onClick={() => setExpanded((v) => !v)}>＋ جزئیات تکمیلی (اختیاری) <span>{expanded ? "⌃" : "⌄"}</span></button>
    {expanded && <div className="residential-fields__extras">
      <div className="residential-fields__grid">
        {f.propertyType !== "room" && field("تعداد اتاق", "bedrooms", "مثلاً ۲", 2)}
        {["apartment", "penthouse"].includes(f.propertyType) && <label className="residential-fields__field"><span>طبقه واحد</span>
          <input disabled={disabled} maxLength={30} value={f.floor || ""} onChange={(e) => set("floor", e.target.value.slice(0, 30))} placeholder="مثلاً ۳ یا همکف" />
        </label>}
        {["apartment", "penthouse", "house", "villa"].includes(f.propertyType) && field("تعداد طبقات ساختمان", "totalFloors", "مثلاً ۵")}
        {["apartment", "penthouse"].includes(f.propertyType) && field("واحد در هر طبقه", "unitsPerFloor", "مثلاً ۲", 2)}
        {f.propertyType === "villa" && <label className="residential-fields__field"><span>نوع استفاده از ساختمان</span>
          <select disabled={disabled} value={f.buildingUse || ""} onChange={(e) => set("buildingUse", e.target.value)}>
            <option value="">مشخص نشده</option><option value="single">مستقل و یکپارچه</option><option value="multiple">دارای واحدهای مستقل</option>
          </select></label>}
        {field("سال ساخت", "buildYear", "مثلاً ۱۴۰۲", 4)}
      </div>
      <strong className="residential-fields__subhead">امکانات واقعاً موجود</strong>
      <div className="residential-fields__amenities">
        {amenityOptions.filter(([, , visible]) => visible).map(([key, label]) => <label key={key}>
          <input type="checkbox" disabled={disabled} checked={f[key] === true} onChange={(e) => set(key, e.target.checked)} />
          <span>✓</span>{label}</label>)}
        {["house", "villa"].includes(f.propertyType) && <label><input type="checkbox" disabled={disabled}
          checked={Array.isArray(o.features) && o.features.includes("yard")}
          onChange={(e) => updateOffer("features", e.target.checked ? ["yard"] : [])}/><span>✓</span>حیاط</label>}
      </div>
      <small>انتخاب‌نکردن یک امکان به معنی نبودن قطعی آن نیست.</small>
      <ClimateFields value={f} disabled={disabled} onChange={onChange} />
      <label className="residential-fields__field residential-fields__note"><span>نکات خاص ملک (اختیاری)</span>
        <textarea disabled={disabled} rows={3} maxLength={800} value={note} onChange={(e) => onNoteChange?.(e.target.value)}
          placeholder="مثلاً زمان تحویل، شرایط استفاده یا مواردی که در گزینه‌ها نیست" />
        <small>{String(note).length.toLocaleString("fa-IR")} / ۸۰۰</small></label>
    </div>}
  </section>;
}
