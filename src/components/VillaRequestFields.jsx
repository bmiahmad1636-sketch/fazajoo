import {
  EMPTY_VILLA_REQUEST, VILLA_REQUEST_TYPES, VILLA_REQUEST_STAYS, VILLA_REQUEST_TERMS, VILLA_REQUEST_LONG_MODES,
  VILLA_REQUEST_AMENITIES, normalizeVillaDigits, changeVillaRequestFinancialMode, changeVillaRequestTerm,
} from "../utils/villaRequest";
import "./ResidentialRequestFields.css";

const digitOnly = (value) => normalizeVillaDigits(value).replace(/\D/g, "");
const money = (value) => {
  const digits = digitOnly(value);
  return digits ? Number(digits).toLocaleString("en-US") : "";
};

export default function VillaRequestFields({ value = {}, onChange, disabled = false, error = "" }) {
  const form = { ...EMPTY_VILLA_REQUEST, ...value };
  const set = (key, next) => onChange({ ...form, [key]: next });
  const long = form.rentalTerm === "long";
  const contractError = long && error.includes("نوع قرارداد بلندمدت");
  const selectFinancialMode = (financialMode) => onChange(changeVillaRequestFinancialMode(form, financialMode));
  const toggleAmenity = (key, checked) => set("amenities", checked
    ? [...new Set([...(form.amenities || []), key])]
    : (form.amenities || []).filter((item) => item !== key));

  return (
    <section className="residential-request" dir="rtl">
      <header className="residential-request__heading">
        <span className="residential-request__icon" aria-hidden="true">🏡</span>
        <div><strong>چه ویلایی برای اقامت می‌خواهی؟</strong>
          <p>نوع اقامت را مشخص کن؛ سؤال‌های مربوط به کوتاه‌مدت و بلندمدت متفاوت‌اند.</p>
        </div>
      </header>
      <div className="residential-request__checks" role="group" aria-label="نوع قرارداد اقامت">{VILLA_REQUEST_TERMS.map(([id,label])=><label key={id} className="residential-request__check"><input type="radio" name="villaRequestTerm" checked={(form.rentalTerm||"short")===id} disabled={disabled} onChange={()=>onChange(changeVillaRequestTerm(form,id))}/>{label}</label>)}</div>
      {long&&<div className="residential-request__money"><strong id="villa-request-contract-label">نوع قرارداد بلندمدت *</strong><div className="residential-request__checks" role="radiogroup" aria-labelledby="villa-request-contract-label" aria-invalid={Boolean(contractError)} aria-describedby={contractError ? "villa-request-contract-error" : undefined}>{VILLA_REQUEST_LONG_MODES.map(([id,label])=><label key={id} className="residential-request__check"><input name="villaRequestLongMode" type="radio" disabled={disabled} checked={form.financialMode===id} onChange={()=>selectFinancialMode(id)}/>{label}</label>)}</div>{contractError&&<p id="villa-request-contract-error" className="residential-request__error" role="alert">{error}</p>}</div>}
      <div className="residential-request__grid">
        <label className="residential-request__field">
          <span>نوع اقامتگاه <em>*</em></span>
          <select disabled={disabled} value={form.accommodationType} onChange={(e) => set("accommodationType", e.target.value)}>
            {VILLA_REQUEST_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        {form.accommodationType === "other" && <label className="residential-request__field">
          <span>نوع اقامتگاه موردنظر <em>*</em></span>
          <input disabled={disabled} maxLength={70} value={form.otherType} onChange={(e) => set("otherType", e.target.value)} placeholder="حداقل ۵ نویسه" />
        </label>}
        {!long&&<label className="residential-request__field">
          <span>نوع اقامت <em>*</em></span>
          <select disabled={disabled} value={form.stayType} onChange={(e) => {
            const stayType = e.target.value;
            onChange({ ...form, stayType,
              pricePeriod: stayType === "weekly" ? "weekly" : stayType === "monthly" ? "monthly" : "daily" });
          }}>
            {VILLA_REQUEST_STAYS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>}
        <label className="residential-request__field">
          <span>{long?"تعداد ساکنان (نفر)":"تعداد مهمان (نفر)"} <em>*</em></span>
          <input inputMode="numeric" disabled={disabled} value={money(form.guests)}
            onChange={(e) => set("guests", digitOnly(e.target.value).slice(0, 3))} placeholder="مثلاً ۶" />
        </label>
        <label className="residential-request__field">
          <span>حداقل اتاق‌خواب (اختیاری)</span>
          <select disabled={disabled} value={form.minBedrooms} onChange={(e) => set("minBedrooms", e.target.value)}>
            <option value="">فرقی ندارد</option>
            {[0, 1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={String(n)}>{n === 6 ? "۶ اتاق یا بیشتر" : `${n} اتاق`}</option>)}
          </select>
        </label>
      </div>
      <div className="residential-request__money">
        <strong>💰 {long?"بودجه اجاره بلندمدت":"سقف بودجه اقامت"}</strong>
        <p>{long?"رهن و اجاره ماهانه دو مبلغ مستقل‌اند.":"مبلغ حداکثری برای هر دوره را مشخص کن."} واحد مبالغ ریال است.</p>
        <div className="residential-request__grid">
          {!long&&<label className="residential-request__field">
            <span>دوره محاسبه بودجه <em>*</em></span>
            <select disabled={disabled} value={form.pricePeriod} onChange={(e) => set("pricePeriod", e.target.value)}>
              <option value="daily">هر شب</option>
              <option value="weekly">هفتگی</option>
              <option value="monthly">ماهانه</option>
            </select>
          </label>}
          {(!long||(form.financialMode&&form.financialMode!=="full_deposit"))&&<label className="residential-request__field">
            <span>{long?"سقف اجاره ماهانه (ریال)":"حداکثر هزینه اقامت (ریال)"} <em>*</em></span>
            <input disabled={disabled} inputMode="numeric" value={money(form.maxBudget)}
              onChange={(e) => set("maxBudget", digitOnly(e.target.value).slice(0, 15))} placeholder="مثلاً ۳۰,۰۰۰,۰۰۰" />
          </label>}
          {long&&form.financialMode&&form.financialMode!=="rent_only"&&<label className="residential-request__field"><span>سقف رهن (ریال) <em>*</em></span><input disabled={disabled} inputMode="numeric" value={money(form.maxDeposit)} onChange={e=>set("maxDeposit",digitOnly(e.target.value).slice(0,15))} placeholder="مثلاً ۲,۰۰۰,۰۰۰,۰۰۰"/></label>}
        </div>
      </div>
      <details className="residential-request__fold">
        <summary>🏊 امکانات مهم برایت <span>اختیاری</span></summary>
        <div className="residential-request__fold-body">
          <p className="residential-request__hint">فقط امکاناتی را انتخاب کن که برایت ضروری است.</p>
          <div className="residential-request__checks">
            {VILLA_REQUEST_AMENITIES.map(([id, label]) => <label key={id} className="residential-request__check">
              <input disabled={disabled} type="checkbox" checked={(form.amenities || []).includes(id)}
                onChange={(e) => toggleAmenity(id, e.target.checked)} />{label}
            </label>)}
          </div>
          <label className="residential-request__check" style={{marginTop:12}}>
            <input disabled={disabled} type="checkbox" checked={Boolean(form.privacyRequired)}
              onChange={(e) => set("privacyRequired", e.target.checked)} />حریم خصوصی کامل ضروری است
          </label>
        </div>
      </details>
      <details className="residential-request__fold">
        <summary>📐 مساحت و شرایط تکمیلی <span>اختیاری</span></summary>
        <div className="residential-request__fold-body">
          <div className="residential-request__grid">
            <label className="residential-request__field"><span>حداقل متراژ (مترمربع)</span>
              <input disabled={disabled} inputMode="numeric" value={money(form.minArea)}
                onChange={(e) => set("minArea", digitOnly(e.target.value).slice(0, 7))} placeholder="مثلاً ۲۰۰" /></label>
            <label className="residential-request__field"><span>حداکثر متراژ (مترمربع)</span>
              <input disabled={disabled} inputMode="numeric" value={money(form.maxArea)}
                onChange={(e) => set("maxArea", digitOnly(e.target.value).slice(0, 7))} placeholder="مثلاً ۵۰۰" /></label>
            {!long&&<label className="residential-request__field"><span>حداکثر ضمانت خسارت / ودیعه (ریال)</span>
              <input disabled={disabled} inputMode="numeric" value={money(form.maxDeposit)}
                onChange={(e) => set("maxDeposit", digitOnly(e.target.value).slice(0, 15))} placeholder="اگر قابل پرداخت است" /></label>}
          </div>
          <label className="residential-request__field" style={{marginTop:12}}>
            <span>شرایط خاص اقامت</span>
            <textarea disabled={disabled} rows={3} maxLength={240} value={form.requirements}
              onChange={(e) => set("requirements", e.target.value.slice(0, 240))}
              placeholder="مثلاً نزدیک جنگل، مناسب خانواده یا دسترسی آسان" />
            <small>{(form.requirements || "").length.toLocaleString("fa-IR")} / ۲۴۰ نویسه</small>
          </label>
        </div>
      </details>
      {error && !contractError && <p className="residential-request__error" role="alert">{error}</p>}
    </section>
  );
}
