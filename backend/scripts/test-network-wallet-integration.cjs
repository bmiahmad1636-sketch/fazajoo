"use strict";
// Integration test; persistent demo entries ONLY in fazajoo_restore_test.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
if (process.env.NODE_ENV === "production" || process.env.DB_NAME !== "fazajoo_restore_test") {
  console.error("STOP: only fazajoo_restore_test and non-production mode are allowed");
  process.exit(1);
}
process.env.NETWORK_CREDIT_TEST_PURCHASE_ENABLED = "true";
process.env.NETWORK_CREDIT_TEST_PRICE_RIAL = "1000"; // test price, NOT commercial price
const { pool } = require("../src/db/pool");
const { purchaseNetworkCredits } = require("../src/services/networkCreditPurchase.service");
let count=0;
function pass(s){count++; console.log("PASS:",s)}
async function main(){
  const db = await pool.query("SELECT current_database() name");
  assert.equal(db.rows[0].name,"fazajoo_restore_test"); pass("actual database guard");
  const u = await pool.query("SELECT id FROM users WHERE is_active=TRUE AND account_type='agent' AND agency_status='approved' ORDER BY id LIMIT 1");
  if (!u.rowCount) throw new Error("TEST_APPROVED_AGENT_REQUIRED: no approved agent in test DB. No test money added.");
  const id=u.rows[0].id;
  const key="network_it_"+crypto.randomUUID();
  await pool.query("INSERT INTO wallet_accounts(user_id) VALUES($1) ON CONFLICT DO NOTHING",[id]);
  const beforeWallet=await pool.query("SELECT balance_rial FROM wallet_accounts WHERE user_id=$1",[id]);
  const before=BigInt(beforeWallet.rows[0].balance_rial);
  // Seed ONLY what is needed; demo credit persists in local test DB and is auditable.
  const seed = before < 2000n ? 2000n-before : 0n;
  if(seed){
    const c=await pool.connect();
    try {
      await c.query("BEGIN");
      const w=await c.query("SELECT balance_rial FROM wallet_accounts WHERE user_id=$1 FOR UPDATE",[id]);
      const current=BigInt(w.rows[0].balance_rial);
      const extra=current<2000n?2000n-current:0n;
      if(extra){
        const next=current+extra;
        await c.query("UPDATE wallet_accounts SET balance_rial=$2,updated_at=NOW() WHERE user_id=$1",[id,next.toString()]);
        await c.query(`INSERT INTO wallet_transactions(id,user_id,wallet_user_id,kind,direction,amount_rial,balance_after_rial,idempotency_key,reference_type,reference_id,note) VALUES($1,$2,$2,'topup','credit',$3,$4,$5,'integration_test',$6,'اعتبار آزمایشی تست خرید سهمیه')`,[crypto.randomUUID(),id,extra.toString(),next.toString(),"network-test-seed:"+key,key]);
      }
      await c.query("COMMIT");
    } catch(e){await c.query("ROLLBACK").catch(()=>{});throw e}finally{c.release()}
  }
  pass("demo balance prepared and journaled");
  const q0=await pool.query("SELECT paid_remaining FROM agency_network_credits WHERE user_id=$1",[id]);
  const quotaBefore=Number(q0.rows[0]?.paid_remaining||0);
  const w0=await pool.query("SELECT balance_rial FROM wallet_accounts WHERE user_id=$1",[id]);
  const balanceBefore=BigInt(w0.rows[0].balance_rial);
  const result=await purchaseNetworkCredits({userId:id,quantity:2,idempotencyKey:key});
  assert.equal(result.purchased,true); pass("purchase succeeded");
  const w1=await pool.query("SELECT balance_rial FROM wallet_accounts WHERE user_id=$1",[id]);
  assert.equal(balanceBefore-BigInt(w1.rows[0].balance_rial),2000n);pass("exact debit of 2000 test rials");
  const q1=await pool.query("SELECT paid_remaining FROM agency_network_credits WHERE user_id=$1",[id]);
  assert.equal(Number(q1.rows[0].paid_remaining)-quotaBefore,2);pass("exact quota increment of 2");
  const tx=await pool.query("SELECT COUNT(*)::int n FROM wallet_transactions WHERE idempotency_key=$1",["network-purchase:"+key]);
  assert.equal(tx.rows[0].n,1);pass("single purchase journal entry");
  const repeat=await purchaseNetworkCredits({userId:id,quantity:2,idempotencyKey:key});
  assert.equal(repeat.alreadyPurchased,true);pass("replay detected");
  const w2=await pool.query("SELECT balance_rial FROM wallet_accounts WHERE user_id=$1",[id]);
  const q2=await pool.query("SELECT paid_remaining FROM agency_network_credits WHERE user_id=$1",[id]);
  assert.equal(w2.rows[0].balance_rial,w1.rows[0].balance_rial);
  assert.equal(q2.rows[0].paid_remaining,q1.rows[0].paid_remaining);pass("replay changed neither balance nor quota");
  await assert.rejects(purchaseNetworkCredits({userId:id,quantity:3,idempotencyKey:key}),e=>e.status===409);pass("conflicting replay rejected");
  console.log(`Network wallet integration: ${count}/9 PASS (LOCAL TEST DB ONLY)`);
  console.log("NOTE: demo seed, purchase and quota changes remain in the local test database.");
}
main().catch(e=>{console.error("FAILED:",e.stack||e.message);process.exitCode=1}).finally(()=>pool.end());
