function ChatMessage({
  message,
  isMine,
  isRead = false,
}) {
  const formatTime = (createdAt) => {
    const date =
      createdAt?.toDate?.();

    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "fa-IR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(date);
  };

  return (
    <div
      className={
        isMine
          ? "chat-message chat-message--mine"
          : "chat-message chat-message--other"
      }
    >
      <div className="chat-message__bubble">
        <p>
          {message.text}
        </p>

        <div className="chat-message__meta">
          <span>
            {formatTime(
              message.createdAt
            )}
          </span>

          {isMine && (
            <span
              className="chat-message__status"
              aria-label={
                isRead
                  ? "پیام خوانده شده"
                  : "پیام ارسال شده"
              }
              title={
                isRead
                  ? "خوانده شده"
                  : "ارسال شده"
              }
            >
              {isRead
                ? "✓✓"
                : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;