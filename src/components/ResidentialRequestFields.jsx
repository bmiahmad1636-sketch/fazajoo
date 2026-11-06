import {
  EMPTY_RESIDENTIAL_REQUEST,
  RESIDENTIAL_REQUEST_TYPES,
  RESIDENTIAL_REQUEST_FEATURES,
  RESIDENTIAL_FLOOR_PREFERENCES,
  normalizeResidentialDigits,
} from "../utils/residentialRequest";
import "./ResidentialRequestFields.css";

const digitOnly = (value) => normalizeResidentialDigits(value).replace(/\D/g, "");
const money = (value) => {
  const d = digitOnly(value);
  return d ? Number(d).toLocaleString("en-US") : "";
};

export default function ResidentialRequestFields({ value = {}, onChange, disabled = false, error = "" }) {
  const f = { ...EMPTY_RESIDENTIAL_REQUEST, ...value };
  const set = (key, val) => onChange({ ...f, [key]: val });
  const isApartment = ["apartment", "penthouse"].includes(f.propertyType);
  const featureOptions = RESIDENTIAL_REQUEST_FEATURES.filter(([key]) =>
    !(key === "elevator" && !isApartment) &&
    !(key === "balcony" && !["apartment", "penthouse", "house", "villa"].includes(f.propertyType)) &&
    !(key === "yard" && !["house", "villa"].includes(f.propertyType))
  );
  const toggleFeature = (key, checked) => set("features", checked
    ? [...new Set([...(f.features || []), key])]
    : (f.features || []).filter((item) => item !== key));
  const showDeposit = ["deposit", "both"].includes(f.paymentType);
  const showRent = ["rent", "both"].includes(f.paymentType);
  return (
    <section className="residential-request" dir="rtl">
      <header className="residential-request__heading">
        <span className="residential-request__icon" aria-hidden="true">🏠</span>
        <div>
          <strong>چه خانه‌ای نیاز داری؟</strong>
          <p>فقط نیازهای اصلی و سقف بودجه‌ات را مشخص کن؛ جزئیات بیشتر اختیاری است.</p>
        </div>
      </header>
      <div className="residential-request__term" role="group" aria-label="مدت اجاره موردنیاز">
        {[["long","بلندمدت"],["short","کوتاه‌مدت / اقامت موقت"]].map(([id,label])=><button
          type="button" key={id} disabled={disabled} className={f.rentalTerm === id ? "is-selected" : ""}
          aria-pressed={f.rentalTerm === id} onClick={()=>set("rentalTerm",id)}>{label}</button>)}
      </div>
      <div className="residential-request__grid">
        <label className="residential-request__field">
          <span>نوع فضای مسکونی <em>*</em></span>
          <select value={f.propertyType} disabled={disabled} onChange={(e) => {
            const propertyType = e.target.value;
            const allowed = RESIDENTIAL_REQUEST_FEATURES.filter(([key]) =>
              !(key === "elevator" && !["apartment", "penthouse"].includes(propertyType)) &&
              !(key === "balcony" && !["apartment", "penthouse", "house", "villa"].includes(propertyType)) &&
              !(key === "yard" && !["house", "villa"].includes(propertyType))
            ).map(([key]) => key);
            onChange({ ...f, propertyType, minBedrooms: ["room", "suite"].includes(propertyType) ? "" : f.minBedrooms, floorPreference: ["apartment", "penthouse"].includes(propertyType) ? f.floorPreference : "any", features: (f.features || []).filter((key) => allowed.includes(key)) });
          }}>
            {RESIDENTIAL_REQUEST_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        {f.propertyType === "other" && <label className="residential-request__field">
          <span>چه نوع فضایی؟ <em>*</em></span>
          <input disabled={disabled} value={f.otherType || ""} onChange={(e) => set("otherType", e.target.value.slice(0, 60))} placeholder="حداقل ۵ نویسه" maxLength={60} />
        </label>}
        <label className="residential-request__field">
          <span>حداقل متراژ (مترمربع)</span>
          <input disabled={disabled} inputMode="numeric" value={money(f.minArea)} onChange={(e) => set("minArea", digitOnly(e.target.value).slice(0, 7))} placeholder="مثلاً ۷۰" />
        </label>
        <label className="residential-request__field">
          <span>حداکثر متراژ (مترمربع)</span>
          <input disabled={disabled} inputMode="numeric" value={money(f.maxArea)} onChange={(e) => set("maxArea", digitOnly(e.target.value).slice(0, 7))} placeholder="مثلاً ۱۲۰" />
        </label>
        {!["room", "suite"].includes(f.propertyType) && <label className="residential-request__field">
          <span>حداقل تعداد اتاق (اختیاری)</span>
          <select value={f.minBedrooms} onChange={(e) => set("minBedrooms", e.target.value)} disabled={disabled}>
            <option value="">فرقی ندارد</option>
            {[0,1,2,3,4,5].map((n) => <option key={n} value={String(n)}>{n === 5 ? "۵ اتاق یا بیشتر" : `${n} اتاق`}</option>)}
          </select>
        </label>}
      </div>
      <div className="residential-request__money">
        <strong>💰 سقف بودجه {f.rentalTerm === "short" ? "اقامت کوتاه‌مدت" : "رهن و اجاره"}</strong>
        <p>مبلغ‌هایی را بنویس که حداکثر می‌توانی پرداخت کنی؛ واحد همه مبالغ ریال است.</p>
        {f.rentalTerm === "short" ? <div className="residential-request__grid">
          <label className="residential-request__field"><span>دوره بودجه <em>*</em></span>
            <select disabled={disabled} value={f.shortRateUnit || "night"} onChange={(e)=>set("shortRateUnit",e.target.value)}>
              <option value="night">شبانه</option><option value="week">هفتگی</option><option value="month">ماهانه (اقامت موقت)</option>
            </select></label>
          <label className="residential-request__field"><span>حداکثر بودجه هر دوره (ریال) <em>*</em></span>
            <input disabled={disabled} inputMode="numeric" value={money(f.shortMaxBudgetRial)}
              onChange={(e)=>set("shortMaxBudgetRial",digitOnly(e.target.value).slice(0,15))} placeholder="مثلاً ۲۰,۰۰۰,۰۰۰" /></label>
          <small>این مبلغ سقف بودجه متقاضی است، نه قیمت پیشنهادی مالک یا ودیعه قرارداد.</small>
        </div> : <div className="residential-request__grid">
          <label className="residential-request__field">
            <span>روش پرداخت <em>*</em></span>
            <select disabled={disabled} value={f.paymentType} onChange={(e) => set("paymentType", e.target.value)}>
              <option value="both">پول پیش و اجاره</option>
              <option value="deposit">رهن کامل</option>
              <option value="rent">فقط اجاره ماهانه</option>
            </select>
          </label>
          {showDeposit && <label className="residential-request__field">
            <span>حداکثر پول پیش (ریال) <em>*</em></span>
            <input disabled={disabled} inputMode="numeric" value={money(f.deposit)} onChange={(e) => set("deposit", digitOnly(e.target.value).slice(0, 15))} placeholder="مثلاً ۲,۰۰۰,۰۰۰,۰۰۰" />
          </label>}
          {showRent && <label className="residential-request__field">
            <span>حداکثر اجاره ماهانه (ریال) <em>*</em></span>
            <input disabled={disabled} inputMode="numeric" value={money(f.monthlyRent)} onChange={(e) => set("monthlyRent", digitOnly(e.target.value).slice(0, 15))} placeholder="مثلاً ۱۰۰,۰۰۰,۰۰۰" />
          </label>}
        </div>}
      </div>
      <details className="residential-request__fold">
        <summary>🏢 طبقه و امکانات دلخواه <span>اختیاری</span></summary>
        <div className="residential-request__fold-body">
          {isApartment && <label className="residential-request__field">
            <span>طبقه ترجیحی</span>
            <select disabled={disabled} value={f.floorPreference || "any"} onChange={(e) => set("floorPreference", e.target.value)}>
              {RESIDENTIAL_FLOOR_PREFERENCES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>}
          <span className="residential-request__hint">اگر امکانات زیر برایت ضروری هستند، انتخابشان کن.</span>
          <div className="residential-request__checks">
            {featureOptions.map(([key, label]) => <label key={key} className="residential-request__check">
              <input type="checkbox" checked={(f.features || []).includes(key)} disabled={disabled} onChange={(e) => toggleFeature(key, e.target.checked)} />
              {label}
            </label>)}
          </div>
        </div>
      </details>
      <details className="residential-request__fold">
        <summary>✍️ شرایط خاص <span>اختیاری</span></summary>
        <div className="residential-request__fold-body">
          <label className="residential-request__field">
            <span>توضیح کوتاه درباره نیازت</span>
            <textarea disabled={disabled} rows={3} maxLength={200} value={f.requirements || ""} onChange={(e) => set("requirements", e.target.value.slice(0, 200))} placeholder="مثلاً نزدیک مدرسه یا دسترسی آسان به مترو" />
            <small>{(f.requirements || "").length.toLocaleString("fa-IR")} / ۲۰۰ نویسه</small>
          </label>
        </div>
      </details>
      {error && <p className="residential-request__error" role="alert">{error}</p>}
    </section>
  );
}
