import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getWalletBalance, getWalletHistory, getTopupRequests, createTopupRequest, getDemoCreditConfig, creditDemoWallet } from "../services/walletService";
import "./Wallet.css";

const kinds = { topup: "شارژ کیف پول", purchase: "پرداخت خدمات", refund: "بازگشت وجه", admin_adjustment: "اصلاح موجودی" };
function money(value) {
  try { return BigInt(String(value ?? "0")).toLocaleString("fa-IR"); }
  catch { return "—"; }
}
function dateText(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
export default function Wallet() {
  const [balance, setBalance] = useState("0");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [demoReady, setDemoReady] = useState(false);
  const [creditReady, setCreditReady] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupMessage, setTopupMessage] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [b, h] = await Promise.all([getWalletBalance(), getWalletHistory()]);
      setBalance(b.balanceRial);
      setItems(Array.isArray(h.transactions) ? h.transactions : []);
      try {
        const r = await getTopupRequests();
        setRequests(Array.isArray(r.requests) ? r.requests : []);
        setDemoReady(r.demo === true);
        try { const c = await getDemoCreditConfig(); setCreditReady(c.enabled === true && c.demo === true); }
        catch { setCreditReady(false); }
      } catch { setDemoReady(false); setCreditReady(false); setRequests([]); }
    } catch (e) { setError(e?.message || "دریافت کیف پول با خطا مواجه شد."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const formatTopupInput = (value) => {
    const digits = value.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).replace(/[^0-9]/g, "");
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  const submitTopup = async (event) => {
    event.preventDefault(); setTopupMessage("");
    const rawAmount = topupAmount.replace(/,/g, "");
    if (!/^[1-9][0-9]*$/.test(rawAmount)) { setTopupMessage("مبلغ شارژ معتبر وارد کنید."); return; }
    if (BigInt(rawAmount) > 1000000000000n) { setTopupMessage("مبلغ از سقف آزمایشی بیشتر است."); return; }
    setTopupBusy(true);
    try {
      await createTopupRequest(rawAmount, crypto.randomUUID());
      setTopupAmount(""); setTopupMessage("درخواست آزمایشی ثبت شد؛ هیچ پولی جابه‌جا نشده است.");
      await refresh();
    } catch (e) { setTopupMessage(e?.message || "ثبت درخواست ناموفق بود."); }
    finally { setTopupBusy(false); }
  };
  const submitDemoCredit = async () => {
    setTopupMessage("");
    const rawAmount = topupAmount.replace(/,/g, "");
    if (!/^[1-9][0-9]*$/.test(rawAmount) || BigInt(rawAmount) > 100000n) {
      setTopupMessage("برای شارژ فوری آزمایشی، مبلغی بین ۱ تا ۱۰۰٬۰۰۰ ریال وارد کنید."); return;
    }
    setTopupBusy(true);
    try {
      const result = await creditDemoWallet(rawAmount, crypto.randomUUID());
      setTopupMessage(result.applied ? "اعتبار نمایشی به کیف پول تست اضافه شد؛ هیچ وجهی دریافت نشده است." : "این درخواست قبلاً ثبت شده است.");
      setTopupAmount("");
      await refresh();
    } catch (e) { setTopupMessage(e?.message || "شارژ آزمایشی ناموفق بود."); }
    finally { setTopupBusy(false); }
  };
  return (
    <main className="wallet-page" dir="rtl">
      <div className="wallet-top"><div><Link to="/account" className="wallet-back">← بازگشت به حساب من</Link><h1>کیف پول فضاجو</h1><p>موجودی و گردش مالی حساب شما، با اطلاعات مستقیم از سرور</p></div><span className="wallet-mark">فضاجو!</span></div>
      <section className="wallet-balance" aria-label="موجودی کیف پول"><div className="wallet-balance__label">موجودی قابل استفاده</div><div className="wallet-balance__value">{loading ? "در حال دریافت..." : error ? "—" : money(balance)} <small>ریال</small></div><div className="wallet-balance__footer"><span>🔒 اطلاعات حساب شما محرمانه است</span><span>نسخه آزمایشی کیف پول</span></div></section>
      <div className="wallet-actions"><div><strong>افزایش موجودی</strong><p>پس از اتصال درگاه بانکی فعال می‌شود.</p></div><button type="button" disabled title="درگاه پرداخت هنوز متصل نشده است">+ شارژ کیف پول (به‌زودی)</button></div>
      {demoReady && <section className="wallet-topup-demo" aria-label="درخواست شارژ آزمایشی">
        <h2>درخواست شارژ آزمایشی</h2>
        <p>این بخش فقط در دیتابیس آزمایشی فعال است؛ به بانک وصل نمی‌شود. ثبت درخواست معمولی موجودی را افزایش نمی‌دهد؛ شارژ فوری نمایشی فقط در حالت تست مجاز است.</p>
        <form onSubmit={submitTopup} className="wallet-topup-demo__form">
          <label htmlFor="wallet-topup-amount">مبلغ شارژ (ریال)</label>
          <input id="wallet-topup-amount" inputMode="numeric" dir="ltr" value={topupAmount}
            onChange={(e) => setTopupAmount(formatTopupInput(e.target.value))} placeholder="100,000" required />
          <button type="submit" disabled={topupBusy}>{topupBusy ? "در حال ثبت..." : "ثبت درخواست آزمایشی"}</button>
          {creditReady && <button type="button" onClick={submitDemoCredit} disabled={topupBusy} title="فقط دیتابیس آزمایشی؛ بدون پرداخت بانکی">شارژ فوری نمایشی (بدون پول واقعی)</button>}
        </form>
        {topupMessage && <p role="status">{topupMessage}</p>}
        <h3>درخواست‌های اخیر شارژ</h3>
        {requests.length === 0 ? <p>هنوز درخواستی ثبت نشده است.</p> : <div className="wallet-topup-demo__list">{requests.map((r) =>
          <div key={r.id}><strong>{money(r.amountRial)} ریال</strong><span>{r.status === "pending" ? "در انتظار پرداخت" : r.status === "verified" ? "تأییدشده" : r.status === "failed" ? "ناموفق" : "منقضی"}</span><small>{dateText(r.createdAt)}</small></div>
        )}</div>}
      </section>}
      <section className="wallet-history"><div className="wallet-history__head"><div><h2>تاریخچه تراکنش‌ها</h2><p>آخرین ۳۰ تراکنش ثبت‌شده در حساب شما</p></div><button type="button" onClick={refresh} disabled={loading}>↻ بروزرسانی</button></div>
        {error ? <div className="wallet-state wallet-state--error" role="alert">{error}<p>اتصال سرور و اجرای مهاجرت دیتابیس کیف پول را بررسی کنید.</p></div> : loading ? <div className="wallet-state">در حال دریافت تراکنش‌ها...</div> : items.length === 0 ? <div className="wallet-state"><span className="wallet-empty-icon">◌</span><strong>هنوز تراکنشی ثبت نشده است</strong><p>پس از راه‌اندازی خدمات مالی، تراکنش‌ها اینجا نمایش داده می‌شوند.</p></div> : <div className="wallet-transactions">{items.map((t) => <article className="wallet-transaction" key={t.id}><div className={`wallet-transaction__icon ${t.direction === "credit" ? "is-credit" : "is-debit"}`}>{t.direction === "credit" ? "+" : "−"}</div><div className="wallet-transaction__description"><strong>{kinds[t.kind] || "تراکنش کیف پول"}</strong><span>{dateText(t.created_at)}</span></div><div className="wallet-transaction__amount"><strong className={t.direction === "credit" ? "is-credit" : "is-debit"}>{t.direction === "credit" ? "+" : "−"}{money(t.amount_rial)} ریال</strong><span>مانده: {money(t.balance_after_rial)} ریال</span></div></article>)}</div>}
      </section>
      <p className="wallet-disclaimer">توجه: شارژ فوری فقط اعتبار نمایشی در دیتابیس تست ایجاد می‌کند؛ شارژ و پرداخت بانکی واقعی هنوز فعال نیستند.</p>
    </main>
  );
}
