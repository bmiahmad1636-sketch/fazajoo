import {
  PARKING_TERMS, PARKING_MODES, PARKING_UNITS, changeParkingRentalTerm,
  changeParkingFinancialMode, changeParkingRateUnit,
} from "../utils/parkingRental.js";
import "./ParkingRentalFields.css";
const persianDigits = text => String(text ?? "").replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
const digits = value => persianDigits(value).replace(/\D/g, "").slice(0, 15);
const display = value => { const v = digits(value); return v ? Number(v).toLocaleString("en-US") : ""; };

export default function ParkingRentalFields({ value, onChange, wanted = false, disabled = false, error = "", allowLegacy = false }) {
  const term = value?.rentalTerm || "";
  const long = term === "long";
  const update = (name, next) => onChange({ ...value, [name]: next });
  const money = (name, title, required = false, hint = "") => <label className="fj-pr-field" key={name}>
    <span>{title}{required && <em> *</em>}</span>
    <div className="fj-pr-money"><input type="text" inputMode="numeric" autoComplete="off"
      disabled={disabled} value={display(value?.[name])} placeholder="مبلغ به ریال"
      onChange={e => update(name, digits(e.target.value))}/><small>ریال</small></div>
    {hint && <small className="fj-pr-field__hint">{hint}</small>}
  </label>;
  return <section className="fj-pr" dir="rtl" aria-label={wanted ? "مدت و بودجه درخواست پارکینگ" : "مدت و شرایط مالی پارکینگ"}>
    <div className="fj-pr-heading"><strong>📅 {wanted ? "مدت و بودجه پارکینگ موردنیاز" : "مدت و شرایط مالی پارکینگ"}</strong>
      <p>مدت قرارداد را مستقل از دوره محاسبه مبلغ انتخاب کن. همه مبالغ به ریال‌اند.</p></div>
    {allowLegacy && !term && <p className="fj-pr-legacy">این آگهی قدیمی مدت قرارداد مشخصی ندارد. برای حفظ اطلاعات قبلی می‌توانی بدون تغییر مدت آن را ویرایش کنی؛ برای استانداردکردن، یکی از گزینه‌های زیر را انتخاب کن.</p>}
    <fieldset className="fj-pr-terms"><legend>مدت اصلی قرارداد {!allowLegacy && "*"}</legend>
      {PARKING_TERMS.map(([id, label]) => <label className="fj-pr-option" key={id}>
        <input type="radio" name={`parking-rental-${wanted ? "wanted" : "offer"}`} disabled={disabled} checked={term === id}
          onChange={() => onChange(changeParkingRentalTerm(value, id, wanted))}/>{label}</label>)}
    </fieldset>
    {term && <div className="fj-pr-content">
      {long && <fieldset className="fj-pr-terms fj-pr-modes"><legend>نوع قرارداد بلندمدت *</legend>
        {PARKING_MODES.map(([id,label]) => <label className="fj-pr-option" key={id}>
          <input type="radio" name={`parking-mode-${wanted ? "wanted" : "offer"}`} disabled={disabled} checked={value.financialMode === id}
            onChange={() => onChange(changeParkingFinancialMode(value, id, wanted))}/>{label}</label>)}
      </fieldset>}
      {(!long || value.financialMode !== "full_deposit") && <div className="fj-pr-grid">
        <label className="fj-pr-field"><span>دوره محاسبه مبلغ *</span>
          <select disabled={disabled} value={long ? value.longRateUnit : value.shortRateUnit}
            onChange={e => onChange(changeParkingRateUnit(value, e.target.value, wanted))}>
            {PARKING_UNITS[term].map(([id,label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        {money(long ? (wanted ? "maxRentRial" : value.longRateUnit === "year" ? "longYearlyRentRial" : "longMonthlyRentRial")
          : (wanted ? "maxBudgetRial" : "shortRateRial"),
          long ? (wanted ? "سقف اجاره" : "مبلغ اجاره") : (wanted ? "سقف بودجه استفاده" : "هزینه استفاده"), true)}
      </div>}
      {long ? value.financialMode && value.financialMode !== "rent_only" && <div className="fj-pr-grid">
        {money(wanted ? "maxDepositRial" : "longDepositRial", wanted ? "حداکثر رهن" : "مبلغ رهن", true)}
      </div> : <div className="fj-pr-grid">
        {money(wanted ? "maxSecurityHoldRial" : "securityHoldRial", wanted ? "حداکثر ضمانت خسارت / ودیعه" : "ضمانت خسارت / ودیعه", false,
          "این مبلغ اختیاری است و فقط برای خسارت احتمالی دریافت می‌شود؛ با رهن بلندمدت تفاوت دارد.")}
      </div>}
      {!wanted && <label className="fj-pr-option fj-pr-consent"><input type="checkbox" disabled={disabled}
        checked={value.canNegotiateOtherTerm === true} onChange={e => update("canNegotiateOtherTerm", e.target.checked)}/>
        برای اجاره با مدت دیگر هم امکان مذاکره دارم.</label>}
      {!wanted && <small className="fj-pr-consent-help">مدت دیگر فقط با توافق طرفین قابل بررسی است و قیمت جداگانه‌ای برای آن ثبت نشده است.</small>}
      <p className="fj-pr-note">{wanted ? "مبالغ این فرم سقف بودجه متقاضی‌اند، نه قیمت قطعی مالک." : "مبالغ تنها برای همین مدت قرارداد ثبت می‌شوند. تغییر نوع قرارداد، مقادیر قبلی را پاک می‌کند."}</p>
    </div>}
    {error && <p className="fj-pr-error" role="alert">{error}</p>}
  </section>;
}
