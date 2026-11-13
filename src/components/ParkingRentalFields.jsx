import {
  PARKING_TERMS, PARKING_MODES, PARKING_UNITS, changeParkingRentalTerm,
  changeParkingFinancialMode, changeParkingRateUnit,
} from "../utils/parkingRental.js";
import "./ParkingRentalFields.css";
import { STORAGE_RENTAL_OPTIONS, changeStorageTerm, changeStorageMode, changeStorageUnit } from "../utils/storageRental.js";
import { INDUSTRIAL_RENTAL_OPTIONS, changeIndustrialTerm, changeIndustrialMode, changeIndustrialUnit } from "../utils/industrialRental.js";
const persianDigits = text => String(text ?? "").replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
const digits = value => persianDigits(value).replace(/\D/g, "").slice(0, 15);
const display = value => { const v = digits(value); return v ? Number(v).toLocaleString("en-US") : ""; };

export default function ParkingRentalFields({ value, onChange, wanted = false, disabled = false, error = "", allowLegacy = false, category = "parking" }) {
  const term = value?.rentalTerm || "";
  const long = term === "long";
  const storage = category === "storage";
  const industrial = category === "warehouse";
  const policy = industrial ? INDUSTRIAL_RENTAL_OPTIONS : STORAGE_RENTAL_OPTIONS;
  const units = storage || industrial ? {short: policy.rateUnitsByTerm.short.map(u=>[u,({day:"روزانه",week:"هفتگی",month:"ماهانه"})[u]]),long: policy.rateUnitsByTerm.long.map(u=>[u,({month:"ماهانه",year:"سالانه"})[u]])} : PARKING_UNITS;
  const label = industrial ? "سوله یا کارگاه" : storage ? "انبار" : "پارکینگ";
  const update = (name, next) => onChange({ ...value, [name]: next });
  // Warehouse F5-03: validation belongs beside the field that needs attention.
  // Leave parking and storage presentation unchanged.
  const inline = industrial && !!error;
  const termError = inline && !term;
  const modeError = inline && long && !value?.financialMode;
  const periodError = inline && !termError && !modeError && /دوره محاسبه|دوره کوتاه|دوره بلند/.test(error);
  const depositError = inline && long && !modeError && /مبلغ رهن|سقف مبلغ رهن/.test(error);
  const rentError = inline && !termError && !modeError && !periodError && !depositError && /اجاره را|سقف بودجه|مبلغ کوتاه/.test(error);
  const inlineShown = termError || modeError || periodError || depositError || rentError;
  const money = (name, title, required = false, hint = "") => <label className="fj-pr-field" key={name}>
    <span>{title}{required && <em> *</em>}</span>
    <div className="fj-pr-money"><input type="text" inputMode="numeric" autoComplete="off"
      disabled={disabled} value={display(value?.[name])} placeholder="مبلغ به ریال"
      onChange={e => update(name, digits(e.target.value))}/><small>ریال</small></div>
    {hint && <small className="fj-pr-field__hint">{hint}</small>}
    {((rentError && (name === (long ? (wanted ? "maxRentRial" : value.longRateUnit === "year" ? "longYearlyRentRial" : "longMonthlyRentRial") : (wanted ? "maxBudgetRial" : "shortRateRial")))) ||
      (depositError && ["maxDepositRial","longDepositRial"].includes(name))) && <small role="alert" className="fj-pr-error">{error}</small>}
  </label>;
  return <section className="fj-pr" dir="rtl" aria-label={wanted ? `مدت و بودجه درخواست ${label}` : `مدت و شرایط مالی ${label}`}>
    <div className="fj-pr-heading"><strong>📅 {wanted ? `مدت و بودجه ${label} موردنیاز` : `مدت و شرایط مالی ${label}`}</strong>
      <p>مدت قرارداد را مستقل از دوره محاسبه مبلغ انتخاب کن. همه مبالغ به ریال‌اند.</p></div>
    {allowLegacy && !term && <p className="fj-pr-legacy">این آگهی قدیمی مدت قرارداد مشخصی ندارد. برای حفظ اطلاعات قبلی می‌توانی بدون تغییر مدت آن را ویرایش کنی؛ برای استانداردکردن، یکی از گزینه‌های زیر را انتخاب کن.</p>}
    <fieldset className="fj-pr-terms"><legend>مدت اصلی قرارداد {!allowLegacy && "*"}</legend>
      {PARKING_TERMS.map(([id, label]) => <label className="fj-pr-option" key={id}>
        <input type="radio" name={`${category}-rental-${wanted ? "wanted" : "offer"}`} disabled={disabled} checked={term === id}
          onChange={() => onChange(industrial ? changeIndustrialTerm(value,id,wanted) : storage ? changeStorageTerm(value, id, wanted) : changeParkingRentalTerm(value, id, wanted))}/>{label}</label>)}
    </fieldset>
    {termError && <p className="fj-pr-error" role="alert">{error}</p>}
    {term && <div className="fj-pr-content">
      {long && <fieldset className="fj-pr-terms fj-pr-modes"><legend>نوع قرارداد بلندمدت *</legend>
        {PARKING_MODES.map(([id,label]) => <label className="fj-pr-option" key={id}>
          <input type="radio" name={`${category}-mode-${wanted ? "wanted" : "offer"}`} disabled={disabled} checked={value.financialMode === id}
            onChange={() => onChange(industrial ? changeIndustrialMode(value,id,wanted) : storage ? changeStorageMode(value, id, wanted) : changeParkingFinancialMode(value, id, wanted))}/>{label}</label>)}
      </fieldset>}
      {modeError && <p className="fj-pr-error" role="alert">{error}</p>}
      {(!long || value.financialMode !== "full_deposit") && <div className="fj-pr-grid">
        <label className="fj-pr-field"><span>دوره محاسبه مبلغ *</span>
          <select disabled={disabled} value={long ? value.longRateUnit : value.shortRateUnit}
            onChange={e => onChange(industrial ? changeIndustrialUnit(value,e.target.value,wanted) : storage ? changeStorageUnit(value,e.target.value,wanted) : changeParkingRateUnit(value, e.target.value, wanted))}>
            {units[term].map(([id,label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          {periodError && <small role="alert" className="fj-pr-error">{error}</small>}
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
      <p className="fj-pr-note">{wanted ? "مبالغ این فرم سقف بودجه متقاضی‌اند، نه قیمت قطعی مالک." : (storage ? "با تغییر مدت یا نوع قرارداد، مشخصات انبار حفظ می‌شوند؛ فقط مبالغ نامرتبط پاک خواهند شد." : industrial ? "با تغییر مدت یا نوع قرارداد، مشخصات سوله یا کارگاه حفظ می‌شوند؛ فقط مبالغ نامرتبط پاک خواهند شد." : "مبالغ تنها برای همین مدت قرارداد ثبت می‌شوند. تغییر نوع قرارداد، مقادیر قبلی را پاک می‌کند.")}</p>
    </div>}
    {error && !inlineShown && <p className="fj-pr-error" role="alert">{error}</p>}
  </section>;
}
