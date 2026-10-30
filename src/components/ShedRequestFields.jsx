import { SHED_TYPES, SHED_ACTIVITIES, SHED_POWER, SHED_ACCESS, SHED_DURATIONS, shedActivitiesFor, shedFeaturesFor } from "../utils/shedRequest";

const fieldStyle = { width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #e8d8cb", borderRadius: 12, background: "white", font: "inherit" };
const labelStyle = { display: "grid", gap: 6, minWidth: 0, fontWeight: 700 };
const requiredMark = <span aria-label="ضروری" style={{ color: "#d92d20", fontWeight: 900, fontSize: "1.15em", marginInlineStart: 4 }}>*</span>;

export default function ShedRequestFields({ value = {}, onChange, disabled = false, error = "" }) {
  const update = (key, next) => onChange({ ...value, [key]: next });
  const select = (label, key, options, required = false) => <label style={labelStyle}><span>{label}{required && requiredMark}</span><select value={value[key] || ""} disabled={disabled} onChange={e => update(key, e.target.value)} style={fieldStyle}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>;
  const number = (label, key, placeholder) => <label style={labelStyle}><span>{label}</span><input type="number" min="1" inputMode="decimal" placeholder={placeholder} value={value[key] ?? ""} disabled={disabled} onChange={e => update(key, e.target.value)} style={fieldStyle}/></label>;
  const spaceType = value.spaceType || "";
  const specializedActivities = shedActivitiesFor(spaceType);
  const activityOptions = specializedActivities.some(([id]) => id === value.activity)
    ? specializedActivities
    : value.activity && SHED_ACTIVITIES.some(([id]) => id === value.activity)
      ? [...specializedActivities, ...SHED_ACTIVITIES.filter(([id]) => id === value.activity)]
      : specializedActivities;
  const featureOptions = shedFeaturesFor(spaceType);
  const visibleFeatures = [...featureOptions, ...((value.features || []).filter(id => !featureOptions.some(([key]) => key === id)).map(id => [id, id]))];
  const handleTypeChange = (nextType) => onChange({
    ...value,
    spaceType: nextType,
    activity: "",
    otherActivity: "",
    features: [],
    access: "any",
    ...(nextType === "workshop" ? { minHeight: "", powerCapacity: "" } : {}),
  });
  return <section style={{ gridColumn: "1 / -1", display: "grid", gap: 16, padding: 18, border: "1px solid #f0d7c1", borderRadius: 16, background: "#fffaf6" }}>
    <div><strong style={{ color: "#a94c0c" }}>🏭 مشخصات سوله یا کارگاه موردنیاز</strong><p style={{ margin: "5px 0 0", color: "#6d5a50" }}>نوع فضا را انتخاب کن تا پرسش‌های متناسب با همان فضا نمایش داده شوند.</p></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
      <label style={labelStyle}><span>نوع فضای موردنیاز{requiredMark}</span><select value={spaceType} disabled={disabled} onChange={e => handleTypeChange(e.target.value)} style={fieldStyle}><option value="">انتخاب کنید</option>{SHED_TYPES.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>
      {spaceType && select("نوع فعالیت", "activity", [["", "انتخاب کنید"], ...activityOptions], true)}
    </div>
    {value.activity === "other" && <label style={labelStyle}><span>شرح فعالیت دیگر{requiredMark}</span><input value={value.otherActivity || ""} maxLength={100} disabled={disabled} onChange={e => update("otherActivity", e.target.value)} placeholder="حداقل ۵ حرف" style={fieldStyle}/></label>}
    {spaceType && <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 12 }}>
        {number("حداقل متراژ (مترمربع)", "minArea", spaceType === "shed" ? "مثلاً ۵۰۰" : "مثلاً ۵۰")}
        {number("حداکثر متراژ (مترمربع)", "maxArea", spaceType === "shed" ? "مثلاً ۲۰۰۰" : "مثلاً ۲۰۰")}
        {spaceType === "shed" && number("حداقل ارتفاع مفید سقف (متر، اختیاری)", "minHeight", "مثلاً ۶")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {select("برق موردنیاز", "power", SHED_POWER)}
        {select(spaceType === "shed" ? "دسترسی کامیون و تریلی" : "دسترسی وسیله باربری", "access", spaceType === "shed" ? SHED_ACCESS : SHED_ACCESS.filter(([id]) => id !== "trailer"))}
        {select("مدت اجاره", "duration", SHED_DURATIONS)}
      </div>
      {value.power === "three" && number("توان برق سه‌فاز موردنیاز (کیلووات، اختیاری)", "powerCapacity", spaceType === "shed" ? "مثلاً ۱۰۰" : "مثلاً ۲۰")}
      <div><strong>امکانات ضروری (اختیاری)</strong><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 10, marginTop: 10 }}>
        {visibleFeatures.map(([id, label]) => <label key={id} style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 500 }}><input type="checkbox" disabled={disabled} checked={(value.features || []).includes(id)} onChange={e => update("features", e.target.checked ? [...(value.features || []), id] : (value.features || []).filter(x => x !== id))}/>{label}</label>)}
      </div></div>
      <label style={labelStyle}>شرایط خاص (اختیاری)<textarea value={value.requirements || ""} maxLength={400} rows={3} disabled={disabled} onChange={e => update("requirements", e.target.value)} placeholder={spaceType === "shed" ? "مثلاً فعالیت شبانه، محدودیت بارگیری یا نصب دستگاه‌های سنگین" : "مثلاً محدودیت صدا، تهویه خاص یا ساعت فعالیت"} style={fieldStyle}/></label>
    </>}
    {error && <span role="alert" style={{ color: "#b42318" }}>{error}</span>}
  </section>;
}
