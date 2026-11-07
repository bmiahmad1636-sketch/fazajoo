import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { otherRequestBudgetRows, otherRequestBudgetText, readOtherRequest, EMPTY_OTHER_REQUEST } from '../src/utils/otherRequest.js';
import { otherFinancialRows, makeOtherAttributes, OTHER_OFFER_DEFAULT } from '../src/utils/otherOffer.js';
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const desired = (overrides = {}) => ({ ...EMPTY_OTHER_REQUEST, rentalTerm: 'long', financialMode: 'deposit_rent', maxDepositRial: '1000000000', maxMonthlyRentRial: '50000000', ...overrides });
test('RT02 final: long-term demand shows deposit and monthly rent as two labelled budget rows', () => {
 const rows = otherRequestBudgetRows(desired());
 assert.deepEqual(rows.map(x=>x.label), ['حداکثر ودیعه','حداکثر اجاره ماهانه']);
 assert.match(rows[0].amount,/۱٬۰۰۰٬۰۰۰٬۰۰۰ ریال/);
 assert.match(rows[1].amount,/۵۰٬۰۰۰٬۰۰۰ ریال/);
 assert.equal(rows.some(row=>row.amount.includes(' • ')),false);
});
test('RT02 final: full deposit is not monthly rent; rent-only is not deposit', () => {
 const full=otherRequestBudgetRows(desired({financialMode:'full_deposit'}));
 const rent=otherRequestBudgetRows(desired({financialMode:'rent_only'}));
 assert.equal(full.length,1); assert.equal(full[0].label,'حداکثر رهن کامل');
 assert.equal(rent.length,1); assert.equal(rent[0].label,'حداکثر اجاره ماهانه');
});
test('RT02 final: short-term demand budget includes the billing period and ceiling', () => {
 const rows=otherRequestBudgetRows(desired({rentalTerm:'short',pricePeriod:'weekly',maxBudget:'70000000'}));
 assert.equal(rows.length,1);assert.match(rows[0].label,/هفتگی/);
 assert.match(rows[0].amount,/۷۰٬۰۰۰٬۰۰۰ ریال/);
 assert.doesNotMatch(rows[0].label,/ماهانه/);
});
test('RT02 final: negotiable terms show only negotiated rows, no invented amounts', () => {
 assert.deepEqual(otherRequestBudgetRows(desired({financialMode:'flexible'})),[{label:'شرایط مالی بلندمدت',amount:'توافقی'}]);
 assert.deepEqual(otherRequestBudgetRows(desired({rentalTerm:'short',pricePeriod:'negotiable'})),[{label:'بودجه کوتاه‌مدت',amount:'توافقی'}]);
});
test('RT02 final: missing ceilings are not interpreted as zero or fabricated prices', () => {
 const rows=otherRequestBudgetRows(desired({maxDepositRial:'',maxMonthlyRentRial:''}));
 assert.deepEqual(rows.map(x=>x.amount),['سقف اعلام نشده','سقف اعلام نشده']);
});
test('RT02 final: historical unknown duration is never treated as short or long', () => {
 assert.deepEqual(otherRequestBudgetRows(EMPTY_OTHER_REQUEST),[]);
 const legacy=readOtherRequest('برای استفاده از یک فضای اشتراکی مناسب نیاز دارم');
 assert.equal(legacy.hasMetadata,false);
 assert.deepEqual(otherRequestBudgetRows(legacy.data),[]);
});
test('RT02 final: owner offer financial rows stay unchanged', () => {
 const offer={...OTHER_OFFER_DEFAULT,usage:'استودیو تولید محتوا',rentalTerm:'short',shortRateUnit:'daily',shortRateRial:'30000000',securityHoldRial:'50000000'};
 const rows=otherFinancialRows(makeOtherAttributes(offer));
 assert.equal(rows.length,2);
 assert.match(rows[0].label,/اجاره/);assert.match(rows[1].label,/ودیعه/);
});
test('RT02 final: detail hero and details summary share the same money component for typed demand', () => {
 const jsx=source('src/pages/ParkingDetails.jsx');
 assert.match(jsx,/const otherWantedPriceRows = otherWantedData \? otherRequestBudgetRows\(otherWantedData\) : \[\]/);
 assert.match(jsx,/<ShopMoneyRows items=\{otherWantedPriceRows\} ariaLabel="بودجه درخواست" \/>/);
 assert.match(jsx,/<ShopMoneyRows items=\{otherWantedPriceRows\} compact ariaLabel="بودجه درخواست" \/>/);
 assert.match(jsx,/otherPriceRows\.length \|\| otherWantedPriceRows\.length/);
 assert.match(jsx,/!otherWantedPriceRows\.length \? \[\["بودجه",otherBudgetText\]\] : \[\]/);
 assert.match(source('src/pages/ParkingDetails.css'),/\.parking-details-hero__price--shop/);
});
test('RT02 final: parking offer edit has its own flow class, wanted and other editors unchanged', () => {
 const jsx=source('src/pages/EditParking.jsx');
 const css=source('src/pages/EditParking.css');
 assert.match(jsx,/parking\?\.category === "parking" && !isWanted \? " edit-parking-page--parking-offer"/);
 assert.match(css,/\.edit-parking-page--parking-offer \.edit-parking-content\s*\{\s*margin-top:\s*22px/);
 assert.match(css,/@media \(max-width: 760px\)[\s\S]*?\.edit-parking-page--parking-offer \.edit-parking-content\s*\{\s*margin-top:\s*16px/);
 assert.match(css,/\.edit-parking-page--wanted \.edit-parking-content/);
});
