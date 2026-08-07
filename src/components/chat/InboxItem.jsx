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
  return (
    <Link
      to={`/chat/${chat.parkingId}?conversationId=${chat.id}`}
      className={[
        "inbox-item",
        isUnread
          ? "inbox-item--unread"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="inbox-item__image">
        {chat.parkingImageUrl ? (
          <img
            src={chat.parkingImageUrl}
            alt={
              chat.parkingTitle ||
              "تصویر آگهی"
            }
          />
        ) : (
          <span>
            🚘
          </span>
        )}

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
            <span className="inbox-item__role">
              {otherUserRole}
            </span>

            <strong>
              {otherUserName}
            </strong>
          </div>

          <div className="inbox-item__meta">
            <time>
              {formattedTime}
            </time>

            {unreadCount > 0 && (
              <span
                className="inbox-item__unread-count"
                aria-label={`${unreadCount} پیام خوانده‌نشده`}
              >
                {unreadCount > 99
                  ? "+۹۹"
                  : unreadCount.toLocaleString(
                      "fa-IR"
                    )}
              </span>
            )}
          </div>
        </div>

        <h3>
          {chat.parkingTitle ||
            "آگهی پارکینگ"}
        </h3>

        <div className="inbox-item__message-row">
          {isLastMessageMine && (
            <span className="inbox-item__sent-label">
              شما:
            </span>
          )}

          <p>
            {chat.lastMessage ||
              "هنوز پیامی در این گفتگو ارسال نشده است."}
          </p>
        </div>

        <div className="inbox-item__footer">
          <span>
            📍{" "}
            {chat.parkingCity ||
              "شهر ثبت نشده"}
          </span>

          <strong>
            ورود به گفتگو

            <span aria-hidden="true">
              ←
            </span>
          </strong>
        </div>
      </div>
    </Link>
  );
}

export default InboxItem;