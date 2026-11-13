import {SHOP_TYPES,SHOP_ACTIVITIES,SHOP_FLOORS,SHOP_LOCATIONS,SHOP_FEATURES} from "../utils/shopRequest.js";
import {SHOP_DEAL_TYPES,SHOP_RIGHTS,formatShopMoneyInput,shopMoneyInputDigits,shopDecimalInput} from "../utils/shopOffer.js";
import {shopRightHint,shopRightMoneyLabel} from "../utils/shopRights.js";
import {SHOP_WANTED_FINANCE_DEFAULT} from "../utils/shopRental.js";
import ParkingRentalFields from "./ParkingRentalFields";
const base={padding:12,border:"1px solid #e7d9cb",borderRadius:12,width:"100%",boxSizing:"border-box",background:"white",font:"inherit"};
const group={display:"grid",gap:6,fontWeight:700,minWidth:0};
const errStyle={color:"#b42318",fontSize:13,fontWeight:700};
export default function ShopRequestFields({value={},onChange,disabled=false,error="",rentalError=""}){
 const update=(key,v)=>onChange({...value,[key]:v});
 const show=(fragment)=>error&&error.includes(fragment);
 const warn=(yes)=>yes?<small role="alert" style={errStyle}>{error}</small>:null;
 const select=(title,key,options,required=false,err=false)=>
  <label style={group}><span>{title}{required&&<b style={{color:"#b42318"}}> *</b>}</span>
   <select style={{...base,border:err?"1px solid #b42318":base.border}} aria-invalid={Boolean(err)} value={value[key]||""} disabled={disabled} onChange={e=>update(key,e.target.value)}>
    <option value="">انتخاب کنید</option>{options.map(([id,text])=><option key={id} value={id}>{text}</option>)}
   </select>{warn(err)}</label>;
 const input=(title,key,placeholder="",money=false,err=false)=><label style={group}>{title}
  <input style={{...base,border:err?"1px solid #b42318":base.border}} aria-invalid={Boolean(err)}
    value={money?formatShopMoneyInput(value[key]):value[key]||""} disabled={disabled}
    onChange={e=>update(key,key==="frontage"?shopDecimalInput(e.target.value):shopMoneyInputDigits(e.target.value))}
    inputMode={key==="frontage"?"decimal":"numeric"} placeholder={placeholder}/>{warn(err)}</label>;
 const mall=["mall","complex"].includes(value.spaceType);
 const rights=value.transferType==="key_money";
 const changeDeal=v=>onChange({...value,transferType:v,...(v==="key_money"?{...SHOP_WANTED_FINANCE_DEFAULT,deposit:"",monthlyRent:""}:{keyMoney:"",rightsType:"",deposit:"",monthlyRent:""})});
 const transferError=show("نوع واگذاری");
 const rightsError=show("نوع حق");
 const typeError=show("نوع فضای تجاری را انتخاب");
 const otherSpaceError=show("نوع فضای تجاری دیگر");
 const activityError=show("نوع فعالیت");
 const otherError=show("فعالیت دیگر");
 const areaError=show("متراژ");
 const frontageError=show("برِ مغازه");
 return <section aria-label="مشخصات و بودجه مغازه موردنیاز" style={{display:"grid",gridColumn:"1 / -1",gap:15,padding:18,border:"1px solid #f0d7c1",borderRadius:16,background:"#fffaf6"}}>
  <div><strong style={{color:"#a94c0c"}}>🏪 فضای تجاری موردنیاز</strong><p style={{margin:"5px 0",fontSize:13,color:"#6d5a50"}}>انتخاب‌های تخصصی را براساس نیاز خودت وارد کن.</p></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",gap:12}}>
   {select("نوع فضای تجاری","spaceType",SHOP_TYPES,true,typeError)}
   {select("نوع فعالیت","activity",SHOP_ACTIVITIES,true,activityError)}
  </div>
  {value.spaceType==="other"&&<label style={group}>شرح نوع فضای تجاری دیگر *<input style={{...base,border:otherSpaceError?"1px solid #b42318":base.border}} aria-invalid={Boolean(otherSpaceError)} disabled={disabled} value={value.otherSpaceType||""} maxLength={160} onChange={e=>update("otherSpaceType",e.target.value)} placeholder="مثلاً فضای خدماتی مستقل"/>{warn(otherSpaceError)}</label>}
  {value.activity==="other"&&<label style={group}>شرح فعالیت دیگر *<input style={base} value={value.otherActivity||""} disabled={disabled} maxLength={100} onChange={e=>update("otherActivity",e.target.value)} placeholder="حداقل ۴ حرف"/>{warn(otherError)}</label>}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:12}}>
   {input("حداقل متراژ (مترمربع، اختیاری)","minArea","مثلاً ۳۰",false,areaError)}
   {input("حداکثر متراژ (مترمربع، اختیاری)","maxArea","مثلاً ۶۰",false,areaError)}
   {select("طبقه موردنظر","floor",SHOP_FLOORS)}
   {select(mall?"موقعیت داخل پاساژ / مجتمع":"موقعیت تجاری","locationPreference",SHOP_LOCATIONS)}
   {!mall&&input("حداقل برِ مغازه (متر، اختیاری)","frontage","مثلاً ۴٫۵",false,frontageError)}
  </div>
  <div><strong>امکانات ضروری (اختیاری)</strong><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:10,marginTop:10}}>
   {SHOP_FEATURES.filter(([id])=>mall||id!=="elevator").map(([id,name])=><label key={id} style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" disabled={disabled} checked={(value.features||[]).includes(id)} onChange={e=>update("features",e.target.checked?[...(value.features||[]),id]:(value.features||[]).filter(x=>x!==id))}/>{name}</label>)}
  </div></div>
  <div style={{borderTop:"1px solid #eadbcd",paddingTop:14,display:"grid",gap:12}}>
   <strong>نوع واگذاری موردنظر</strong>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8}}>
    {SHOP_DEAL_TYPES.map(([id,title])=><label key={id} style={{...group,padding:12,border:`1px solid ${value.transferType===id?"#ef7a25":"#e8d8cb"}`,borderRadius:12,background:value.transferType===id?"#fff0e2":"white"}}><span><input type="radio" name="shop-request-deal" disabled={disabled} checked={value.transferType===id} onChange={()=>changeDeal(id)}/> {title}</span></label>)}
   </div>{warn(transferError)}
   {rights?<>
    {select("عنوان حق مورد درخواست","rightsType",SHOP_RIGHTS,true,rightsError)}
    {value.rightsType&&<small>{shopRightHint(value.rightsType)}</small>}
    {input(`${shopRightMoneyLabel(value.rightsType,true)} (ریال، اختیاری)`,"keyMoney","مبلغ به ریال",true,show("مبلغ بودجه"))}
    <small>حقوق تجاری پیش از معامله باید از نظر وجود حق و اجازه انتقال بررسی شوند؛ مبلغ آن اجاره محسوب نمی‌شود.</small>
   </>:value.transferType==="rent"?<ParkingRentalFields category="shop" value={value} wanted onChange={onChange} disabled={disabled} error={rentalError}/>:null}
  </div>
  <label style={group}>شرایط خاص (اختیاری)<textarea style={base} rows={3} maxLength={500} disabled={disabled} value={value.requirements||""} onChange={e=>update("requirements",e.target.value)} placeholder="مثلاً محدودیت صنفی، پاخور مناسب یا فعالیت شبانه"/>{warn(show("متن شرایط خاص"))}</label>
  {error&&!([typeError,activityError,otherError,areaError,transferError,rightsError,show("مبلغ بودجه"),show("متن شرایط خاص"),otherSpaceError,frontageError].some(Boolean))&&<span role="alert" style={errStyle}>{error}</span>}
 </section>;
}
