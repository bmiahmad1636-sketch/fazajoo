"use strict";
// Local-only, explicit-price wallet purchase of agent network credits.
// All financial and quota writes share ONE PostgreSQL transaction.
const crypto = require("node:crypto");
const { pool } = require("../db/pool");
const { ensureNetworkOpportunitySchema } = require("./networkOpportunity.service");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,160}$/;
const MAX_RIAL = 9223372036854775807n;

function getConfig() {
  // Deliberate safety gate: NEVER enabled in production by this package.
  const enabled = process.env.NODE_ENV !== "production" &&
    process.env.DB_NAME === "fazajoo_restore_test" &&
    process.env.NETWORK_CREDIT_TEST_PURCHASE_ENABLED === "true";
  const raw = process.env.NETWORK_CREDIT_TEST_PRICE_RIAL || "";
  const price = /^[1-9][0-9]*$/.test(raw) ? BigInt(raw) : 0n;
  return { enabled: enabled && price > 0n && price <= MAX_RIAL, unitPriceRial: price.toString(), demo: true };
}
function validateInput({ userId, quantity, idempotencyKey }) {
  if (!UUID.test(String(userId))) throw new Error("INVALID_USER");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error("INVALID_QUANTITY");
  if (typeof idempotencyKey !== "string" || !KEY.test(idempotencyKey)) throw new Error("INVALID_IDEMPOTENCY_KEY");
  return { userId, quantity, idempotencyKey };
}
function httpError(message, status) { const e = new Error(message);e.status=status;return e; }
async function purchaseNetworkCredits(input) {
  const { userId, quantity, idempotencyKey } = validateInput(input);
  const cfg = getConfig();
  if (!cfg.enabled) throw httpError("خرید آزمایشی سهمیه غیرفعال است.", 403);
  const total = BigInt(cfg.unitPriceRial) * BigInt(quantity);
  if (total > MAX_RIAL) throw httpError("مبلغ بیش از سقف مجاز است.", 400);
  await ensureNetworkOpportunitySchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Lock per idempotency key to make retries deterministic.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", ["network-purchase:"+idempotencyKey]);
    const old = await client.query("SELECT * FROM wallet_transactions WHERE idempotency_key=$1", ["network-purchase:"+idempotencyKey]);
    if (old.rowCount) {
      const r=old.rows[0];
      if (r.user_id!==userId || r.kind!=="purchase" || r.direction!=="debit" || String(r.amount_rial)!==total.toString() || r.reference_type!=="agency_network_credits" || r.reference_id!==String(quantity)) {
        throw httpError("این شناسه قبلاً برای خرید متفاوتی استفاده شده است.",409);
      }
      await client.query("COMMIT");
      return { purchased:false, alreadyPurchased:true, quantity, totalRial:total.toString(), balanceRial:String(r.balance_after_rial) };
    }
    const user=await client.query("SELECT id FROM users WHERE id=$1 AND is_active=TRUE AND account_type='agent' AND agency_status='approved'",[userId]);
    if (!user.rowCount) throw httpError("خرید سهمیه فقط برای مشاور تأییدشده مجاز است.",403);
    await client.query("INSERT INTO agency_network_credits(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING",[userId]);
    // Same lock order for every purchase: quota first, then wallet.
    const quota=await client.query("SELECT paid_remaining FROM agency_network_credits WHERE user_id=$1 FOR UPDATE",[userId]);
    if (Number(quota.rows[0].paid_remaining)+quantity>100000) throw httpError("سقف سهمیه مجاز تکمیل است.",409);
    await client.query("INSERT INTO wallet_accounts(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING",[userId]);
    const wallet=await client.query("SELECT balance_rial FROM wallet_accounts WHERE user_id=$1 FOR UPDATE",[userId]);
    const balance=BigInt(wallet.rows[0].balance_rial);
    if(balance<total) throw httpError("موجودی کیف پول کافی نیست.",402);
    const after=balance-total;
    await client.query("UPDATE wallet_accounts SET balance_rial=$2,updated_at=NOW() WHERE user_id=$1",[userId,after.toString()]);
    await client.query(`INSERT INTO wallet_transactions
      (id,user_id,wallet_user_id,kind,direction,amount_rial,balance_after_rial,idempotency_key,reference_type,reference_id,note)
      VALUES($1,$2,$2,'purchase','debit',$3,$4,$5,'agency_network_credits',$6,$7)`,
      [crypto.randomUUID(),userId,total.toString(),after.toString(),"network-purchase:"+idempotencyKey,String(quantity),"خرید آزمایشی سهمیه فرصت شبکه"]);
    await client.query("UPDATE agency_network_credits SET paid_remaining=paid_remaining+$2,updated_at=NOW() WHERE user_id=$1",[userId,quantity]);
    await client.query("COMMIT");
    return { purchased:true, alreadyPurchased:false, quantity, totalRial:total.toString(), balanceRial:after.toString() };
  } catch(error) { await client.query("ROLLBACK").catch(()=>{});throw error; }
  finally { client.release(); }
}
module.exports={ getConfig, validateInput, purchaseNetworkCredits };
