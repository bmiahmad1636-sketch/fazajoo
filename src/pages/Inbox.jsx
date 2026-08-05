import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

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
import "./Inbox.css";
import InboxItem from "../components/chat/InboxItem";

function Inbox() {
  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [chats, setChats] =
    useState([]);

  const [chatsLoading, setChatsLoading] =
    useState(true);

  const [chatsError, setChatsError] =
    useState("");

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        },
        (error) => {
          console.error(
            "Inbox authentication error:",
            error
          );

          setUser(null);
          setAuthLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authLoading) {
      return undefined;
    }

    if (!user) {
      setChats([]);
      setChatsLoading(false);
      setChatsError("");

      return undefined;
    }

    setChatsLoading(true);
    setChatsError("");

    const chatsReference =
      collection(
        db,
        "chats"
      );

    const chatsQuery =
      query(
        chatsReference,
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
          setChatsLoading(false);
          setChatsError("");
        },
        (error) => {
          console.error(
            "Load inbox error:",
            error
          );

          setChats([]);
          setChatsLoading(false);

          setChatsError(
            "دریافت گفتگوها انجام نشد."
          );
        }
      );

    return unsubscribe;
  }, [
    authLoading,
    user,
  ]);

  const sortedChats =
    useMemo(() => {
      return [...chats].sort(
        (firstChat, secondChat) => {
          const firstTime =
            firstChat.updatedAt
              ?.toMillis?.() || 0;

          const secondTime =
            secondChat.updatedAt
              ?.toMillis?.() || 0;

          return secondTime - firstTime;
        }
      );
    }, [chats]);

  const getUserTitle = () => {
    if (!user?.email) {
      return "کاربر فضاجو";
    }

    return user.email
      .split("@")[0]
      .trim();
  };

  const getOtherUserName = (
    chat
  ) => {
    if (!user) {
      return "کاربر فضاجو";
    }

    const otherUserId =
      chat.participants?.find(
        (participantId) =>
          participantId !==
          user.uid
      );

    if (!otherUserId) {
      return "کاربر فضاجو";
    }

    return (
      chat.participantNames?.[
        otherUserId
      ] || "کاربر فضاجو"
    );
  };

  const getOtherUserRole = (
    chat
  ) => {
    if (!user) {
      return "";
    }

    if (
      user.uid ===
      chat.ownerId
    ) {
      return "متقاضی آگهی";
    }

    return "آگهی‌دهنده";
  };

  const formatChatTime = (
    updatedAt
  ) => {
    const chatDate =
      updatedAt?.toDate?.();

    if (!chatDate) {
      return "همین حالا";
    }

    const now = new Date();

    const isToday =
      chatDate.toDateString() ===
      now.toDateString();

    if (isToday) {
      return new Intl.DateTimeFormat(
        "fa-IR",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(chatDate);
    }

    return new Intl.DateTimeFormat(
      "fa-IR",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    ).format(chatDate);
  };

  if (
    authLoading ||
    chatsLoading
  ) {
    return (
      <main className="inbox-page">
        <section className="inbox-hero">
          <div className="container">
            <span className="inbox-hero__eyebrow">
              💬 پیام‌های فضاجو
            </span>

            <h1>
              گفتگوهای من
            </h1>

            <p>
              در حال دریافت گفتگوهای
              شما هستیم.
            </p>
          </div>
        </section>

        <section className="inbox-content">
          <div className="container">
            <div className="inbox-loading">
              <span>💬</span>

              <strong>
                کمی صبر کنید...
              </strong>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="inbox-page">
        <section className="inbox-hero">
          <div className="container">
            <span className="inbox-hero__eyebrow">
              💬 پیام‌های فضاجو
            </span>

            <h1>
              گفتگوهای من
            </h1>

            <p>
              برای مشاهده پیام‌ها وارد
              حساب کاربری شوید.
            </p>
          </div>
        </section>

        <section className="inbox-content">
          <div className="container">
            <div className="inbox-empty">
              <div className="inbox-empty__icon">
                🔐
              </div>

              <span>
                ورود لازم است
              </span>

              <h2>
                ابتدا وارد حساب شوید
              </h2>

              <p>
                گفتگوهای فضاجو فقط برای
                دو طرف گفتگو نمایش داده
                می‌شوند.
              </p>

              <Link
                to="/login"
                className="inbox-empty__button"
              >
                ورود به حساب
                <span>←</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="inbox-page">
      <section className="inbox-hero">
        <div className="inbox-hero__shape inbox-hero__shape--one" />
        <div className="inbox-hero__shape inbox-hero__shape--two" />

        <div className="container inbox-hero__content">
          <div>
            <span className="inbox-hero__eyebrow">
              💬 پیام‌های فضاجو
            </span>

            <h1>
              گفتگوهای من
            </h1>

            <p>
              همه پیام‌های مربوط به
              آگهی‌ها را از همین صفحه
              دنبال کنید.
            </p>
          </div>

          <div className="inbox-hero__count">
            <strong>
              {sortedChats.length.toLocaleString(
                "fa-IR"
              )}
            </strong>

            <span>
              گفتگوی فعال
            </span>
          </div>
        </div>
      </section>

      <section className="inbox-content">
        <div className="container">
          <div className="inbox-heading">
            <div>
              <span>
                حساب {getUserTitle()}
              </span>

              <h2>
                صندوق گفتگوها
              </h2>
            </div>

            <Link
              to="/parking"
              className="inbox-heading__link"
            >
              مشاهده آگهی‌ها
              <span>←</span>
            </Link>
          </div>

          {chatsError && (
            <div className="inbox-error">
              <span>⚠</span>

              <p>
                {chatsError}
              </p>
            </div>
          )}

          {sortedChats.length > 0 ? (
            <div className="inbox-list">
              {sortedChats.map(
                (chat) => (
                  <Link
                    key={chat.id}
                    to={`/chat/${chat.parkingId}?conversationId=${chat.id}`}
                    className="inbox-item"
                  >
                    <div className="inbox-item__image">
                      {chat.parkingImageUrl ? (
                        <img
                          src={
                            chat.parkingImageUrl
                          }
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
                    </div>

                    <div className="inbox-item__body">
                      <div className="inbox-item__top">
                        <div>
                          <span className="inbox-item__role">
                            {getOtherUserRole(
                              chat
                            )}
                          </span>

                          <strong>
                            {getOtherUserName(
                              chat
                            )}
                          </strong>
                        </div>

                        <time>
                          {formatChatTime(
                            chat.updatedAt
                          )}
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
                )
              )}
            </div>
          ) : (
            <div className="inbox-empty">
              <div className="inbox-empty__icon">
                💬
              </div>

              <span>
                هنوز گفتگویی ندارید
              </span>

              <h2>
                صندوق پیام‌های شما خالی است
              </h2>

              <p>
                از صفحه جزئیات یک آگهی،
                گزینه «ارسال پیام به
                آگهی‌دهنده» را انتخاب
                کنید.
              </p>

              <Link
                to="/parking"
                className="inbox-empty__button"
              >
                مشاهده آگهی‌ها
                <span>←</span>
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Inbox;