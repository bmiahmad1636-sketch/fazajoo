import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth, db } from "../firebase";
import "./MessageBadge.css";

function MessageBadge({
  onNavigate,
}) {
  const [user, setUser] =
    useState(null);

  const [chats, setChats] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);

          if (!currentUser) {
            setChats([]);
            setLoading(false);
          }
        },
        (error) => {
          console.error(
            "Message badge authentication error:",
            error
          );

          setUser(null);
          setChats([]);
          setLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    setLoading(true);

    const chatsQuery = query(
      collection(db, "chats"),
      where(
        "participants",
        "array-contains",
        user.uid
      )
    );

    const unsubscribe =
      onSnapshot(
        chatsQuery,
        (snapshot) => {
          const chatItems =
            snapshot.docs.map(
              (chatDocument) => ({
                id:
                  chatDocument.id,

                ...chatDocument.data(),
              })
            );

          setChats(chatItems);
          setLoading(false);
        },
        (error) => {
          console.error(
            "Message badge load error:",
            error
          );

          setChats([]);
          setLoading(false);
        }
      );

    return unsubscribe;
  }, [user]);

  const unreadCount =
    useMemo(() => {
      if (!user) {
        return 0;
      }

      return chats.reduce(
        (
          totalUnread,
          chat
        ) => {
          const userUnreadCount =
            Number(
              chat.unreadCounts?.[
                user.uid
              ] || 0
            );

          return (
            totalUnread +
            userUnreadCount
          );
        },
        0
      );
    }, [
      chats,
      user,
    ]);

  if (!user) {
    return null;
  }

  return (
    <Link
      to="/inbox"
      className="message-badge"
      onClick={onNavigate}
      aria-label={
        unreadCount > 0
          ? `${unreadCount.toLocaleString(
              "fa-IR"
            )} پیام خوانده‌نشده`
          : "گفتگوهای من"
      }
      title="گفتگوهای من"
    >
      <span
        className="message-badge__icon"
        aria-hidden="true"
      >
        💬
      </span>

      <span className="message-badge__text">
        گفتگوهای من
      </span>

      {!loading &&
        unreadCount > 0 && (
          <span className="message-badge__count">
            {unreadCount > 99
              ? "+۹۹"
              : unreadCount.toLocaleString(
                  "fa-IR"
                )}
          </span>
        )}
    </Link>
  );
}

export default MessageBadge;