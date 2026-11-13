/** Preserve up to two decimal places for shop frontage, including Persian decimal marks. */
export function shopDecimalInput(v){
 const raw=String(v??"").replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
   .replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
   .replace(/[٫,،]/g,".").replace(/[^0-9.]/g,"");
 const [whole,...fraction]=raw.split(".");
 return raw.includes(".")?`${whole.slice(0,4)}.${fraction.join("").slice(0,2)}`:whole.slice(0,4);
}
