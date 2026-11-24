import { Link } from "react-router-dom";

import "./InboxItem.css";

function InboxItem({
  chat,
  otherUserName,
  otherUserRole,
  formattedTime,
  unreadCount = 0,
  isUnread = false,
  isLastMessageMine = false,
}) {
  const chatHref = `/chat/${chat.parkingId}?conversationId=${chat.id}${
    chat.chatType === "agency" ? "&chatType=agency" : ""
  }`;

  return (
    <Link
      to={chatHref}
      className={[
        "inbox-item",
        isUnread ? "inbox-item--unread" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="inbox-item__image">
        {chat.parkingImageUrl ? (
          <img
            src={chat.parkingImageUrl}
            alt={chat.parkingTitle || "تصویر آگهی"}
          />
        ) : (
          <span>💬</span>
        )}

        <div className="inbox-item__image-badge">
          {chat.chatType === "agency" ? "گفتگوی کاری" : "گفتگوی شخصی"}
        </div>

        {isUnread && (
          <span
            className="inbox-item__unread-dot"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="inbox-item__body">
        <div className="inbox-item__top">
          <div>
            <strong>{otherUserName || "کاربر فضاجو"}</strong>
            <span className="inbox-item__role">{otherUserRole || "طرف گفتگو"}</span>
          </div>

          <div className="inbox-item__meta">
            <time>{formattedTime}</time>
            <div className="inbox-item__meta-row">
              <span className={isUnread ? "inbox-item__status inbox-item__status--unread" : "inbox-item__status"}>
                {isUnread ? "پیام جدید" : chat.lastMessage ? "خوانده‌شده" : "بدون پیام"}
              </span>

              {unreadCount > 0 && (
                <span
                  className="inbox-item__unread-count"
                  aria-label={`${unreadCount} پیام خوانده‌نشده`}
                >
                  {unreadCount > 99 ? "+۹۹" : unreadCount.toLocaleString("fa-IR")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="cm02-listing-line">
          <h3>{chat.parkingTitle || "آگهی فضاجو"}</h3>
          <span>{chat.parkingCity || "شهر ثبت نشده"}</span>
        </div>

        <div className="inbox-item__message-row">
          {isLastMessageMine && <span className="inbox-item__sent-label">شما:</span>}
          <p>{chat.lastMessage || "هنوز پیامی در این گفتگو ارسال نشده است."}</p>
        </div>

        <div className="inbox-item__footer">
          <strong aria-hidden="true">←</strong>
        </div>
      </div>
    </Link>
  );
}

export default InboxItem;
