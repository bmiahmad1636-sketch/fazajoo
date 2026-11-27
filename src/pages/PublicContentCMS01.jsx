import {Link} from 'react-router-dom';
import {publicPage} from '../utils/siteContentCMS01';
import './SiteContentCMS01.css';
export default function PublicContentCMS01({id,state}) {
  const page=publicPage(state.content,id);
  return <main className="cms01-public" dir="rtl"><article>
    <Link to="/">← صفحه اصلی فضاجو</Link>
    {state.status==='loading'?<p role="status">در حال دریافت محتوا...</p>:state.status==='error'?<p role="alert">دریافت محتوا انجام نشد. صفحه را دوباره بارگذاری کنید.</p>:page?<><h1>{page.label}</h1><div className="cms01-public__body">{page.body}</div></>:<><h1>این صفحه هنوز منتشر نشده است.</h1><p>پس از تکمیل، محتوا از همین نشانی در دسترس خواهد بود.</p></>}
  </article></main>;
}
