import { emptyVillaDetails } from "./villaDetails";
import ClimateFields from "./ClimateFields";
import {VILLA_OFFER_EXTRAS} from "../utils/villaOffer";

const money=value=>String(value??"").replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,",");
export default function VillaFields({ value={},onChange,disabled=false,rentalTerm="short",extraFeatures=[],onExtraChange }){
 const form={...emptyVillaDetails,...value};
 const set=(key,next)=>onChange({...form,[key]:next});
 const short=rentalTerm!=="long";
 const amenities=[["pool","استخر"],["heatedPool","استخر آب‌گرم"],["parking","پارکینگ"],["yard","حیاط"],["furnished","مبله"],["barbecue","باربیکیو"],["wifi","اینترنت / وای‌فای"],["petFriendly","پذیرش حیوان خانگی"]];
 return <div className="fj-villa-inline" dir="rtl">
  <div className="fj-vo__header"><span>🏠</span><div><strong>مشخصات اصلی ملک</strong><p>موارد واقعی و ضروری را وارد کن.</p></div></div>
  <div className="fj-vo__grid">
   <label><b>تعداد اتاق‌خواب</b><input type="number" min="0" max="30" disabled={disabled} value={form.bedrooms} onChange={e=>set("bedrooms",e.target.value)} placeholder="مثلاً ۳"/></label>
   <label><b>{short?"ظرفیت مهمان (نفر) *":"ظرفیت ملک (اختیاری)"}</b><input type="number" min="1" max="100" disabled={disabled} value={form.capacity} onChange={e=>set("capacity",e.target.value)} placeholder="مثلاً ۸"/></label>
   {short&&<label><b>هزینه هر نفر اضافه (ریال)</b><input inputMode="numeric" disabled={disabled} value={money(form.extraGuestPrice)} onChange={e=>set("extraGuestPrice",e.target.value.replace(/\D/g,"").slice(0,15))}/></label>}
  </div>
  <details className="fj-vo__extra"><summary>🌿 امکانات و ویژگی‌های ملک <span>اختیاری</span></summary><div className="fj-vo__extra-body"><div className="fj-vo__checks">{amenities.map(([key,label])=><label key={key} className={form[key]?"is-selected":""}><input type="checkbox" disabled={disabled} checked={Boolean(form[key])} onChange={e=>set(key,e.target.checked)}/>{label}</label>)}</div><div className="fj-vo__checks">{VILLA_OFFER_EXTRAS.map(([id,label])=><label key={id} className={extraFeatures.includes(id)?"is-selected":""}><input type="checkbox" disabled={disabled} checked={extraFeatures.includes(id)} onChange={e=>onExtraChange?.(id,e.target.checked)}/>{label}</label>)}</div></div></details>
  <details className="fj-vo__extra"><summary>🌡️ سرمایش و گرمایش <span>اختیاری</span></summary><div className="fj-vo__extra-body"><ClimateFields value={form} onChange={onChange} disabled={disabled}/></div></details>
  {short&&<details className="fj-vo__extra"><summary>🕓 شرایط حضور و دسترسی گردشگری <span>اختیاری</span></summary><div className="fj-vo__extra-body"><div className="fj-vo__grid">
   <label><b>ساعت تحویل اقامتگاه</b><input type="time" disabled={disabled} value={form.checkInTime} onChange={e=>set("checkInTime",e.target.value)}/></label>
   <label><b>ساعت تخلیه اقامتگاه</b><input type="time" disabled={disabled} value={form.checkOutTime} onChange={e=>set("checkOutTime",e.target.value)}/></label>
   <label><b>فاصله تا دریا</b><input disabled={disabled} maxLength={120} value={form.distanceToSea} onChange={e=>set("distanceToSea",e.target.value)} placeholder="مثلاً ۲ کیلومتر"/></label>
   <label><b>فاصله تا جنگل</b><input disabled={disabled} maxLength={120} value={form.distanceToForest} onChange={e=>set("distanceToForest",e.target.value)} placeholder="مثلاً ۱۰ دقیقه"/></label>
  </div></div></details>}
  <details className="fj-vo__extra"><summary>📜 قوانین و شرایط ملک <span>اختیاری</span></summary><div className="fj-vo__extra-body"><textarea rows={3} maxLength={2000} disabled={disabled} value={form.houseRules} onChange={e=>set("houseRules",e.target.value)} placeholder="قوانین اقامت یا شرایط سکونت و تحویل"/></div></details>
 </div>;
}
