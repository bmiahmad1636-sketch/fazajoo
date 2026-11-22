import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { showInSiteConfirm } from "../utils/inSiteDialog";
import {
  getFeaturedAdmin, saveFeaturedSettings, createFeaturedBooking, cancelFeaturedBooking, findFeaturedOwnerSpaces,
} from "../services/featuredShowcaseService";
import { rialDigits, rialGrouped, rialText } from "../utils/featuredMoneyHP04";
import "./FeaturedShowcaseAdmin.css";

const dateText = (value) => value ? new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",timeStyle: "short",timeZone:"Asia/Tehran",
}).format(new Date(value)) : "—";
const statusText = {active:"در حال نمایش چرخشی",queued:"در صف انتظار",expired:"پایان‌یافته",cancelled:"لغوشده"};
const currency = (n) => rialText(n);

function RialInput({ label, value, onChange, required = false }) {
  return <label>{label}<div className="hp04-admin__money">
    <input required={required} type="text" inputMode="numeric" dir="ltr"
      autoComplete="off" value={rialGrouped(value)} onChange={event => onChange(rialDigits(event.target.value))}
      aria-label={label} placeholder="0" />
    <span aria-hidden="true">ریال</span>
  </div></label>;
}
function ListingPhoto({ space }) {
  const [failed,setFailed] = useState(false);
  return <div className="hp04-admin__thumb">
    {space.imageUrl && !failed
      ? <img src={space.imageUrl} alt={`عکس اصلی ${space.title}`} loading="lazy" onError={() => setFailed(true)} />
      : <div className="hp04-admin__thumb-fallback" aria-label="آگهی بدون تصویر">بدون تصویر</div>}
    {space.imageCount > 1 && <span className="hp04-admin__image-count">{space.imageCount.toLocaleString("fa-IR")} عکس</span>}
  </div>;
}

