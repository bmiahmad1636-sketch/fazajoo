import {
  EMPTY_OTHER_REQUEST, OTHER_REQUEST_PERIODS, OTHER_REQUEST_DURATIONS,
  OTHER_REQUEST_FEATURES, otherDigits,
} from "../utils/otherRequest";

const field = { width: "100%", minHeight: 46, padding: "10px 12px", border: "1px solid #eadbd0", borderRadius: 12, boxSizing: "border-box", background: "#fff", font: "inherit", color: "#302923" };
const label = { display: "grid", gap: 7, minWidth: 0, fontWeight: 650, fontSize: 14 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 };
const section = { marginTop: 11, padding: "13px 16px", border: "1px solid #edddce", borderRadius: 14, background: "#fffaf6" };
const money = (value) => { const digits = otherDigits(value); return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""; };

export default function OtherRequestFields({ value = EMPTY_OTHER_REQUEST, onChange, disabled = false, error = "" }) {
  const data = { ...EMPTY_OTHER_REQUEST, ...value };
  const change = (key, next) => onChange({ ...data, [key]: next });
  const requestLength = String(data.requestText || "").trim().length;
  const numeric = (name, key, hint, cash = false) => <label style={label} key={key}>
    <span>{name}</span>
    <input style={field} type="text" inputMode="numeric" disabled={disabled} placeholder={hint}
      value={cash ? money(data[key]) : data[key] || ""}
      onChange={(event) => change(key, otherDigits(event.target.value))}/>
  </label>;
  return <section dir="rtl" style={{ gridColumn: "1 / -1", width: "100%", boxSizing: "border-box", padding: 16, border: "1px solid #f0d8c2", borderRadius: 18, background: "#fffdfa" }}>
    <div style={{ marginBottom: 14, lineHeight: 1.9 }}>
      <strong style={{ color: "#9e4f20", fontSize: 17 }}>✨ فضای متفاوتی لازم داری؟ همین‌جا توضیح بده</strong>
      <p style={{ color: "#75675e", margin: "3px 0" }}>اگر در دسته‌های دیگر نیست، نیازت را به زبان خودت بنویس؛ مثل استودیو، سالن تمرین، پشت‌بام، آشپزخانه یا فضای چندمنظوره.</p>
      <small style={{ color: "#866e5d" }}>نیازی نیست مشخصات یک ملک موجود را بدانی؛ فقط بگو چه فضایی و برای چه کاری لازم داری.</small>
    </div>
    <label style={label}>
      <span>دقیقاً چه فضایی می‌خواهی و چه استفاده‌ای از آن داری؟ <b style={{ color: "#d92d20" }}>*</b></span>
      <textarea rows={3} style={{ ...field, minHeight: 96, resize: "vertical", lineHeight: 1.85 }}
        maxLength={700} disabled={disabled} value={data.requestText || ""}
        placeholder="مثلاً یک فضای آرام و عایق صدا برای ضبط پادکست می‌خواهم؛ دسترسی عصرها برایم مهم است..."
        onChange={(event) => change("requestText", event.target.value)}/>
      <small aria-live="polite" style={{ fontWeight: 500, color: requestLength >= 20 ? "#287a54" : "#b42318" }}>
        {String(data.requestText || "").length} / ۷۰۰ نویسه {requestLength < 20 ? "— حداقل ۲۰ نویسه لازم است" : "— توضیح کافی است"}
      </small>
    </label>
    <details style={section}>
      <summary style={{ cursor: "pointer", fontWeight: 800, color: "#67432e" }}>↔ اندازه تقریبی فضا (اختیاری)</summary>
      <div style={{ ...grid, marginTop: 12 }}>
        {numeric("حداقل مساحت (مترمربع)", "minArea", "مثلاً ۵۰")}
        {numeric("حداکثر مساحت (مترمربع)", "maxArea", "مثلاً ۱۵۰")}
      </div>
      <small style={{ color: "#8a7161" }}>اگر متراژ دقیقی نمی‌دانی، این بخش را خالی بگذار.</small>
    </details>
    <details style={section}>
      <summary style={{ cursor: "pointer", fontWeight: 800, color: "#67432e" }}>💰 بودجه و مدت اجاره (اختیاری)</summary>
      <div style={{ ...grid, marginTop: 12 }}>
        <label style={label}><span>دوره بودجه</span>
          <select style={field} disabled={disabled} value={data.pricePeriod} onChange={(event) => change("pricePeriod", event.target.value)}>
            {OTHER_REQUEST_PERIODS.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
          </select>
        </label>
        {data.pricePeriod !== "negotiable" && numeric("حداکثر اجاره (ریال)", "maxBudget", "مثلاً ۵۰,۰۰۰,۰۰۰", true)}
        <label style={label}><span>مدت موردنیاز</span>
          <select style={field} disabled={disabled} value={data.duration} onChange={(event) => change("duration", event.target.value)}>
            {OTHER_REQUEST_DURATIONS.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
          </select>
        </label>
      </div>
    </details>
    <details style={section}>
      <summary style={{ cursor: "pointer", fontWeight: 800, color: "#67432e" }}>✨ امکانات و شرایط تکمیلی (اختیاری)</summary>
      <div style={{ ...grid, marginTop: 12, gap: 10 }}>
        {OTHER_REQUEST_FEATURES.map(([id, text]) => <label key={id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" disabled={disabled} checked={Array.isArray(data.features) && data.features.includes(id)}
            onChange={(event) => change("features", event.target.checked ? [...(data.features || []), id] : (data.features || []).filter((key) => key !== id))}/>
          {text}
        </label>)}
      </div>
      <label style={{ ...label, marginTop: 12 }}><span>سایر شرایط (در صورت نیاز)</span>
        <textarea rows={2} style={{ ...field, resize: "vertical", lineHeight: 1.8 }} maxLength={300} disabled={disabled}
          value={data.requirements || ""} placeholder="مثلاً نزدیکی به مترو، طبقه همکف یا شرایط دسترسی..."
          onChange={(event) => change("requirements", event.target.value)}/>
      </label>
    </details>
    {error && <p role="alert" style={{ color: "#b42318", fontWeight: 700, marginTop: 12 }}>{error}</p>}
  </section>;
}
