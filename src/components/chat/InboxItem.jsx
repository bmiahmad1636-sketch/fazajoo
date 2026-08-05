import { Link } from "react-router-dom";

import "./InboxItem.css";

function InboxItem({
  chat,
  otherUserName,
  otherUserRole,
  formattedTime,
}) {
  return (
    <Link
      to={`/chat/${chat.parkingId}?conversationId=${chat.id}`}
      className="inbox-item"
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
          <span>🚘</span>
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

          <time>
            {formattedTime}
          </time>
        </div>

        <h3>
          {chat.parkingTitle ||
            "آگهی پارکینگ"}
        </h3>

        <p>
          {chat.lastMessage ||
            "هنوز پیامی در این گفتگو ارسال نشده است."}
        </p>

        <div className="inbox-item__footer">
          <span>
            📍{" "}
            {chat.parkingCity ||
              "شهر ثبت نشده"}
          </span>

          <strong>
            ورود به گفتگو
            <span>←</span>
          </strong>
        </div>
      </div>
    </Link>
  );
}

export default InboxItem;