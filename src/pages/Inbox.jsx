import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentSessionUser, subscribeToAuth } from "../services/authService";
import { getChats, subscribeInboxChanged } from "../services/chatService";
import InboxItem from "../components/chat/InboxItem";
import "./Inbox.css";

function Inbox({ mode = "personal" }) {
  const [user, setUser] = useState(() => getCurrentSessionUser());
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const isAgencyMode = mode === "agency";

  useEffect(() => subscribeToAuth(setUser), []);

  useEffect(() => {
    let active = true;
    let unsubscribeRealtime = () => {};

    const load = async () => {
      if (!user) {
        if (active) {
          setChats([]);
          setLoading(false);
        }
        return;
      }

      try {
        const data = await getChats(isAgencyMode ? "agency" : "personal");
        const currentUserIds = new Set(
          [user?.id, user?.uid, user?.backendId]
            .filter(Boolean)
            .map((value) => String(value))
        );

        const safeChats = (Array.isArray(data) ? data : []).filter((chat) => {
          return (
            currentUserIds.has(String(chat?.ownerId || "")) ||
            currentUserIds.has(String(chat?.requesterId || ""))
          );
        });

        if (active) {
          setChats(safeChats);
          setError("");
        }
      } catch (e) {
        if (active) {
          setChats([]);
          setError(e.message || "دریافت گفتگوها انجام نشد.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    setLoading(true);
    load();
    if (user) unsubscribeRealtime = subscribeInboxChanged(load);
    return () => {
      active = false;
      unsubscribeRealtime();
    };
  }, [user, isAgencyMode]);

  const formatTime = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "همین حالا";
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return new Intl.DateTimeFormat("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    }
    return new Intl.DateTimeFormat("fa-IR", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const filteredChats = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const pool = unreadOnly ? chats.filter((chat) => Number(chat.unreadCount || 0) > 0) : chats;
    if (!q) return pool;
    return pool.filter((chat) =>
      [
        chat.parkingTitle,
        chat.parkingCity,
        chat.lastMessage,
        chat.otherUserName,
        chat.otherUserRole,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [chats, searchText, unreadOnly]);

  const totalUnread = chats.reduce(
    (sum, chat) => sum + Number(chat.unreadCount || 0),
    0
  );

  const unreadChatCount = chats.filter(
    (chat) => Number(chat.unreadCount || 0) > 0
  ).length;

  const filteredUnreadCount = filteredChats.filter(
    (chat) => Number(chat.unreadCount || 0) > 0
  ).length;

  const pageTitle = isAgencyMode ? "گفتگوهای کاری" : "گفتگوهای من";
  const eyebrow = isAgencyMode ? "🏢 پیام‌های کاری مشاور" : "💬 پیام‌های فضاجو";
  const heroText = isAgencyMode
    ? "مدیریت پیام‌های کاری و پیگیری مشتریان"
    : "پیام‌ها و مذاکره‌های شما درباره فضاها";
  const emptyTitle = searchText
    ? "گفتگویی پیدا نشد"
    : unreadOnly ? "پیام خوانده‌نشده‌ای ندارید"
    : isAgencyMode
      ? "هنوز گفتگوی کاری ندارید"
      : "هنوز گفتگویی ندارید";
  const emptyText = searchText
    ? "عبارت جستجو را تغییر بده یا پاک کن تا گفت‌وگوهای بیشتری ببینی."
    : unreadOnly ? "برای مشاهده سایر گفتگوها، همه گفتگوها را انتخاب کنید."
    : isAgencyMode
      ? "از بخش متقاضی‌ها، گفتگوی کاری را با مشتری موردنظر شروع کنید."
      : "از صفحه جزئیات یک آگهی می‌توانید گفتگو را شروع کنید.";
  const emptyLink = isAgencyMode ? "/agency/applicants" : "/parking";
  const emptyLinkText = isAgencyMode ? "مشاهده متقاضی‌ها ←" : "مشاهده آگهی‌ها ←";

  if (loading) {
    return (
      <main className="inbox-page fj-inbox-cm02">
        <section className="inbox-hero">
          <div className="inbox-hero__shape inbox-hero__shape--one" />
          <div className="inbox-hero__shape inbox-hero__shape--two" />
          <div className="container inbox-hero__content">
            <div>
              <span className="inbox-hero__eyebrow">{eyebrow}</span>
              <h1>{pageTitle}</h1>
              <p>پیام‌ها و گفتگوهای فضاجو</p>
            </div>
          </div>
        </section>
        <section className="inbox-content">
          <div className="container">
            <div className="inbox-loading" role="status" aria-live="polite">
              <p className="cm02-loading-label">در حال دریافت گفتگوها…</p>
              <div className="cm02-skeleton-grid" aria-hidden="true">
                {[0, 1, 2, 3].map((item) => <div className="cm02-skeleton-row" key={item}><i /><b /><b /></div>)}
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="inbox-page fj-inbox-cm02">
        <section className="inbox-hero">
          <div className="inbox-hero__shape inbox-hero__shape--one" />
          <div className="inbox-hero__shape inbox-hero__shape--two" />
          <div className="container inbox-hero__content">
            <div>
              <span className="inbox-hero__eyebrow">{eyebrow}</span>
              <h1>{pageTitle}</h1>
              <p>برای دسترسی به گفتگوها ابتدا وارد حساب خود شوید.</p>
            </div>
          </div>
        </section>
        <section className="inbox-content">
          <div className="container">
            <div className="inbox-empty">
              <div className="inbox-empty__icon">🔐</div>
              <h2>ابتدا وارد حساب شوید</h2>
              <p>بعد از ورود، همه گفتگوهای فعال و خوانده‌نشده شما در این بخش نمایش داده می‌شود.</p>
              <Link to="/login" className="inbox-empty__button">ورود به حساب ←</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="inbox-page fj-inbox-cm02">
      <section className="inbox-hero">
        <div className="inbox-hero__shape inbox-hero__shape--one" />
        <div className="inbox-hero__shape inbox-hero__shape--two" />
        <div className="container inbox-hero__content">
          <div>
            <span className="inbox-hero__eyebrow">{eyebrow}</span>
            <h1>{pageTitle}</h1>
            <p>{heroText}</p>
          </div>
          <div className="inbox-hero__stats">
            <div className="inbox-hero__count">
              <strong>{chats.length.toLocaleString("fa-IR")}</strong>
              <span>گفتگو</span>
            </div>
            <div className="inbox-hero__count inbox-hero__count--unread">
              <strong>{totalUnread.toLocaleString("fa-IR")}</strong>
              <span>پیام خوانده‌نشده</span>
            </div>
          </div>
        </div>
      </section>

      <section className="inbox-content">
        <div className="container">
          <div className="inbox-toolbar">
            <div className="inbox-toolbar__info">
              <div className="inbox-toolbar__chips" aria-label="فیلتر گفتگوها">
                <button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>همه گفتگوها</button>
                <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>خوانده‌نشده‌ها <span>{unreadChatCount.toLocaleString("fa-IR")}</span></button>
                {searchText.trim() ? <em>{`نتیجه: ${filteredChats.length.toLocaleString("fa-IR")} · خوانده‌نشده: ${filteredUnreadCount.toLocaleString("fa-IR")}`}</em> : null}
              </div>
            </div>

            <div className="inbox-search">
              <span className="inbox-search__icon">⌕</span>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={isAgencyMode ? "جستجو در گفتگوهای کاری..." : "جستجو در گفتگوها..."}
                aria-label="جستجو در گفتگوها"
              />
              {searchText && (
                <button
                  type="button"
                  className="inbox-search__clear"
                  aria-label="پاک کردن جستجو"
                  onClick={() => setSearchText("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {error && <div className="inbox-error" role="alert">{error}</div>}

          {!error && filteredChats.length === 0 ? (
            <div className="inbox-empty">
              <div className="inbox-empty__icon">💬</div>
              <h2>{emptyTitle}</h2>
              <p>{emptyText}</p>
              {searchText || unreadOnly ? (
                <button type="button" className="inbox-empty__button" onClick={() => { setSearchText(""); setUnreadOnly(false); }}>نمایش همه گفتگوها</button>
              ) : <Link to={emptyLink} className="inbox-empty__button">{emptyLinkText}</Link>}
            </div>
          ) : (
            <div className="inbox-list">
              {filteredChats.map((chat) => (
                <InboxItem
                  key={chat.id}
                  chat={chat}
                  otherUserName={chat.otherUserName}
                  otherUserRole={chat.otherUserRole}
                  formattedTime={formatTime(chat.updatedAt)}
                  unreadCount={Number(chat.unreadCount || 0)}
                  isUnread={Number(chat.unreadCount || 0) > 0}
                  isLastMessageMine={
                    chat.lastMessageSenderId === user.id ||
                    chat.lastMessageSenderId === user.backendId
                  }
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Inbox;
