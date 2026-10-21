"use strict";
const assert=require("node:assert/strict");
// This test has no database writes, HTTP calls, or real payment actions.
const { getConfig,validateInput,purchaseNetworkCredits }=require("../src/services/networkCreditPurchase.service");
const id="11111111-1111-4111-8111-111111111111";
async function main(){
  const prev={...process.env};
  try{
    delete process.env.NETWORK_CREDIT_TEST_PURCHASE_ENABLED;
    process.env.DB_NAME="fazajoo_restore_test";
    process.env.NETWORK_CREDIT_TEST_PRICE_RIAL="10000";
    assert.equal(getConfig().enabled,false);console.log("PASS: disabled by default");
    process.env.NETWORK_CREDIT_TEST_PURCHASE_ENABLED="true";
    process.env.DB_NAME="fazajoo";
    assert.equal(getConfig().enabled,false);console.log("PASS: primary DB blocked");
    process.env.DB_NAME="fazajoo_restore_test";
    process.env.NODE_ENV="production";
    assert.equal(getConfig().enabled,false);console.log("PASS: production blocked");
    process.env.NODE_ENV="development";
    process.env.NETWORK_CREDIT_TEST_PRICE_RIAL="";
    assert.equal(getConfig().enabled,false);console.log("PASS: missing price blocked");
    process.env.NETWORK_CREDIT_TEST_PRICE_RIAL="10000";
    assert.equal(getConfig().enabled,true);console.log("PASS: explicit test price and local gate");
    assert.throws(()=>validateInput({userId:id,quantity:0,idempotencyKey:"abcdefgh"}),/INVALID_QUANTITY/);
    assert.throws(()=>validateInput({userId:id,quantity:101,idempotencyKey:"abcdefgh"}),/INVALID_QUANTITY/);
    console.log("PASS: quantity limits");
    assert.throws(()=>validateInput({userId:id,quantity:1,idempotencyKey:"x"}),/INVALID_IDEMPOTENCY_KEY/);
    console.log("PASS: idempotency key validation");
    assert.throws(()=>validateInput({userId:"bad",quantity:1,idempotencyKey:"abcdefgh"}),/INVALID_USER/);
    console.log("PASS: user ID validation");
    delete process.env.NETWORK_CREDIT_TEST_PURCHASE_ENABLED;
    await assert.rejects(purchaseNetworkCredits({userId:id,quantity:1,idempotencyKey:"abcdefgh"}),/غیرفعال/);
    console.log("PASS: disabled purchase rejected before DB access");
    console.log("Stage purchase safety: 9/9 PASS (offline; integration pending)");
  } finally { for(const key of ["DB_NAME","NODE_ENV","NETWORK_CREDIT_TEST_PURCHASE_ENABLED","NETWORK_CREDIT_TEST_PRICE_RIAL"]) { if(prev[key]===undefined) delete process.env[key];else process.env[key]=prev[key]; } }
}
main().catch(e=>{console.error(e);process.exitCode=1});
