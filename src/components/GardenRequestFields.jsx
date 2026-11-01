import { GARDEN_REQUEST_PURPOSES, GARDEN_REQUEST_DURATIONS, GARDEN_REQUEST_PERIODS, GARDEN_REQUEST_FEATURES, GARDEN_REQUEST_WATER, EMPTY_GARDEN_REQUEST, gardenDigits } from "../utils/gardenRequest";

const fieldStyle = { width: "100%", minHeight: 44, border: "1px solid #eadad0", borderRadius: 12, background: "#fff", padding: "9px 12px", font: "inherit", boxSizing: "border-box" };
const labelStyle = { display: "grid", gap: 6, fontWeight: 700, fontSize: 14, minWidth: 0 };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 };
const sectionStyle = { padding: 16, border: "1px solid #eddbce", borderRadius: 16, background: "#fffaf6", marginTop: 12 };
const choose = (items) => items.map(([id, text]) => <option value={id} key={id}>{text}</option>);
const money = (value) => { const n = gardenDigits(value); return n ? n.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""; };

export default function GardenRequestFields({ value = EMPTY_GARDEN_REQUEST, onChange, disabled = false, error = "" }) {
  const data = { ...EMPTY_GARDEN_REQUEST, ...value };
  const update = (key, next) => onChange({ ...data, [key]: next });
  const numberField = (title, key, placeholder, cash = false) => (
    <label style={labelStyle} key={key}>
      <span>{title}</span>
      <input style={fieldStyle} disabled={disabled} inputMode="numeric" type="text" placeholder={placeholder}
        value={cash ? money(data[key]) : (data[key] ?? "")}
        onChange={(e) => update(key, gardenDigits(e.target.value))} />
    </label>
  );
  const selectField = (title, key, items) => (
    <label style={labelStyle} key={key}>
      <span>{title}</span>
      <select style={fieldStyle} disabled={disabled} value={data[key] ?? ""} onChange={(e) => update(key, e.target.value)}>{choose(items)}</select>
    </label>
  );
  const isCultivation = ["orchard", "gardening"].includes(data.purpose);
  return <section dir="rtl" style={{ border: "1px solid #f4ddc9", borderRadius: 18, padding: 16, background: "#fffdfa", gridColumn: "1 / -1", width: "100%", boxSizing: "border-box" }}>
    <div style={{ marginBottom: 14 }}>
      <strong style={{ fontSize: 17, color: "#9e4f20" }}>🌳 باغ موردنیازت را ساده معرفی کن</strong>
      <p style={{ color: "#74675e", margin: "5px 0" }}>فقط هدف اجاره، حدود مساحت و بودجه را مشخص کن؛ جزئیات بیشتر اختیاری و کشویی هستند.</p>
    </div>
    <div style={data.purpose === "other" ? { ...gridStyle, alignItems: "start" } : gridStyle}>
      <label style={labelStyle}><span>هدف اصلی اجاره باغ <b style={{ color: "#d92d20" }}>*</b></span>
        <select style={fieldStyle} value={data.purpose} disabled={disabled} onChange={(e) => update("purpose", e.target.value)}>
          <option value="">انتخاب کنید</option>{choose(GARDEN_REQUEST_PURPOSES)}
        </select>
      </label>
      {data.purpose === "other" && <label style={labelStyle}>
        <span>توضیح هدف اجاره <b style={{ color: "#d92d20" }}>*</b></span>
        <textarea rows={1} style={{ ...fieldStyle, minHeight: 44, resize: "none", overflow: "hidden", fieldSizing: "content" }} maxLength={120} disabled={disabled} value={data.otherPurpose || ""} placeholder="مثلاً برای یک فعالیت مشخص و مجاز..."
          onChange={(e) => update("otherPurpose", e.target.value)} />
        <small style={{ color: String(data.otherPurpose || "").trim().length < 15 ? "#b42318" : "#287a54" }}>
          {String(data.otherPurpose || "").length} / ۱۲۰ نویسه {String(data.otherPurpose || "").trim().length < 15 ? "— حداقل ۱۵ نویسه لازم است" : "— کافی است"}
        </small>
      </label>}
      {numberField("حداقل مساحت (مترمربع)", "minArea", "مثلاً ۵۰۰")}
      {numberField("حداکثر مساحت (مترمربع)", "maxArea", "مثلاً ۱۵۰۰")}
      {selectField("دوره بودجه اجاره", "pricePeriod", GARDEN_REQUEST_PERIODS)}
      {data.pricePeriod !== "negotiable" && numberField("حداکثر اجاره (ریال)", "maxBudget", "مثلاً ۱۰۰,۰۰۰,۰۰۰", true)}
    </div>
    <details style={sectionStyle}>
      <summary style={{ cursor: "pointer", fontWeight: 850, color: "#623d28" }}>⏳ مدت و شرایط استفاده (اختیاری)</summary>
      <div style={{ ...gridStyle, marginTop: 14 }}>
        {selectField("مدت موردنیاز", "duration", GARDEN_REQUEST_DURATIONS)}
        {numberField("حداکثر ودیعه / پول پیش (ریال)", "maxDeposit", "در صورت نیاز", true)}
        {data.purpose === "event" && numberField("ظرفیت تقریبی مهمان‌ها", "eventGuests", "مثلاً ۳۰")}
        {data.purpose === "event" && <small style={{ gridColumn: "1 / -1", color: "#926042" }}>برگزاری رویداد یا مراسم باید با رضایت مالک و مجوزهای لازم مجاز باشد.</small>}
      </div>
    </details>
    <details style={sectionStyle}>
      <summary style={{ cursor: "pointer", fontWeight: 850, color: "#623d28" }}>{isCultivation ? "🌿 درختان، آبیاری و امکانات موردنیاز" : "✨ امکانات دلخواه و ویژگی‌های باغ"} (اختیاری)</summary>
      <div style={{ marginTop: 14 }}>
        {isCultivation && <div style={{ ...gridStyle, marginBottom: 12 }}>
          <label style={labelStyle}><span>درختان یا نوع کشت موردنظر</span><input style={fieldStyle} disabled={disabled} maxLength={100} value={data.treesNote || ""} placeholder="مثلاً باغ سیب، انگور یا گل و گیاه" onChange={(e) => update("treesNote", e.target.value)}/></label>
          {selectField("ترجیح منبع آب", "waterPreference", GARDEN_REQUEST_WATER)}
        </div>}
        <div style={{ ...gridStyle, gap: 9 }}>
          {GARDEN_REQUEST_FEATURES.map(([id, text]) => <label key={id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14 }}>
            <input type="checkbox" checked={Array.isArray(data.features) && data.features.includes(id)} disabled={disabled}
              onChange={(e) => update("features", e.target.checked ? [...(data.features || []), id] : (data.features || []).filter((x) => x !== id))} />{text}
          </label>)}
          <label style={{ display: "flex", alignItems: "center", gap: 7 }}><input type="checkbox" checked={Boolean(data.privacyRequired)} disabled={disabled} onChange={(e) => update("privacyRequired", e.target.checked)}/>حریم خصوصی برایم مهم است</label>
        </div>
      </div>
    </details>
    <details style={sectionStyle}>
      <summary style={{ cursor: "pointer", fontWeight: 850, color: "#623d28" }}>📝 شرایط خاص (اختیاری)</summary>
      <textarea style={{ ...fieldStyle, marginTop: 12, minHeight: 84 }} rows={3} maxLength={240} disabled={disabled} value={data.requirements || ""}
        placeholder="فقط موارد مهم، مثل راه دسترسی یا شرایط زمانی..." onChange={(e) => update("requirements", e.target.value)}/>
      <small style={{ display: "block", color: "#89786c" }}>{String(data.requirements || "").length} / ۲۴۰ نویسه</small>
    </details>
    {error && <p role="alert" style={{ color: "#b42318", fontWeight: 700, marginTop: 12 }}>{error}</p>}
  </section>;
}
