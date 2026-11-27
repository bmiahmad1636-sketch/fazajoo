// Presentation only: every returned audit entry and each old/new field remain available.
export default function PolicyAuditADM07({entries,fields,date,format}) {
  const value = n => n == null || !Number.isFinite(Number(n)) ? "—" : format(n);
  return <section className="adm07-audit" aria-label="تاریخچه تغییرات سیاست">
    <div className="adm07-audit-heading"><div><h3>آخرین تغییرات سیاست</h3><p>حداکثر ۲۰ رویداد اخیر دریافت‌شده از سرور</p></div><span>{format(entries.length)} رویداد</span></div>
    {entries.length?<ul>{entries.map(a=>{
      const changed=fields.filter(([k])=>a.old_policy?.[k]!==a.new_policy?.[k]).length;
      return <li key={a.id}><details><summary><strong>{date(a.created_at)}</strong><span>{format(changed)} مقدار تغییر کرده</span><span className="adm07-audit-toggle" aria-hidden="true">⌄</span></summary><div className="adm07-audit-values"><div className="adm07-audit-cols" aria-hidden="true"><span>سیاست</span><span>قبلی</span><span>جدید</span></div>{fields.map(([k,type,label])=><div key={k} className={`adm07-audit-value${a.old_policy?.[k]!==a.new_policy?.[k]?" is-changed":""}`}><span>{type}{label?` · ${label}`:" · انتقال به آرشیو"}</span><span aria-label={`مقدار قبلی ${value(a.old_policy?.[k])}`}>{value(a.old_policy?.[k])}</span><strong aria-label={`مقدار جدید ${value(a.new_policy?.[k])}`}>{value(a.new_policy?.[k])}</strong></div>)}</div></details></li>;
    })}</ul>:<p className="adm07-audit-empty">هنوز تغییری ثبت نشده است.</p>}
  </section>;
}
