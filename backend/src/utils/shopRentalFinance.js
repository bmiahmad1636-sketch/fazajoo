"use strict";
/** F5-04 uses RT-00 shop periods via the existing parking finance sanitizer. */
const policy=require("../../../shared/rental-term-policy.v1.json");
const {cleanParkingFinance,validateParkingFinance,parkingFinancePrice}=require("./parkingRentalFinance");
const options=policy.categories.shop.rateUnitsByTerm;
function cleanShopFinance(v,wanted=false){return cleanParkingFinance(v,wanted,"shop");}
function validateShopFinance(raw,wanted=false){
 const v=cleanShopFinance(raw,wanted);
 if(!["short","long"].includes(v.rentalTerm))return "مدت اصلی اجاره مغازه را انتخاب کنید.";
 if(v.rentalTerm==="short"&&!options.short.includes(v.shortRateUnit))return "دوره کوتاه‌مدت مغازه معتبر نیست.";
 if(v.rentalTerm==="long"&&!options.long.includes(v.longRateUnit))return "دوره بلندمدت مغازه معتبر نیست.";
 const msg=validateParkingFinance(raw,wanted,"shop");
 return msg?msg.replaceAll("پارکینگ","مغازه"):"";
}
function shopFinancePrice(v,wanted=false){return validateShopFinance(v,wanted)?{price:"",priceType:"negotiable"}:parkingFinancePrice(v,wanted,"shop");}
function readWantedShopFinance(description){
 const m=String(description||"").match(/^\[FAZAJOO_SHOP_REQUEST:([^\]\n]+)\]/);
 if(!m)return null;
 try{const v=JSON.parse(decodeURIComponent(m[1]));return v&&typeof v==="object"&&!Array.isArray(v)?v:null;}catch{return null;}
}
module.exports={cleanShopFinance,validateShopFinance,shopFinancePrice,readWantedShopFinance};
