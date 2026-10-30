import { PARKING_COVERS, PARKING_ACCESS } from "../utils/parkingRequestDetails";
const field = { width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #e8d8cb", borderRadius: 12, background: "white", font: "inherit" };
const label = { display: "grid", gap: 7, fontWeight: 700, minWidth: 0 };
export default function ParkingRequestDetailsFields({ value = {}, onChange, disabled = false, error = "" }) {
 const update = (key, next) => onChange({ ...value, [key]: next });
 return <section style={{ gridColumn: "1 / -1", display: "grid", gap: 15, padding: 18, border: "1px solid #f0d7c1", borderRadius: 16, background: "#fffaf6" }}>
 <strong style={{ color: "#a94c0c" }}>🚘 مشخصات پارکینگ موردنیاز</strong>
 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
 <label style={label}>حداقل متراژ (مترمربع، اختیاری)<input type="number" min="1" value={value.minArea || ""} onChange={e => update("minArea", e.target.value)} disabled={disabled} placeholder="مثلاً ۱۲" style={field}/></label>
 <label style={label}>حداکثر متراژ (مترمربع، اختیاری)<input type="number" min="1" value={value.maxArea || ""} onChange={e => update("maxArea", e.target.value)} disabled={disabled} placeholder="مثلاً ۲۵" style={field}/></label>
 <label style={label}>نوع پارکینگ<select value={value.cover || ""} onChange={e => update("cover", e.target.value)} disabled={disabled} style={field}>{PARKING_COVERS.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>
 <label style={label}>زمان دسترسی<select value={value.access || ""} onChange={e => update("access", e.target.value)} disabled={disabled} style={field}>{PARKING_ACCESS.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>
 </div>
 <label style={label}>شرایط خاص (اختیاری)<textarea rows={3} maxLength={800} value={value.requirements || ""} onChange={e => update("requirements", e.target.value)} disabled={disabled} placeholder="مثلاً مناسب خودروی بزرگ یا نزدیک محل کار" style={field}/></label>
 {error && <span role="alert" style={{ color: "#b42318" }}>{error}</span>}
 </section>;
}
