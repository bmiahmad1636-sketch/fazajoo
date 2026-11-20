/**
 * FAZAJOO DS-02: presentation-only adapter for eight non-industrial categories.
 * No persistence, financial conversion or rental-term mutation happens here.
 * Existing category finance functions supply their own validated visible rows.
 */
import { parkingRentalBadges } from './parkingRental.js';
import { landContractBadges } from './landContract.js';
import { villaRentalBadges } from './villaOffer.js';
import { residentialRentalBadges } from './residentialOffer.js';
import { gardenRentalBadges } from './gardenOffer.js';
import { otherRentalBadges } from './otherOffer.js';
import { formatRialPrice, normalizePriceNumber } from './priceFormatter.js';
import { resolveOtherDemandArt } from './otherDemandArt.js';

export const GENERAL_CATEGORIES = Object.freeze(['parking','storage','shop','land','residential','villa','garden','other']);
export const GENERAL_ART = Object.freeze({
  parking:'/images/fj-demand-parking.svg', storage:'/images/fj-demand-storage.svg',
  shop:'/images/fj-demand-shop.svg', land:'/images/fj-demand-land.svg',
  residential:'/images/fj-demand-residential.svg', villa:'/images/fj-demand-villa.svg',
  garden:'/images/fj-demand-garden.svg', other:'/images/fj-demand-other.svg',
});

const pretty = value => String(value ?? '').trim();
const termNames = {short:'کوتاه‌مدت',long:'بلندمدت',seasonal:'فصلی'};

function chooseBadges(listing, request, termDeclared) {
  const category=listing.category, wanted=listing.listingType==='wanted';
  const attrs=listing.spaceAttributes;
  const values=attrs?.values;
  if(wanted) {
    // Requests have exactly ONE confirmed term, and only when explicitly recorded.
    if (!termDeclared || !request) return [];
    const id=request.rentalTerm;
    if(category==='land') return landContractBadges(request,true)
      .filter(item=>item.state==='requested').slice(0,1);
    if(category==='shop'&&request.transferType==='key_money')return [];
    if(!Object.hasOwn(termNames,id))return [];
    return [{label:termNames[id],term:id,state:'requested'}];
  }
  if(category==='shop'&&values?.transferType==='key_money')return [];
  let badges=[];
  if(['parking','storage','shop'].includes(category))badges=parkingRentalBadges(values,false);
  else if(category==='land')badges=landContractBadges(values,false);
  else if(category==='villa')badges=villaRentalBadges(attrs);
  else if(category==='residential')badges=residentialRentalBadges(attrs);
  else if(category==='garden')badges=gardenRentalBadges(attrs);
  else if(category==='other')badges=otherRentalBadges(attrs);
  // Existing helpers include inactive alternatives for some categories: omit them.
  return badges.filter(x=>x.state==='primary'||x.state==='possible');
}

function normalizeFinance(rows, listing, fallbackText='') {
  const provided=(Array.isArray(rows)?rows:[]).filter(row=>pretty(row?.label)&&pretty(row?.amount))
    .map(row=>({label:pretty(row.label),amount:pretty(row.amount)}));
  if(provided.length)return provided;
  // Preserve genuine legacy price/explicit budget: do not invent a contract period.
  if(pretty(fallbackText))return [{label:listing.listingType==='wanted'?'بودجه':'شرایط مالی',amount:pretty(fallbackText)}];
  const value=normalizePriceNumber(listing.price);
  if(value>0)return [{label:listing.listingType==='wanted'?'بودجه ثبت‌شده':'قیمت ثبت‌شده',amount:formatRialPrice(listing.price,{priceType:listing.priceType||'',fallback:''})}];
  return [];
}

export function getUnifiedCardModel(listing, {
  request=null, termDeclared=false, areaText='', moneyRows=[], fallbackText='', categoryLabel=''
}={}) {
  if(!GENERAL_CATEGORIES.includes(listing?.category)) throw Error('DS-02: unsupported category');
  const wanted=listing.listingType==='wanted';
  const baseTitle=pretty(listing.title) || `${wanted?'درخواست':'عرضه'} ${pretty(categoryLabel)||'فضا'}`;
  const city=pretty(listing.city);
  const title=city && !baseTitle.includes(city) ? `${baseTitle} / ${city}` : baseTitle;
  const numericArea=normalizePriceNumber(listing.area);
  const area=pretty(areaText)|| (numericArea>0?`${numericArea.toLocaleString('fa-IR')} مترمربع`:'');
  const demandArt = wanted && listing.category === 'other' ? resolveOtherDemandArt(listing, request) : null;
  return {
    wanted,title,category:listing.category,categoryLabel:pretty(categoryLabel),
    image:demandArt?.src || GENERAL_ART[listing.category],
    illustrationLabel:demandArt?.label || pretty(categoryLabel),areaText:area,
    status:pretty(listing.status||'active'),
    badges:chooseBadges(listing,request,termDeclared).map(x=>({
      label:pretty(x.label),state:x.state,ticks:wanted?'':x.state==='primary'?'✓✓':x.state==='possible'?'✓':''
    })),
    moneyRows:normalizeFinance(moneyRows,listing,fallbackText)
  };
}

/** Wanted residential finance is not a supply price. Preserve the stored cap and its period. */
export function residentialDemandCardRows(d={}) {
  const val=value=>normalizePriceNumber(value);
  const rial=value=>`${val(value).toLocaleString('fa-IR')} ریال`;
  if(d.rentalTerm==='short'){
    const unit={night:'شبانه',week:'هفتگی',month:'ماهانه (کوتاه‌مدت)'}[d.shortRateUnit];
    return unit&&val(d.shortMaxBudgetRial)>0?[{label:`سقف هزینه ${unit}`,amount:rial(d.shortMaxBudgetRial)}]:[];
  }
  if(d.rentalTerm!=='long')return [];
  return [
    ...(['deposit','both'].includes(d.paymentType)&&val(d.deposit)>0?[{label:'حداکثر ودیعه',amount:rial(d.deposit)}]:[]),
    ...(['rent','both'].includes(d.paymentType)&&val(d.monthlyRent)>0?[{label:'سقف اجاره ماهانه',amount:rial(d.monthlyRent)}]:[])
  ];
}
