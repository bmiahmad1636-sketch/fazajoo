// Read-only presentation adapter: use the same category-specific finance helpers as ParkingCard.
import { formatRialPrice } from './priceFormatter.js';
import { readParkingRequestDetails } from './parkingRequestDetails.js';
import { parkingMoneyRows } from './parkingRental.js';
import { readWarehouseRequest, storageRequestAreaText } from './warehouseRequest.js';
import { storageMoneyRows } from './storageRental.js';
import { readShedRequest, shedRequestAreaText } from './shedRequest.js';
import { industrialMoneyRows } from './industrialRental.js';
import { readShopRequest, shopRequestAreaText, shopWantedFinancialRows } from './shopRequest.js';
import { readLandRental } from './landRental.js';
import { displayedSpaceArea } from './displayedSpaceArea.js';
import { landContractMoneyRows } from './landContract.js';
import { readResidentialRequest, residentialRequestAreaText, residentialRequestBudgetText } from './residentialRequest.js';
import { readVillaRequest, villaRequestAreaText, villaRequestBudgetText } from './villaRequest.js';
import { readGardenRequest, gardenRequestAreaText, gardenRequestBudgetText, gardenRequestLabel, GARDEN_REQUEST_PURPOSES } from './gardenRequest.js';
import { readOtherRequest, otherRequestAreaText, otherRequestBudgetText } from './otherRequest.js';
const money = rows => rows.map(row => `${row.label}: ${row.amount}`).join(' • ');
const readable = value => typeof value === 'string' && !/^\s*\[FAZAJOO_/i.test(value) ? value.trim() : '';
export function agencyRequestSummary(request) {
  const text = String(request.description || '');
  let area = Number(request.area)>0 ? `${Number(request.area).toLocaleString('fa-IR')} مترمربع` : '';
  let budget = formatRialPrice(request.price,{priceType:request.priceType || '',fallback:'بودجه اعلام نشده'});
  let description = readable(text), parsed, areaFn, budgetFn;
  switch (request.category) {
    case 'parking': parsed=readParkingRequestDetails(text); areaFn=storageRequestAreaText; budgetFn=d=>money(parkingMoneyRows(d,true)); break;
    case 'storage': parsed=readWarehouseRequest(text); areaFn=storageRequestAreaText; budgetFn=d=>money(storageMoneyRows(d,true)); break;
    case 'warehouse': parsed=readShedRequest(text); areaFn=shedRequestAreaText; budgetFn=d=>money(industrialMoneyRows(d,true)); break;
    case 'shop': parsed=readShopRequest(text); parsed.hasMetadata=text.startsWith('[FAZAJOO_SHOP_REQUEST:'); areaFn=shopRequestAreaText; budgetFn=d=>money(shopWantedFinancialRows(d)); break;
    case 'land': parsed=readLandRental(text); areaFn=()=>displayedSpaceArea({...request,area:null}); budgetFn=d=>money(landContractMoneyRows(d,true)); break;
    case 'residential': parsed=readResidentialRequest(text); areaFn=residentialRequestAreaText; budgetFn=residentialRequestBudgetText; break;
    case 'villa': parsed=readVillaRequest(text); areaFn=villaRequestAreaText; budgetFn=villaRequestBudgetText; break;
    case 'garden': parsed=readGardenRequest(text); areaFn=gardenRequestAreaText; budgetFn=gardenRequestBudgetText; break;
    case 'other': parsed=readOtherRequest(text,request.area,request.price,request.priceType); areaFn=otherRequestAreaText; budgetFn=otherRequestBudgetText; break;
    default: break;
  }
  if (parsed?.hasMetadata) {
    const d=parsed.data;
    area=areaFn(d) || 'متراژ اعلام نشده';
    budget=budgetFn(d) || 'شرایط مالی در جزئیات درخواست';
    const notes=[d.requestText,d.requirements,parsed.description];
    if(request.category==='garden') notes.unshift(d.purpose==='other'?d.otherPurpose:gardenRequestLabel(GARDEN_REQUEST_PURPOSES,d.purpose));
    description=[...new Set(notes.map(readable).filter(Boolean))].join(' • ');
  } else if (parsed) {
    description=readable(parsed.description) || description;
  }
  return {area,budget,description};
}
