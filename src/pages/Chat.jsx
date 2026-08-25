import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getCurrentSessionUser, subscribeToAuth } from "../services/authService";
import { createOrGetChat, getChat, getMessages, markChatRead, sendMessage, subscribeChat } from "../services/chatService";
import ChatMessage from "../components/chat/ChatMessage";
import "./Chat.css";

function Chat({ parkings = [] }) {
  const { parkingId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedConversationId = searchParams.get("conversationId") || "";
  const requestedChatType =
    searchParams.get("chatType") === "agency"
      ? "agency"
      : "personal";
  const [user, setUser] = useState(() => getCurrentSessionUser());
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const parking = useMemo(() => parkings.find((item) => String(item.id) === String(parkingId)), [parkings, parkingId]);
  const userId = user?.backendId || user?.id || user?.uid || "";
  const isOwner = Boolean(parking?.ownerId && userId === parking.ownerId);

  useEffect(() => subscribeToAuth(setUser), []);

  useEffect(() => {
    let active = true;
    const prepare = async () => {
      if (!userId) { if (active) { setLoading(false); setError("برای گفتگو ابتدا وارد حساب شوید."); } return; }
      try {
        setLoading(true); setError("");
        let nextChat;
        if (requestedConversationId) nextChat = await getChat(requestedConversationId);
        else {
          if (!parking) throw new Error("آگهی پیدا نشد.");
          if (isOwner) throw new Error("برای پاسخ به متقاضی، گفتگو را از بخش «گفتگوهای من» باز کنید.");
          nextChat = await createOrGetChat(parkingId, requestedChatType);
          setSearchParams(
            {
              conversationId: nextChat.id,
              ...(requestedChatType === "agency" ? { chatType: "agency" } : {}),
            },
            { replace: true }
          );
        }
        if (!active) return;
        setChat(nextChat);
        const loaded = await getMessages(nextChat.id);
        if (!active) return;
        setMessages(loaded);
        await markChatRead(nextChat.id).catch(()=>{});
      } catch (e) { if (active) setError(e.message || "آماده‌سازی گفتگو انجام نشد."); }
      finally { if (active) setLoading(false); }
    };
    prepare();
    return () => { active = false; };
  }, [userId, parkingId, requestedConversationId, requestedChatType, parking, isOwner, setSearchParams]);

  useEffect(() => {
    if (!chat?.id) return undefined;
    return subscribeChat(chat.id, {
      onMessage: async (message) => {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        if (message.senderId !== userId) await markChatRead(chat.id).catch(()=>{});
      },
      onRead: ({ readAt, readerId }) => {
        if (readerId === userId) return;
        setMessages((current) => current.map((m) => m.senderId === userId && !m.readAt ? { ...m, readAt } : m));
      },
    });
  }, [chat?.id, userId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const formatDate = (value) => value ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value)) : "";
  const sameDay = (a,b) => a && b && new Date(a).toDateString() === new Date(b).toDateString();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || !chat?.id || sending) return;
    setSending(true);
    try { const message = await sendMessage(chat.id, text); setMessageText(""); setMessages((current)=>current.some((m)=>m.id===message.id)?current:[...current,message]); }
    catch (e) { alert(e.message || "ارسال پیام انجام نشد."); }
    finally { setSending(false); }
  };

  const ad = parking || (chat ? { id: chat.parkingId, title: chat.parkingTitle, city: chat.parkingCity, imageUrl: chat.parkingImageUrl } : null);
  if (loading) return <main className="chat-page"><section className="chat-hero"><div className="container"><span className="chat-hero__eyebrow">💬 گفتگوی فضاجو</span><h1>در حال آماده‌سازی گفتگو...</h1></div></section></main>;
  if (error) return <main className="chat-page"><section className="chat-content"><div className="container"><div className="chat-state-card"><div className="chat-box__error">{error}</div><Link className="chat-state-card__button" to="/inbox">رفتن به گفتگوهای من</Link></div></div></section></main>;

  return (
    <main className="chat-page">
      <section className="chat-hero"><div className="container chat-hero__content"><div><span className="chat-hero__eyebrow">💬 پیام امن داخل فضاجو</span><h1>{chat?.otherUserName || "گفتگو"}</h1><p>پیام‌ها روی زیرساخت مستقل فضاجو ذخیره و لحظه‌ای بروزرسانی می‌شوند.</p></div><Link className="chat-hero__back" to="/inbox">← گفتگوهای من</Link></div></section>
      <section className="chat-content"><div className="container"><div className="chat-layout">
        <aside className={`chat-ad-card ${ad?.imageUrl ? "" : "chat-ad-card--no-image"}`}>{ad?.imageUrl ? <img className="chat-ad-card__image" src={ad.imageUrl} alt={ad.title || "تصویر آگهی"}/> : <div className="chat-ad-card__placeholder">🚘</div>}<div className="chat-ad-card__body"><span>آگهی مرتبط</span><h2>{ad?.title || "آگهی فضاجو"}</h2><p>📍 {ad?.city || "شهر ثبت نشده"}</p><Link to={`/parking/${ad?.id || parkingId}`}>مشاهده آگهی ←</Link></div></aside>
        <section className="chat-box"><header className="chat-box__header"><div className="chat-box__avatar">{(chat?.otherUserName || "ف").slice(0,1)}</div><div><strong>{chat?.otherUserName || "کاربر فضاجو"}</strong><span>{chat?.otherUserRole || "طرف گفتگو"}</span></div></header>
          <div className={`chat-box__messages ${messages.length===0 ? "chat-box__messages--empty" : ""}`}>{messages.length===0 ? <div className="chat-box__empty"><span>💬</span><strong>شروع گفتگو</strong><p>اولین پیام را برای این آگهی ارسال کنید.</p></div> : messages.map((message,index)=><div key={message.id}>{(index===0 || !sameDay(messages[index-1]?.createdAt,message.createdAt)) && <div className="chat-date-separator"><span>{formatDate(message.createdAt)}</span></div>}<div className="chat-message-row"><ChatMessage message={message} isMine={message.senderId===userId} isRead={Boolean(message.readAt)}/></div></div>)}<div ref={endRef}/></div>
          <form className="chat-form" onSubmit={handleSubmit}><textarea value={messageText} onChange={(e)=>setMessageText(e.target.value)} placeholder="پیام خود را بنویسید..." maxLength={2000}/><div className="chat-form__footer"><span>{messageText.length.toLocaleString("fa-IR")} / ۲۰۰۰</span><button type="submit" disabled={sending || !messageText.trim()}>{sending ? "در حال ارسال..." : "ارسال پیام"}</button></div></form>
        </section>
      </div></div></section>
    </main>
  );
}
export default Chat;
