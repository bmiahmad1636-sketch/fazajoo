import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {SHOP_RIGHTS,shopRightDealLabel,shopRightMoneyLabel,shopRightHint} from '../src/utils/shopRights.js';
import {shopDecimalInput} from '../src/utils/shopDecimal.js';
import {SHOP_OFFER_DEFAULT,makeShopAttributes,shopFinancialRows,shopFinancialHeadline,validateShopOffer} from '../src/utils/shopOffer.js';
import {EMPTY_SHOP_REQUEST,shopWantedFinancialRows,writeShopRequest,readShopRequest,shopRequestValidation} from '../src/utils/shopRequest.js';
import {validateShopRental} from '../src/utils/shopRental.js';
const require=createRequire(import.meta.url);
const {readWantedShopFinance,validateShopFinance,shopFinancePrice}=require('../backend/src/utils/shopRentalFinance.js');
const {cleanShopSpaceAttributes}=require('../backend/src/utils/shopSpaceAttributes.js');
const source=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');
const bodyBase={...EMPTY_SHOP_REQUEST,spaceType:'street',activity:'clothing',transferType:'rent'};

test('three distinct legal-right previews use the exact selected right; no false rental amount',()=>{
  for(const [rightsType] of SHOP_RIGHTS){
    const offer={...SHOP_OFFER_DEFAULT,spaceType:'street',allowedActivities:['clothing'],transferType:'key_money',rightsType,keyMoneyRial:'190000000'};
    const wanted={...EMPTY_SHOP_REQUEST,spaceType:'street',activity:'clothing',transferType:'key_money',rightsType,keyMoney:'180000000'};
    assert.equal(validateShopOffer(offer),'');
    assert.equal(shopRequestValidation(wanted),'');
    const row=shopFinancialRows(makeShopAttributes(offer));
    const requested=shopWantedFinancialRows(wanted);
    assert.equal(row[0].label,shopRightMoneyLabel(rightsType,false));
    assert.equal(requested[0].label,shopRightMoneyLabel(rightsType,true));
    assert.match(shopFinancialHeadline(makeShopAttributes(offer)),new RegExp(rightsType==='key_money'?'سرقفلی':rightsType==='business_right'?'کسب یا پیشه یا تجارت':'بررسی نوع حق'));
    assert.ok(shopRightDealLabel(rightsType));
    assert.ok(shopRightHint(rightsType));
    assert.equal(readShopRequest(writeShopRequest(wanted)).data.rightsType,rightsType);
  }
  const add=source('src/pages/AddParking.jsx');
  const edit=source('src/pages/EditParking.jsx');
  assert.match(add,/shopRightDealLabel\(form.shopOffer.rightsType\)/);
  assert.match(edit,/shopRightDealLabel\(form.shopOffer.rightsType\)/);
  assert.match(source('src/pages/ParkingDetails.jsx'),/shopRightDealLabel/);
});

test('offer and request shop frontages preserve decimal meter values',()=>{
  for(const [raw,value] of [['4.5','4.5'],['۴٫۵','4.5'],['٤٫٥','4.5'],['4,25','4.25'],['۴٫۵۰','4.50']]){
    assert.equal(shopDecimalInput(raw),value);
    const offer={...SHOP_OFFER_DEFAULT,spaceType:'street',allowedActivities:['clothing'],transferType:'key_money',rightsType:'key_money',frontageM:value};
    assert.equal(makeShopAttributes(offer).values.frontageM,Number(value));
    assert.equal(cleanShopSpaceAttributes(makeShopAttributes(offer),'shop','offer').values.frontageM,Number(value));
    assert.equal(shopRequestValidation({...bodyBase,frontage:value}), '');
    assert.equal(readShopRequest(writeShopRequest({...bodyBase,frontage:value})).data.frontage,value);
  }
  assert.match(shopRequestValidation({...bodyBase,frontage:'0'}),/برِ مغازه/);
  assert.match(shopRequestValidation({...bodyBase,frontage:'1001'}),/برِ مغازه/);
  assert.match(shopRequestValidation({...bodyBase,frontage:'4.256'}),/برِ مغازه/);
  const req=source('src/components/ShopRequestFields.jsx');
  assert.match(req,/key==="frontage"\?shopDecimalInput/);
  assert.match(req,/frontageError/);
  assert.match(source('src/components/ShopOfferFields.jsx'),/shopDecimalInput\(e.target.value\)/);
});

test('all chosen request rental periods remain explicit when metadata is compressed',()=>{
  for(const unit of ['day','week','month']){
    const form={...bodyBase,rentalTerm:'short',shortRateUnit:unit,maxBudgetRial:'17000000'};
    assert.equal(validateShopRental(form,true),'');
    const encoded=writeShopRequest(form),parsed=readWantedShopFinance(encoded);
    assert.equal(parsed.rentalTerm,'short');assert.equal(parsed.shortRateUnit,unit);
    assert.equal(validateShopFinance(parsed,true),'');
    assert.equal(shopFinancePrice(parsed,true).priceType,({day:'daily',week:'weekly',month:'monthly'})[unit]);
  }
  for(const unit of ['month','year']) for(const mode of ['rent_only','deposit_rent','full_deposit']){
    const form={...bodyBase,rentalTerm:'long',longRateUnit:unit,financialMode:mode,maxRentRial: mode==='full_deposit'?'':'26000000',maxDepositRial:mode==='rent_only'?'':'900000000'};
    assert.equal(validateShopRental(form,true),'');
    const encoded=writeShopRequest(form),parsed=readWantedShopFinance(encoded);
    assert.equal(parsed.rentalTerm,'long');assert.equal(parsed.longRateUnit,unit);assert.equal(parsed.financialMode,mode);
    assert.equal(validateShopFinance(parsed,true),'');
    assert.equal(shopFinancePrice(parsed,true).priceType,mode==='full_deposit'?'negotiable':unit==='year'?'yearly':'monthly');
  }
  assert.match(source('src/pages/AddParking.jsx'),/const reason=String\(error\?\.message/);
});
