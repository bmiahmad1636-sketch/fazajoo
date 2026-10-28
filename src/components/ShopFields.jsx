import { emptyShopDetails } from "./shopDetails";
import ClimateFields from "./ClimateFields";
import "./ResidentialFields.css";
export default function ShopFields({ value = {}, onChange, disabled = false }) {
  const f = { ...emptyShopDetails, ...value };
  const set = (key, next) => onChange({ ...f, [key]: next });
  return <section className="residential-fields" dir="rtl">
    <div className="residential-fields__head"><span>🏪</span><div><strong>امکانات مغازه</strong><small>انشعابات و تجهیزات واقعی واحد تجاری</small></div></div>
    <div className="residential-fields__grid">
      {[["waterSupply", "وضعیت آب"], ["electricitySupply", "وضعیت برق"]].map(([key, title]) =>
        <label key={key}>{title}<select disabled={disabled} value={f[key]} onChange={e=>set(key,e.target.value)}>
          <option value="">مشخص نشده</option><option value="independent">مستقل</option><option value="shared">مشترک</option><option value="none">ندارد</option>
        </select></label>
      )}
    </div>
    <div className="residential-fields__amenities">
      {[["threePhase","برق سه‌فاز"],["cityGas","گاز شهری"],["landline","تلفن ثابت"],["restroom","سرویس بهداشتی"]].map(([key,title]) =>
        <label key={key}><input type="checkbox" disabled={disabled} checked={!!f[key]} onChange={e=>set(key,e.target.checked)} /><span>✓</span>{title}</label>
      )}
    </div>
    <ClimateFields value={f} onChange={onChange} disabled={disabled} compact />
  </section>;
}
