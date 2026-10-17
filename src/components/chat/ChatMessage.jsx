import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function ChatMessage({ message, isMine, isRead = false, onDelete, onDeleteForMe, deleting = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const popupRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, visibility: "hidden" });
  const hasActions = Boolean(onDeleteForMe || (isMine && !message.deletedForAllAt && onDelete));

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOutside = (event) => {
      if (!menuRef.current?.contains(event.target) && !popupRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [menuOpen]);

  useLayoutEffect(() => {
    if (!menuOpen || !buttonRef.current || !popupRef.current) return undefined;
    const updatePosition = () => {
      const anchor = buttonRef.current?.getBoundingClientRect();
      const popup = popupRef.current;
      if (!anchor || !popup) return;
      const gap = 6;
      const margin = 8;
      const width = popup.offsetWidth;
      const height = popup.offsetHeight;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      // Respect the scrollable conversation's visible bounds as well as the viewport.
      const scrollPane = buttonRef.current.closest('.chat-messages, .chat-conversation__messages, .chat-thread, .chat-window__messages');
      const paneBounds = scrollPane?.getBoundingClientRect();
      const bottomLimit = Math.min(viewportHeight - margin, paneBounds?.bottom ?? viewportHeight);
      const topLimit = Math.max(margin, paneBounds?.top ?? margin);
      const spaceBelow = bottomLimit - anchor.bottom;
      const spaceAbove = anchor.top - topLimit;
      const placeAbove = spaceBelow < height + gap && spaceAbove > spaceBelow;
      const preferredTop = placeAbove ? anchor.top - height - gap : anchor.bottom + gap;
      setMenuPosition({
        top: Math.max(margin, Math.min(preferredTop, viewportHeight - height - margin)),
        left: Math.max(margin, Math.min(anchor.right - width, viewportWidth - width - margin)),
        visibility: 'visible',
      });
    };
    updatePosition();
    const closeOnScroll = () => setMenuOpen(false);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [menuOpen]);

  const runAction = (action) => {
    setMenuOpen(false);
    action?.();
  };

  const formatTime = (createdAt) => {
    const date = createdAt ? new Date(createdAt) : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(date);
  };

  return (
    <div className={isMine ? "chat-message chat-message--mine" : "chat-message chat-message--other"}>
      <div className="chat-message__bubble">
        <p>{message.deletedForAllAt ? "این پیام حذف شده است" : message.text}</p>
        {hasActions && (
          <div className="chat-message__actions" ref={menuRef}>
            <button
              type="button"
              className="chat-message__more"
              ref={buttonRef}
              aria-label="گزینه‌های پیام"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              disabled={deleting}
              title="گزینه‌های پیام"
            >
              <span aria-hidden="true">⋯</span>
            </button>
            {menuOpen && createPortal(
              <div ref={popupRef} className="chat-message__menu" role="menu" aria-label="گزینه‌های حذف پیام" style={menuPosition}>
                {onDeleteForMe && (
                  <button type="button" role="menuitem" onClick={() => runAction(onDeleteForMe)} disabled={deleting}>
                    حذف برای من
                  </button>
                )}
                {isMine && !message.deletedForAllAt && onDelete && (
                  <button type="button" role="menuitem" onClick={() => runAction(onDelete)} disabled={deleting}>
                    حذف برای همه
                  </button>
                )}
              </div>,
              document.body
            )}
          </div>
        )}
        <div className="chat-message__meta">
          <span>{formatTime(message.createdAt)}</span>
          {isMine && (
            <span className="chat-message__status" aria-label={isRead ? "پیام خوانده شده" : "پیام ارسال شده"} title={isRead ? "خوانده شده" : "ارسال شده"}>
              {isRead ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
export default ChatMessage;
