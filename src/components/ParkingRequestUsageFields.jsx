import { PARKING_USE_OPTIONS } from "../utils/parkingRequestUsage";

export default function ParkingRequestUsageFields({ usage, otherUsage, onChange, error, disabled = false }) {
  return (
    <div style={{ gridColumn: "1 / -1", padding: "16px", border: "1px solid #f3d7c2", borderRadius: 16, background: "#fffaf5" }}>
      <label style={{ display: "block", fontWeight: 800, marginBottom: 12 }}>پارکینگ را برای چه کاری می‌خواهید؟ <span style={{ color: "#d45b18" }}>*</span></label>
      <div role="radiogroup" aria-label="کاربری موردنظر" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {PARKING_USE_OPTIONS.map((option) => (
          <label key={option.value} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 13px", borderRadius: 12, border: usage === option.value ? "2px solid #ed791c" : "1px solid #e5d7cd", background: usage === option.value ? "#fff0e1" : "#fff", cursor: "pointer" }}>
            <input type="radio" name="parkingRequestUsage" value={option.value} checked={usage === option.value} disabled={disabled} onChange={() => onChange({ usage: option.value, otherUsage: option.value === "other" ? otherUsage : "" })} />
            {option.label}
          </label>
        ))}
      </div>
      {usage === "other" && (
        <div style={{ marginTop: 12 }}>
          <label htmlFor="parkingOtherUsage" style={{ display: "block", marginBottom: 7 }}>کاربری موردنظر را کوتاه توضیح دهید <span style={{ color: "#d45b18" }}>*</span></label>
          <input id="parkingOtherUsage" type="text" value={otherUsage} onChange={(event) => onChange({ usage, otherUsage: event.target.value })} maxLength={90} disabled={disabled} placeholder="مثلاً نگهداری دوچرخه یا وسیله نقلیه خاص" style={{ boxSizing: "border-box", width: "100%", minHeight: 45, padding: "10px 12px", border: "1px solid #dfcfc3", borderRadius: 10, font: "inherit" }} />
        </div>
      )}
      {error && <p role="alert" style={{ color: "#b83220", marginBottom: 0 }}>{error}</p>}
    </div>
  );
}
