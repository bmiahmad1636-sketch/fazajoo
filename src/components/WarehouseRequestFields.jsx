import { WAREHOUSE_PURPOSES, WAREHOUSE_TYPES, WAREHOUSE_ACCESS, WAREHOUSE_DURATIONS, WAREHOUSE_FEATURES } from "../utils/warehouseRequest";

export default function WarehouseRequestFields({ value, onChange, disabled = false, error = "" }) {
  const update = (key, next) => onChange({ ...value, [key]: next });
  const select = (label, key, options) => (
    <label style={{ display: "grid", gap: 6, minWidth: 0, fontWeight: 700 }}>
      {label}
      <select value={value[key] || ""} disabled={disabled} onChange={(event) => update(key, event.target.value)} style={{ width: "100%", padding: 12, border: "1px solid #e8d8cb", borderRadius: 12, background: "white", font: "inherit" }}>
        {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
      </select>
    </label>
  );
  return (
    <section style={{ gridColumn: "1 / -1", display: "grid", gap: 16, padding: 18, border: "1px solid #f0d7c1", borderRadius: 16, background: "#fffaf6" }}>
      <div><strong style={{ color: "#a94c0c" }}>📦 مشخصات انبار موردنیاز</strong><p style={{ margin: "5px 0 0", color: "#6d5a50" }}>فقط نیازهای واقعی‌ات را انتخاب کن؛ امکانات اختیاری‌اند.</p></div>
      {select("کاربری انبار *", "purpose", [["", "انتخاب کنید"], ...WAREHOUSE_PURPOSES])}
      {value.purpose === "other" && <label style={{ display: "grid", gap: 6 }}>توضیح کاربری سایر *<input value={value.otherPurpose || ""} maxLength={100} disabled={disabled} onChange={e => update("otherPurpose", e.target.value)} placeholder="حداقل ۵ حرف" style={{ padding: 12, border: "1px solid #e8d8cb", borderRadius: 12, font: "inherit" }}/></label>}
      {select("نوع فضای مطلوب", "spaceType", WAREHOUSE_TYPES)}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        {[ ["حداقل متراژ (مترمربع)", "minArea"], ["حداکثر متراژ (مترمربع)", "maxArea"] ].map(([label, key]) => <label key={key} style={{ display: "grid", gap: 6 }}>{label}<input type="number" min="1" value={value[key] || ""} disabled={disabled} onChange={e => update(key, e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #e8d8cb", borderRadius: 12, font: "inherit" }}/></label>)}
      </div>
      {select("زمان دسترسی", "access", WAREHOUSE_ACCESS)}
      {select("مدت اجاره", "duration", WAREHOUSE_DURATIONS)}
      <div><strong>امکانات ضروری (اختیاری)</strong><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 10, marginTop: 10 }}>
        {WAREHOUSE_FEATURES.map(([id, label]) => <label key={id} style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 500 }}><input type="checkbox" disabled={disabled} checked={(value.features || []).includes(id)} onChange={e => update("features", e.target.checked ? [...(value.features || []), id] : (value.features || []).filter(x => x !== id))}/>{label}</label>)}
      </div></div>
      <label style={{ display: "grid", gap: 6 }}>شرایط خاص (اختیاری)<textarea value={value.requirements || ""} maxLength={300} rows={2} disabled={disabled} onChange={e => update("requirements", e.target.value)} placeholder="مثلاً محدوده محله، شرایط بارگیری یا نوع کالا" style={{ padding: 12, border: "1px solid #e8d8cb", borderRadius: 12, font: "inherit" }}/></label>
      {error && <span role="alert" style={{ color: "#b42318" }}>{error}</span>}
    </section>
  );
}