export default function FeaturedShowcaseAdmin() {
  const [data,setData] = useState(null);
  const [lookup,setLookup] = useState({phone:"",search:""});
  const [ownerResults,setOwnerResults] = useState(null);
  const [ownerBusy,setOwnerBusy] = useState(false);
  const [ownerError,setOwnerError] = useState("");
  const [selectedSpace,setSelectedSpace] = useState(null);
  const lookupRun = useRef(0);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  const [settings,setSettings] = useState({enabled:false,capacity:20,rotationMinutes:5,packagePriceRials:"0"});
  const [booking,setBooking] = useState({spaceId:"",paymentMode:"complimentary",paymentReference:"",amountRials:"0",note:""});
  const [manualConfirmed,setManualConfirmed] = useState(false);

  async function refresh() {
    const results = await getFeaturedAdmin();
    setData(results);
    setSettings(results.settings);
  }
  useEffect(() => {
    let alive = true;
    getFeaturedAdmin().then((results) => {
      if (!alive) return;
      setData(results);setSettings(results.settings);
    }).catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  async function run(task, message) {
    setBusy(true);setError("");setSuccess("");
    try {
      await task();await refresh();setSuccess(message);return true;
    } catch (err) {
      setError(err.message);return false;
    } finally { setBusy(false); }
  }

  async function submitSettings(event) {
    event.preventDefault();
    await run(() => saveFeaturedSettings({
      enabled:Boolean(settings.enabled),capacity:Number(settings.capacity),
      rotationMinutes:Number(settings.rotationMinutes),packagePriceRials:rialDigits(settings.packagePriceRials),
    }),"تنظیمات ویترین ذخیره شد.");
  }
  async function submitBooking(event) {
    event.preventDefault();
    if (booking.paymentMode === "manual_verified" && !manualConfirmed) {
      setError("ابتدا تأیید کن که دریافت وجه را مستقل از سامانه بررسی کرده‌ای.");return;
    }
    if (!selectedSpace || selectedSpace.id !== booking.spaceId || !ownerResults?.ownerFound) {
      setError("ابتدا صاحب حساب را جست‌وجو کن و آگهی را از کارت تصویردار انتخاب کن.");return;
    }
    const okay = await showInSiteConfirm(`آگهی «${selectedSpace.title}» از شهر «${selectedSpace.city}» به ویترین فعال یا صف آن افزوده شود؟ شروع ۷۲ ساعت هنگام فعال‌سازی خواهد بود.`);
    if (!okay) return;
    const completed = await run(() => createFeaturedBooking({...booking,ownerPhone:lookup.phone,amountRials:rialDigits(booking.amountRials)}),"جایگاه ثبت شد؛ وضعیت فعال یا صف را در جدول ببین.");
    if (completed) {
      setOwnerResults(prev => prev ? {...prev, spaces:prev.spaces.filter(item => item.id !== booking.spaceId)} : prev);
      setSelectedSpace(null);
      setBooking(prev => ({...prev,spaceId:""}));
      setManualConfirmed(false);
    }
  }
  function editLookup(field,value) {
    lookupRun.current += 1; // Invalidates any old response when the owner/search changes.
    setLookup(prev => ({...prev,[field]:value}));
    setOwnerResults(null);setOwnerBusy(false);setOwnerError("");setSelectedSpace(null);
    setBooking(prev => ({...prev,spaceId:""}));
  }
  async function findOwner(offset = 0) {
    const requestId = ++lookupRun.current;
    const phone = lookup.phone.trim();
    setOwnerBusy(true);setOwnerError("");
    try {
      const found = await findFeaturedOwnerSpaces({phone,search:lookup.search.trim(),offset});
      if (requestId !== lookupRun.current) return;
      setOwnerResults(prev => offset > 0 && prev
        ? {...found,spaces:[...prev.spaces,...found.spaces]}
        : found);
    } catch (err) {
      if (requestId === lookupRun.current) setOwnerError(err.message);
    } finally {
      if (requestId === lookupRun.current) setOwnerBusy(false);
    }
  }
  function selectSpace(space) {
    setSelectedSpace(space);
    setBooking(prev => ({...prev,spaceId:space.id}));
  }
  async function cancel(id) {
    if (!(await showInSiteConfirm("نمایش این آگهی ویژه لغو شود؟ تسویه احتمالی باید جداگانه بررسی شود."))) return;
    await run(() => cancelFeaturedBooking(id),"جایگاه لغو شد.");
  }

  return (
    <main className="hp03-admin" dir="rtl">
      <div className="hp03-admin__inner">
        <Link className="hp03-admin__back" to="/admin">بازگشت به مدیریت</Link>
        <header className="hp03-admin__header"><span>پنل درآمدزایی · HP-03</span><h1>مدیریت ویترین ویژه</h1>
          <p>یک جایگاه نمایشی در صفحه اول، با ظرفیت قابل تنظیم، گردش منصفانه زمانی، صف و پایان خودکار ۷۲ ساعته.</p>
        </header>
        {error && <p role="alert" className="hp03-admin__alert hp03-admin__alert--error">{error}</p>}
        {success && <p role="status" className="hp03-admin__alert">{success}</p>}
        {loading ? <p>در حال دریافت اطلاعات...</p> : data && <>
          <div className="hp03-admin__metrics">
            <div><strong>{data.activeCount.toLocaleString("fa-IR")}</strong><span>آگهی فعال</span></div>
            <div><strong>{data.queueCount.toLocaleString("fa-IR")}</strong><span>منتظر در صف</span></div>
            <div><strong>{data.availableSlots.toLocaleString("fa-IR")}</strong><span>ظرفیت آزاد</span></div>
            <div><strong>۷۲ ساعت</strong><span>مدت هر نوبت</span></div>
          </div>
          <p className="hp03-admin__alert">مجموع مبلغ رسیدهای دستی ثبت‌شده: {currency(data.manualRecordedTotalRials)}. این عدد تأیید بانکی خودکار یا درآمد خالص نیست و پرداخت‌های احتمالیِ قابل استرداد نیز ممکن است در آن باشد.</p>
          <div className="hp03-admin__cols">
            <form onSubmit={submitSettings} className="hp03-admin__panel">
              <h2>تنظیمات ویترین</h2>
              <label className="hp03-admin__check"><input type="checkbox" checked={settings.enabled} onChange={e => setSettings(s => ({...s,enabled:e.target.checked}))}/>فعال‌بودن ویترین پولی</label>
              <label>حداکثر آگهی فعال هم‌زمان<input type="number" min="1" max="100" value={settings.capacity} onChange={e => setSettings(s => ({...s,capacity:e.target.value}))} required/></label>
              <label>زمان تعویض آگهی نمایشی (دقیقه)<input type="number" min="1" max="60" value={settings.rotationMinutes} onChange={e => setSettings(s => ({...s,rotationMinutes:e.target.value}))} required/></label>
              <RialInput label="قیمت بسته سه‌روزه" value={settings.packagePriceRials}
                onChange={value => setSettings(s => ({...s,packagePriceRials:value}))} required />
              <small>مبلغ مصوب: {rialText(settings.packagePriceRials)} — درگاه پرداخت خودکار هنوز فعال نیست.</small>
              <button disabled={busy}>ثبت تنظیمات</button>
            </form>
            <form onSubmit={submitBooking} className="hp03-admin__panel">
              <h2>افزودن آگهی به ویترین</h2>
              <div className="hp04-admin__lookup">
                <h3>مرحله ۱: پیدا کردن آگهی‌دهنده</h3>
                <p className="hp04-admin__hint">شماره موبایل حسابی را وارد کن که آگهی را ثبت کرده است؛ شماره تماس درج‌شده روی آگهی ممکن است متفاوت باشد.</p>
                <div className="hp04-admin__lookup-fields">
                  <label>موبایل صاحب حساب<input type="tel" inputMode="tel" autoComplete="off"
                    placeholder="0912..." value={lookup.phone} maxLength={20}
                    onChange={e => editLookup("phone",e.target.value)} /></label>
                  <label>جست‌وجو در آگهی‌های همین شخص<input type="search" autoComplete="off"
                    placeholder="عنوان، شهر، دسته یا شناسه" maxLength={80} value={lookup.search}
                    onChange={e => editLookup("search",e.target.value)} /></label>
                </div>
                <button type="button" className="hp04-admin__find" disabled={ownerBusy || !lookup.phone.trim()}
                  onClick={() => { setSelectedSpace(null);setBooking(prev=>({...prev,spaceId:""}));void findOwner(0); }}>
                  {ownerBusy ? "در حال جست‌وجو…" : "نمایش آگهی‌های این حساب"}
                </button>
                {ownerError && <p className="hp04-admin__lookup-error" role="alert">{ownerError}</p>}
                {ownerResults && <div className="hp04-admin__results" aria-live="polite">
                  {!ownerResults.ownerFound
                    ? <p className="hp04-admin__hint">حساب فعال با این شماره پیدا نشد.</p>
                    : <>
                      <p className="hp04-admin__result-title">{ownerResults.ownerName || "حساب ثبت‌شده"} — {ownerResults.spaces.length.toLocaleString("fa-IR")} آگهی قابل انتخاب در نتایج فعلی</p>
                      {ownerResults.spaces.length === 0 && <p className="hp04-admin__hint">آگهی عرضه فعال و واجد شرایط پیدا نشد؛ آگهی‌های موجود در ویترین یا صف دوباره نمایش داده نمی‌شوند.</p>}
                      <div className="hp04-admin__space-list">
                        {ownerResults.spaces.map(space => <button type="button" key={space.id}
                          className={`hp04-admin__space ${booking.spaceId === space.id ? "hp04-admin__space--selected" : ""}`}
                          aria-pressed={booking.spaceId === space.id} disabled={busy}
                          onClick={() => selectSpace(space)}>
                          <ListingPhoto space={space} />
                          <span className="hp04-admin__space-details"><strong>{space.title}</strong>
                            <small>{space.city} · {space.categoryLabel || space.category}</small>
                            <small>{space.imageCount ? `عکس اصلی + ${Math.max(0,space.imageCount-1).toLocaleString("fa-IR")} عکس دیگر` : "بدون تصویر"}</small>
                          </span>
                          <span className="hp04-admin__select-indicator">{booking.spaceId === space.id ? "انتخاب شد ✓" : "انتخاب"}</span>
                        </button>)}
                      </div>
                      {ownerResults.hasMore && <button type="button" className="hp04-admin__more" disabled={ownerBusy}
                        onClick={() => void findOwner(ownerResults.spaces.length)}>نمایش آگهی‌های بیشتر</button>}
                    </>}
                </div>}
              </div>
              <div className="hp04-admin__selected">
                <h3>مرحله ۲: تأیید آگهی انتخاب‌شده</h3>
                {selectedSpace ? <div className="hp04-admin__selected-card">
                  <ListingPhoto key={selectedSpace.id} space={selectedSpace} />
                  <div><strong>{selectedSpace.title}</strong><p>{selectedSpace.city} · {selectedSpace.categoryLabel || selectedSpace.category}</p>
                    <small>تصویر انتخابی ویترین: عکس اصلی آگهی. سایر عکس‌ها در صفحه جزئیات نمایش داده می‌شوند.</small>
                    <Link to={`/parking/${selectedSpace.id}`} target="_blank" rel="noopener noreferrer">مشاهده جزئیات و گالری <span aria-hidden="true">↖</span></Link>
                  </div>
                </div> : <p className="hp04-admin__hint">هنوز آگهی انتخاب نشده است.</p>}
              </div>
              <label>نوع ثبت<select value={booking.paymentMode} onChange={e => {const mode=e.target.value;setBooking(s => ({...s,paymentMode:mode,amountRials:mode==="complimentary"?"0":rialDigits(settings.packagePriceRials),paymentReference:mode==="complimentary"?"":s.paymentReference}));setManualConfirmed(false);}}>
                <option value="complimentary">رایگان / آزمایشی، فقط با تأیید مدیر</option>
                <option value="manual_verified">پرداخت خارج از سامانه، بررسی‌شده توسط مدیر</option>
              </select></label>
              {booking.paymentMode === "manual_verified" && <>
                <RialInput required label="مبلغ پرداخت‌شده" value={booking.amountRials}
                  onChange={value => setBooking(s => ({...s,amountRials:value}))} />
                <label>شناسه رسید / ارجاع پرداخت<input required maxLength="140" value={booking.paymentReference} onChange={e => setBooking(s => ({...s,paymentReference:e.target.value}))}/></label>
                <label className="hp03-admin__check"><input type="checkbox" checked={manualConfirmed} onChange={e => setManualConfirmed(e.target.checked)}/>دریافت وجه را بیرون از فضاجو شخصاً تأیید کرده‌ام.</label>
              </>}
              <label>توضیح داخلی (اختیاری)<textarea rows="2" maxLength="500" value={booking.note} onChange={e => setBooking(s => ({...s,note:e.target.value}))}/></label>
              <button disabled={busy || !settings.enabled || !selectedSpace || booking.spaceId !== selectedSpace.id}>ثبت جایگاه ۷۲ ساعته</button>
              <small>با پرشدن ظرفیت، جایگاه در صف ثبت می‌شود و ۷۲ ساعت آن پس از آزادشدن ظرفیت شروع خواهد شد. هنوز درگاه پرداخت آنلاین فعال نیست.</small>
            </form>
          </div>
          <section className="hp03-admin__panel hp03-admin__bookings">
            <h2>آگهی‌های ویترین و صف</h2>
            <div className="hp03-admin__table-wrap"><table><thead><tr><th>آگهی</th><th>وضعیت</th><th>ثبت</th><th>آغاز</th><th>پایان</th><th>نحوه پرداخت</th><th>مبلغ</th><th>عملیات</th></tr></thead>
              <tbody>{data.bookings.length === 0 ? <tr><td colSpan="8">هنوز آگهی ویژه‌ای ثبت نشده است.</td></tr> : data.bookings.map(row => <tr key={row.id}>
                <td><Link to={`/parking/${row.spaceId}`}>{row.title || "آگهی حذف‌شده"}</Link><small>{row.city}</small></td>
                <td>{statusText[row.status] || row.status}</td><td>{dateText(row.createdAt)}</td><td>{dateText(row.activatedAt)}</td><td>{dateText(row.expiresAt)}</td>
                <td>{row.paymentMode === "manual_verified" ? "ثبت دستی رسید" : "رایگان"}</td><td>{currency(row.amountRials)}</td>
                <td>{["active","queued"].includes(row.status) && <button type="button" className="hp03-admin__cancel" disabled={busy} onClick={() => cancel(row.id)}>لغو</button>}</td>
              </tr>)}</tbody></table></div>
          </section>
        </>}
      </div>
    </main>
  );
}
