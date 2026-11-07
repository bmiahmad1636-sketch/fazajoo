import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readOtherRequest,writeOtherRequest,validateOtherRequest,EMPTY_OTHER_REQUEST} from '../src/utils/otherRequest.js';
import {OTHER_OFFER_DEFAULT,otherOfferErrorField,validateOtherOffer,makeOtherAttributes,otherFinancialHeadline} from '../src/utils/otherOffer.js';
const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const wanted = { ...EMPTY_OTHER_REQUEST, requestText:'برای تمرین و ضبط صدا یک فضای ساکت و مستقل می‌خواهم'};
const offer={...OTHER_OFFER_DEFAULT,usage:'ضبط محتوای صوتی و ویدیویی',layout:'indoor',rentalTerm:'short',shortRateUnit:'daily',shortRateRial:'35000000'};

test('RT02UX demand UI offers exactly short and long duration, not negotiable term',()=>{
 const jsx=source('src/components/OtherRequestFields.jsx');
 assert.match(jsx,/"short","کوتاه‌مدت/);
 assert.match(jsx,/"long","بلندمدت/);
 assert.doesNotMatch(jsx,/مدت قابل مذاکره/);
 assert.match(validateOtherRequest({...wanted,rentalTerm:'flexible'}),/نوع مدت/);
 assert.equal(validateOtherRequest({...wanted,rentalTerm:'short',pricePeriod:'negotiable'}),'');
 assert.equal(validateOtherRequest({...wanted,rentalTerm:'long',financialMode:'flexible'}),'');
});
test('RT02UX historic flexible demand stays unknown until user chooses, never guesses a term',()=>{
 const old='[FAZAJOO_OTHER_WANTED:'+encodeURIComponent(JSON.stringify({...wanted,rentalTerm:'flexible',duration:'flexible'}))+']';
 assert.equal(readOtherRequest(old).data.rentalTerm,'');
 assert.equal(readOtherRequest(writeOtherRequest({...wanted,rentalTerm:'flexible'})).data.rentalTerm,'');
 assert.match(validateOtherRequest(readOtherRequest(old).data),/نوع مدت/);
 assert.equal(readOtherRequest(writeOtherRequest({...wanted,rentalTerm:'long'})).data.rentalTerm,'long');
});
test('RT02UX owner consent labels spell out the alternative short/long term',()=>{
 const jsx=source('src/components/OtherOfferFields.jsx');
 assert.match(jsx,/اگر متقاضی اجاره بلندمدت بخواهد/);
 assert.match(jsx,/اگر متقاضی اجاره کوتاه‌مدت بخواهد/);
 assert.doesNotMatch(jsx,/مدت مقابل/);
});
test('RT02UX user-facing last step acknowledges first-step finance on both sides',()=>{
 const add=source('src/pages/AddParking.jsx');
 assert.match(add,/مدت اجاره و بودجه در مرحله اول ثبت شده‌اند/);
 assert.match(add,/مبلغ و شرایط قرارداد در مرحله اول ثبت شده‌اند/);
 assert.match(add,/اطلاعات تماس و بررسی نهایی/);
});
test('RT02UX edit custom space name is inside card body before title for both offer/wanted',()=>{
 const jsx=source('src/pages/EditParking.jsx');
 const inside=jsx.slice(jsx.indexOf('<div className="edit-parking-card__body">'));
 assert.ok(inside.indexOf('id="other-edit-name"')>=0);
 assert.ok(inside.indexOf('id="other-edit-name"')<inside.indexOf('htmlFor="title"'));
 assert.match(inside,/isWanted \? "نام فضای موردنیاز" : "نام فضای قابل واگذاری"/);
 assert.equal(jsx.match(/id="other-edit-name"/g)?.length,1);
});
test('RT02UX add validation routes name only to inline customCategory, minimum three chars',()=>{
 const jsx=source('src/pages/AddParking.jsx');
 assert.match(jsx,/نام فضای قابل واگذاری را با حداقل ۳ نویسه وارد کنید/);
 assert.match(jsx,/نام فضای موردنیاز را با حداقل ۳ نویسه وارد کنید/);
 assert.match(jsx,/if \(!newErrors\.customCategory && !newErrors\.area\)/);
 assert.match(jsx,/errors\.customCategory && \(/);
});
test('RT02UX error classifiers point to actual fields, never duplicate generic footer',()=>{
 assert.equal(otherOfferErrorField(validateOtherOffer({...offer,usage:''},75,'استودیو')),'usage');
 assert.equal(otherOfferErrorField(validateOtherOffer({...offer,layout:''},75,'استودیو')),'layout');
 assert.equal(otherOfferErrorField(validateOtherOffer({...offer,rentalTerm:''},75,'استودیو')),'rentalTerm');
 assert.equal(otherOfferErrorField(validateOtherOffer({...offer,shortRateRial:''},75,'استودیو')),'shortRateRial');
 const jsx=source('src/components/OtherOfferFields.jsx');
 assert.match(jsx,/inlineError\("usage"\)/);
 assert.match(jsx,/inlineError\("rentalTerm"\)/);
 assert.doesNotMatch(jsx,/\{error&&<p role="alert"/);
 assert.match(source('src/components/OtherSpaceFields.css'),/aria-invalid="true"/);
});
test('RT02UX active short/long finance remains unchanged after copy and error layout changes',()=>{
 assert.equal(otherFinancialHeadline(makeOtherAttributes(offer)).includes('روزانه'),true);
 const long={...offer,rentalTerm:'long',financialMode:'full_deposit',longDepositRial:'3000000000'};
 const headline=otherFinancialHeadline(makeOtherAttributes(long));
 assert.match(headline,/رهن کامل/);
 assert.doesNotMatch(headline,/اجاره ماهانه/);
});
