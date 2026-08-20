import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentSessionUser, subscribeToAuth } from "../services/authService";
import { getChats, subscribeInboxChanged } from "../services/chatService";
import InboxItem from "../components/chat/InboxItem";
import "./Inbox.css";

function Inbox() {
  const [user, setUser] = useState(() => getCurrentSessionUser());
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => subscribeToAuth(setUser), []);
  useEffect(() => {
    let active = true;
    let unsubscribeRealtime = () => {};
    const load = async () => {
      if (!user) { if (active) { setChats([]); setLoading(false); } return; }
      try { const data = await getChats(); if (active) { setChats(data); setError(""); } }
      catch (e) { if (active) setError(e.message || "دریافت گفتگوها انجام نشد."); }
      finally { if (active) setLoading(false); }
    };
    setLoading(true); load();
    if (user) unsubscribeRealtime = subscribeInboxChanged(load);
    return () => { active = false; unsubscribeRealtime(); };
  }, [user]);

  const formatTime = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "همین حالا";
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(date);
    return new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" }).format(date);
  };

  const filteredChats = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((chat) => [chat.parkingTitle, chat.parkingCity, chat.lastMessage, chat.otherUserName, chat.otherUserRole].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [chats, searchText]);
  const totalUnread = chats.reduce((sum, chat) => sum + Number(chat.unreadCount || 0), 0);

  if (loading) return <main className="inbox-page"><section className="inbox-hero"><div className="container"><span className="inbox-hero__eyebrow">💬 پیام‌های فضاجو</span><h1>گفتگوهای من</h1><p>در حال دریافت گفتگوهای شما هستیم.</p></div></section><section className="inbox-content"><div className="container"><div className="inbox-loading"><span>💬</span><strong>کمی صبر کنید...</strong></div></div></section></main>;
  if (!user) return <main className="inbox-page"><section className="inbox-hero"><div className="container"><span className="inbox-hero__eyebrow">💬 پیام‌های فضاجو</span><h1>گفتگوهای من</h1></div></section><section className="inbox-content"><div className="container"><div className="inbox-empty"><div className="inbox-empty__icon">🔐</div><h2>ابتدا وارد حساب شوید</h2><Link to="/login" className="inbox-empty__button">ورود به حساب ←</Link></div></div></section></main>;

  return (
    <main className="inbox-page">
      <section className="inbox-hero"><div className="inbox-hero__shape inbox-hero__shape--one"/><div className="inbox-hero__shape inbox-hero__shape--two"/><div className="container inbox-hero__content"><div><span className="inbox-hero__eyebrow">💬 پیام‌های فضاجو</span><h1>گفتگوهای من</h1><p>همه پیام‌های مربوط به آگهی‌ها را از همین صفحه دنبال کنید.</p></div><div className="inbox-hero__stats"><div className="inbox-hero__count"><strong>{chats.length.toLocaleString("fa-IR")}</strong><span>گفتگوی فعال</span></div><div className="inbox-hero__count inbox-hero__count--unread"><strong>{totalUnread.toLocaleString("fa-IR")}</strong><span>پیام خوانده‌نشده</span></div></div></div></section>
      <section className="inbox-content"><div className="container">
        <div className="inbox-toolbar"><div className="inbox-toolbar__info"><h2>پیام‌های شما</h2><p>گفتگوهای جدید به‌صورت لحظه‌ای بروزرسانی می‌شوند.</p></div><div className="inbox-search"><span className="inbox-search__icon">⌕</span><input value={searchText} onChange={(e)=>setSearchText(e.target.value)} placeholder="جستجو در گفتگوها..."/>{searchText && <button type="button" className="inbox-search__clear" onClick={()=>setSearchText("")}>×</button>}</div></div>
        {error && <div className="inbox-error">{error}</div>}
        {!error && filteredChats.length === 0 ? <div className="inbox-empty"><div className="inbox-empty__icon">💬</div><h2>{searchText ? "گفتگویی پیدا نشد" : "هنوز گفتگویی ندارید"}</h2><p>از صفحه جزئیات یک آگهی می‌توانید گفتگو را شروع کنید.</p><Link to="/parking" className="inbox-empty__button">مشاهده آگهی‌ها ←</Link></div> : <div className="inbox-list">{filteredChats.map((chat)=><InboxItem key={chat.id} chat={chat} otherUserName={chat.otherUserName} otherUserRole={chat.otherUserRole} formattedTime={formatTime(chat.updatedAt)} unreadCount={Number(chat.unreadCount||0)} isUnread={Number(chat.unreadCount||0)>0} isLastMessageMine={chat.lastMessageSenderId===user.id || chat.lastMessageSenderId===user.backendId}/>)}</div>}
      </div></section>
    </main>
  );
}
export default Inbox;
