import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { showInSiteConfirm } from "../utils/inSiteDialog";
import {
  getFeaturedAdmin, saveFeaturedSettings, createFeaturedBooking, cancelFeaturedBooking, findFeaturedOwnerSpaces,
} from "../services/featuredShowcaseService";
import { rialDigits, rialGrouped, rialText } from "../utils/featuredMoneyHP04";
import "./FeaturedShowcaseAdmin.css";
import "./FeaturedWorkspaceADM05.css";
import { filterBookings, bookingPage, exactRialTotal } from "../utils/featuredWorkspaceADM05.js";

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
  const [section,setSection] = useState("bookings");
  const [statusFilter,setStatusFilter] = useState("all");
  const [search,setSearch] = useState("");
  const [page,setPage] = useState(1);
  const [stale,setStale] = useState(false);
  const actionLock = useRef(false);
  const filtered = filterBookings(data?.bookings || [], statusFilter, search);
  const view = bookingPage(filtered, page);
  const blocked = busy || stale;


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

  async function run(task, message, confirmMessage = "") {
    if (actionLock.current || stale) return false;
    actionLock.current = true;
    setBusy(true);setError("");setSuccess("");
    try {
      if (confirmMessage && !(await showInSiteConfirm(confirmMessage))) return false;
      try { await task(); }
      catch (err) {
        setError(`${err.message} — پیش از تلاش مجدد، وضعیت ویترین را تازه‌سازی و بررسی کن.`);
        setStale(true);return false;
      }
      setSuccess(message);
      try { await refresh(); }
      catch { setStale(true);setError("عملیات ثبت شد اما تازه‌سازی ناموفق بود. عملیات را تکرار نکن؛ ابتدا اطلاعات را تازه‌سازی کن."); }
      return true;
    } finally { actionLock.current = false;setBusy(false); }
  }
  async function reload() {
    if (actionLock.current) return;
    actionLock.current = true;setBusy(true);setError("");
    try { await refresh();setStale(false); }
    catch (err) { setError(err.message);setStale(true); }
    finally { actionLock.current=false;setBusy(false); }
  }
  function chooseStatus(value) { setStatusFilter(value);setPage(1);setSection("bookings"); }

  async function submitSettings(event) {
    event.preventDefault();
    await run(() => saveFeaturedSettings({
      enabled:Boolean(settings.enabled),capacity:Number(settings.capacity),
      rotationMinutes:Number(settings.rotationMinutes),packagePriceRials:rialDigits(settings.packagePriceRials),
    }),"تنظیمات ویترین ذخیره شد.", `تنظیمات ویترین (${settings.enabled ? "فعال" : "غیرفعال"}) با ظرفیت ${settings.capacity}، گردش ${settings.rotationMinutes} دقیقه و تعرفه ${rialText(settings.packagePriceRials)} ذخیره شود؟`);
  }
  async function submitBooking(event) {
    event.preventDefault();
    if (blocked || ownerBusy || !data?.settings.enabled) return;
    if (booking.paymentMode === "manual_verified" && !manualConfirmed) {
      setError("ابتدا تأیید کن که دریافت وجه را مستقل از سامانه بررسی کرده‌ای.");return;
    }
    if (!selectedSpace || selectedSpace.id !== booking.spaceId || !ownerResults?.ownerFound) {
      setError("ابتدا صاحب حساب را جست‌وجو کن و آگهی را از کارت تصویردار انتخاب کن.");return;
    }
    const completed = await run(() => createFeaturedBooking({...booking,ownerPhone:lookup.phone,amountRials:rialDigits(booking.amountRials)}),"جایگاه ثبت شد؛ وضعیت فعال یا صف را در جدول ببین.", `آگهی «${selectedSpace.title}» از شهر «${selectedSpace.city}» به ویترین فعال یا صف آن افزوده شود؟ نوع ثبت: ${booking.paymentMode === "manual_verified" ? "رسید دستی" : "رایگان"}؛ مبلغ: ${rialText(booking.amountRials)}. شروع ۷۲ ساعت هنگام فعال‌سازی خواهد بود.`);
    if (completed) {
      setOwnerResults(null);
      setSelectedSpace(null);
      setBooking({spaceId:"",paymentMode:"complimentary",paymentReference:"",amountRials:"0",note:""});
      setManualConfirmed(false);
      setSearch("");
      chooseStatus("all");
    }
  }
  function editLookup(field,value) {
    lookupRun.current += 1; // Invalidates any old response when the owner/search changes.
    setLookup(prev => ({...prev,[field]:value}));
    setOwnerResults(null);setOwnerBusy(false);setOwnerError("");setSelectedSpace(null);setManualConfirmed(false);
    setBooking(prev => ({...prev,spaceId:""}));
  }
  async function findOwner(offset = 0) {
    const requestId = ++lookupRun.current;
    const phone = lookup.phone.trim();
    if (offset === 0) setOwnerResults(null);
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
    setSelectedSpace(space);setManualConfirmed(false);
    setBooking(prev => ({...prev,spaceId:space.id}));
  }
  async function cancel(id) {
    const row = data?.bookings.find(item => item.id === id);
    await run(() => cancelFeaturedBooking(id),"جایگاه لغو شد.", `نمایش «${row?.title || "آگهی"}» لغو شود؟ تسویه احتمالی باید جداگانه بررسی شود.`);
  }

  return (
    <main className="hp03-admin adm05" dir="rtl">
      <div className="hp03-admin__inner">
        <header className="hp03-admin__header"><div><span>فضاجو / مدیریت خدمات</span><h1>مدیریت ویترین ویژه</h1>
          <p>ظرفیت، تعرفه و جایگاه‌های ۷۲ ساعته در یک میز کار</p></div>
          <Link className="hp03-admin__back" to="/admin">بازگشت به مدیریت</Link>
        </header>
        {error && <p role="alert" className="hp03-admin__alert hp03-admin__alert--error">{error}</p>}
        {success && <p role="status" className="hp03-admin__alert">{success}</p>}
        {loading ? <p role="status">در حال دریافت اطلاعات...</p> : !data ? <section className="hp03-admin__panel"><p>اطلاعات ویترین دریافت نشد.</p><button type="button" disabled={busy} onClick={reload}>تلاش مجدد</button></section> : <>
          <div className="hp03-admin__metrics">
            <button type="button" onClick={() => chooseStatus("active")} disabled={busy}><span>آگهی فعال</span><strong>{data.activeCount.toLocaleString("fa-IR")}</strong></button>
            <button type="button" onClick={() => chooseStatus("queued")} disabled={busy}><span>صف در نتایج دریافتی</span><strong>{data.queueCount.toLocaleString("fa-IR")}</strong></button>
            <div><span>ظرفیت آزاد از کل</span><strong>{data.availableSlots.toLocaleString("fa-IR")} از {data.settings.capacity.toLocaleString("fa-IR")}</strong></div>
            <div><span>مدت هر نوبت</span><strong>۷۲ ساعت</strong></div>
          </div>
          <div className="adm05-workspace">
            <aside className="adm05-rail">
              <section className="hp03-admin__panel adm05-nav" aria-label="بخش‌های ویترین"><h2>میز کار ویترین</h2>
                {[["bookings","آگهی‌ها و صف"],["create","افزودن جایگاه"],["settings","تنظیمات و تعرفه"]].map(([key,label]) => <button key={key} type="button" aria-pressed={section===key} disabled={busy} onClick={() => setSection(key)}>{label}</button>)}
                <button type="button" className="adm05-secondary" disabled={busy || ownerBusy} onClick={reload}>تازه‌سازی اطلاعات</button>
              </section>
              <section className="hp03-admin__panel adm05-summary"><h2>وضعیت ثبت‌شده</h2><strong className="adm05-state" data-enabled={data.settings.enabled}>{data.settings.enabled ? "ویترین فعال" : "ویترین غیرفعال"}</strong>
                <div className="adm05-capacity" role="img" aria-label={`ظرفیت اشغال‌شده: ${data.activeCount} از ${data.settings.capacity}`}><span style={{width:`${Math.min(100,100*data.activeCount/Math.max(1,data.settings.capacity))}%`}}/></div>
                <small>تعرفه سه‌روزه</small><strong>{currency(data.settings.packagePriceRials)}</strong><small>زمان گردش: {data.settings.rotationMinutes.toLocaleString("fa-IR")} دقیقه</small>
              </section>
              <section className="hp03-admin__panel adm05-summary"><h2>رسیدهای دستی ثبت‌شده</h2><strong className="adm05-total">{exactRialTotal(data.manualRecordedTotalRials)}</strong><small>تأیید بانکی خودکار یا درآمد خالص نیست؛ ممکن است شامل پرداخت‌های قابل استرداد باشد. درگاه آنلاین فعال نیست.</small></section>
            </aside>
            <div className="adm05-main">
            <form onSubmit={submitSettings} className="hp03-admin__panel" hidden={section!=="settings"}>
              <fieldset disabled={blocked}>
              <h2>تنظیمات و تعرفه ویترین</h2>
              <p className="hp04-admin__hint">تغییرات پس از ثبت و تأیید سرور اعمال می‌شوند.</p>
              <label className="hp03-admin__check"><input type="checkbox" checked={settings.enabled} onChange={e => setSettings(s => ({...s,enabled:e.target.checked}))}/>فعال‌بودن ویترین پولی</label>
              <label>حداکثر آگهی فعال هم‌زمان<input type="number" min="1" max="100" value={settings.capacity} onChange={e => setSettings(s => ({...s,capacity:e.target.value}))} required/></label>
              <label>زمان تعویض آگهی نمایشی (دقیقه)<input type="number" min="1" max="60" value={settings.rotationMinutes} onChange={e => setSettings(s => ({...s,rotationMinutes:e.target.value}))} required/></label>
              <RialInput label="قیمت بسته سه‌روزه" value={settings.packagePriceRials}
                onChange={value => setSettings(s => ({...s,packagePriceRials:value}))} required />
              <small>مبلغ مصوب: {rialText(settings.packagePriceRials)} — درگاه پرداخت خودکار هنوز فعال نیست.</small>
              <button disabled={blocked}>ثبت تنظیمات</button>
              </fieldset>
            </form>
            <form onSubmit={submitBooking} className="hp03-admin__panel" hidden={section!=="create"}>
              <fieldset disabled={blocked}>
              <h2>افزودن جایگاه جدید</h2>
              <p className="hp04-admin__hint">{data.settings.enabled ? "ویترین فعال است؛ آگهی واجد شرایط را انتخاب کن." : "ویترین غیرفعال است؛ ابتدا تنظیمات را ذخیره کن."}</p>
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
                  onClick={() => { setSelectedSpace(null);setManualConfirmed(false);setBooking(prev=>({...prev,spaceId:""}));void findOwner(0); }}>
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
              <label>نوع ثبت<select value={booking.paymentMode} onChange={e => {const mode=e.target.value;setBooking(s => ({...s,paymentMode:mode,amountRials:mode==="complimentary"?"0":rialDigits(data.settings.packagePriceRials),paymentReference:mode==="complimentary"?"":s.paymentReference}));setManualConfirmed(false);}}>
                <option value="complimentary">رایگان / آزمایشی، فقط با تأیید مدیر</option>
                <option value="manual_verified">پرداخت خارج از سامانه، بررسی‌شده توسط مدیر</option>
              </select></label>
              {booking.paymentMode === "manual_verified" && <>
                <RialInput required label="مبلغ پرداخت‌شده" value={booking.amountRials}
                  onChange={value => {setManualConfirmed(false);setBooking(s => ({...s,amountRials:value}));}} />
                <label>شناسه رسید / ارجاع پرداخت<input required maxLength="140" value={booking.paymentReference} onChange={e => {setManualConfirmed(false);setBooking(s => ({...s,paymentReference:e.target.value}));}}/></label>
                <label className="hp03-admin__check"><input type="checkbox" checked={manualConfirmed} onChange={e => setManualConfirmed(e.target.checked)}/>دریافت وجه را بیرون از فضاجو شخصاً تأیید کرده‌ام.</label>
              </>}
              <label>توضیح داخلی (اختیاری)<textarea rows="2" maxLength="500" value={booking.note} onChange={e => setBooking(s => ({...s,note:e.target.value}))}/></label>
              <button disabled={blocked || ownerBusy || !data.settings.enabled || !selectedSpace || booking.spaceId !== selectedSpace.id}>ثبت جایگاه ۷۲ ساعته</button>
              <small>با پرشدن ظرفیت، جایگاه در صف ثبت می‌شود و ۷۲ ساعت آن پس از آزادشدن ظرفیت شروع خواهد شد. هنوز درگاه پرداخت آنلاین فعال نیست.</small>
              </fieldset>
            </form>
          <section className="hp03-admin__panel hp03-admin__bookings" hidden={section!=="bookings"}>
            <div className="adm05-section-head"><div><h2>آگهی‌های ویترین و صف</h2><small>حداکثر ۲۰۰ جایگاه دریافتی از سرور؛ جست‌وجو و صف بر همین نتایج است.</small></div><button type="button" disabled={busy} onClick={() => setSection("create")}>+ افزودن جایگاه</button></div>
            <div className="adm05-filters"><label>جست‌وجوی آگهی<input type="search" value={search} placeholder="عنوان، شهر یا شناسه آگهی" onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label><label>وضعیت<select value={statusFilter} onChange={e=>chooseStatus(e.target.value)}><option value="all">همه وضعیت‌ها</option>{Object.entries(statusText).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label></div>
            <small>{filtered.length.toLocaleString("fa-IR")} نتیجه از {data.bookings.length.toLocaleString("fa-IR")} جایگاه دریافتی</small>
            <div className="adm05-booking-list">{view.items.length===0 ? <p className="adm05-empty">{data.bookings.length===0 ? "هنوز آگهی ویژه‌ای ثبت نشده است." : "نتیجه‌ای با این فیلتر پیدا نشد."}</p> : view.items.map(row => <article key={row.id} className="adm05-booking">
              <div className="adm05-booking-head"><div>{row.title ? <Link to={`/parking/${row.spaceId}`}>{row.title}</Link> : <strong>آگهی حذف‌شده</strong>}<small>{row.city || "—"}</small></div><span className="adm05-status" data-status={row.status}>{statusText[row.status] || row.status}</span></div>
              <dl className="adm05-booking-meta"><div><dt>ثبت</dt><dd>{dateText(row.createdAt)}</dd></div><div><dt>آغاز</dt><dd>{dateText(row.activatedAt)}</dd></div><div><dt>پایان</dt><dd>{dateText(row.expiresAt)}</dd></div><div><dt>نوع ثبت / مبلغ</dt><dd>{row.paymentMode === "manual_verified" ? "ثبت دستی رسید" : "رایگان"} · {currency(row.amountRials)}</dd></div></dl>
              {(row.paymentReference || row.note || ["active","queued"].includes(row.status)) && <div className="adm05-booking-foot">{(row.paymentReference || row.note) && <details><summary>جزئیات ثبت</summary>{row.paymentReference && <p>ارجاع رسید: {row.paymentReference}</p>}{row.note && <p>توضیح داخلی: {row.note}</p>}</details>}{["active","queued"].includes(row.status) && <button type="button" className="hp03-admin__cancel" disabled={blocked} onClick={() => cancel(row.id)}>لغو جایگاه</button>}</div>}
            </article>)}</div>
            {view.pages>1 && <div className="adm05-pagination"><button type="button" disabled={view.page<=1 || busy} onClick={()=>setPage(view.page-1)}>قبلی</button><span>صفحه {view.page.toLocaleString("fa-IR")} از {view.pages.toLocaleString("fa-IR")}</span><button type="button" disabled={view.page>=view.pages || busy} onClick={()=>setPage(view.page+1)}>بعدی</button></div>}
          </section>
            </div>
          </div>
        </>}
      </div>
    </main>
  );
}
