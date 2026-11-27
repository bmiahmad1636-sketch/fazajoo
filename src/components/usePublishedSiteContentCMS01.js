import {useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {getPublishedSiteContent} from '../services/siteContentCMS01Service';
import {showPublicFooter} from './footerFT01';
import {footerContent} from '../config/footerContent';
export function usePublishedSiteContentCMS01() {
  const {pathname}=useLocation();
  const needed=showPublicFooter(pathname)||footerContent.pages.some(p=>p.path.toLowerCase()===(pathname.replace(/\/+$/,'')||'/').toLowerCase());
  const [state,setState]=useState({status:'loading',content:null});
  useEffect(()=>{
    if(!needed) {setState({status:"loading",content:null});return;}
    let disposed=false, controller;
    async function load() {
      controller?.abort(); const request=new AbortController(); controller=request;
      try {const data=await getPublishedSiteContent(request.signal); if(!disposed&&!request.signal.aborted) setState({status:'ready',content:data.content});}
      catch {if(!disposed&&!request.signal.aborted) setState({status:'error',content:null});}
    }
    load(); window.addEventListener('focus',load); window.addEventListener('fazajoo:site-content-published',load);
    return ()=>{disposed=true;controller?.abort();window.removeEventListener('focus',load);window.removeEventListener('fazajoo:site-content-published',load);};
  },[needed,pathname]);
  return state;
}
