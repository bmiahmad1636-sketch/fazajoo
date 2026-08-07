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

import InboxItem from "../components/chat/InboxItem";

import "./Inbox.css";

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

  const [searchText, setSearchText] =
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

  const getUserTitle = () => {
    if (!user?.email) {
      return "کاربر فضاجو";
    }

    return user.email
      .split("@")[0]
      .trim();
  };

  const getOtherUserId = (
    chat
  ) => {
    if (!user) {
      return "";
    }

    return (
      chat.participants?.find(
        (participantId) =>
          participantId !==
          user.uid
      ) || ""
    );
  };

  const getOtherUserName = (
    chat
  ) => {
    const otherUserId =
      getOtherUserId(chat);

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

  const getUnreadCount = (
    chat
  ) => {
    if (!user) {
      return 0;
    }

    return Number(
      chat.unreadCounts?.[
        user.uid
      ] || 0
    );
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

    const todayStart =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

    const chatDayStart =
      new Date(
        chatDate.getFullYear(),
        chatDate.getMonth(),
        chatDate.getDate()
      );

    const differenceInDays =
      Math.round(
        (
          todayStart -
          chatDayStart
        ) /
          (
            1000 *
            60 *
            60 *
            24
          )
      );

    if (differenceInDays === 0) {
      return new Intl.DateTimeFormat(
        "fa-IR",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(chatDate);
    }

    if (differenceInDays === 1) {
      return "دیروز";
    }

    if (
      differenceInDays > 1 &&
      differenceInDays < 7
    ) {
      return new Intl.DateTimeFormat(
        "fa-IR",
        {
          weekday: "long",
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

  const sortedChats =
    useMemo(() => {
      return [...chats].sort(
        (
          firstChat,
          secondChat
        ) => {
          const firstTime =
            firstChat.updatedAt
              ?.toMillis?.() || 0;

          const secondTime =
            secondChat.updatedAt
              ?.toMillis?.() || 0;

          return (
            secondTime -
            firstTime
          );
        }
      );
    }, [chats]);

  const filteredChats =
    useMemo(() => {
      const normalizedSearch =
        searchText
          .trim()
          .toLowerCase();

      if (!normalizedSearch) {
        return sortedChats;
      }

      return sortedChats.filter(
        (chat) => {
          const searchableValues = [
            chat.parkingTitle,
            chat.parkingCity,
            chat.lastMessage,
            getOtherUserName(chat),
            getOtherUserRole(chat),
          ];

          return searchableValues
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(
                  normalizedSearch
                )
            );
        }
      );
    }, [
      sortedChats,
      searchText,
      user,
    ]);

  const totalUnreadCount =
    useMemo(() => {
      if (!user) {
        return 0;
      }

      return chats.reduce(
        (
          total,
          chat
        ) =>
          total +
          getUnreadCount(chat),
        0
      );
    }, [
      chats,
      user,
    ]);

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
              <span>
                💬
              </span>

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

                <span>
                  ←
                </span>
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

          <div className="inbox-hero__stats">
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

            <div className="inbox-hero__count inbox-hero__count--unread">
              <strong>
                {totalUnreadCount.toLocaleString(
                  "fa-IR"
                )}
              </strong>

              <span>
                پیام جدید
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="inbox-content">
        <div className="container">
          <div className="inbox-heading">
            <div>
              <span>
                حساب{" "}
                {getUserTitle()}
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

              <span>
                ←
              </span>
            </Link>
          </div>

          <div className="inbox-toolbar">
            <div className="inbox-search">
              <span
                className="inbox-search__icon"
                aria-hidden="true"
              >
                🔍
              </span>

              <input
                type="text"
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value
                  )
                }
                placeholder="جستجو در گفتگوها، آگهی یا پیام‌ها..."
                aria-label="جستجو در گفتگوها"
              />

              {searchText && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchText("")
                  }
                  className="inbox-search__clear"
                  aria-label="پاک کردن جستجو"
                >
                  ×
                </button>
              )}
            </div>

            <div className="inbox-toolbar__info">
              <span>
                {filteredChats.length.toLocaleString(
                  "fa-IR"
                )}{" "}
                گفتگو
              </span>

              {totalUnreadCount > 0 && (
                <strong>
                  {totalUnreadCount.toLocaleString(
                    "fa-IR"
                  )}{" "}
                  پیام خوانده‌نشده
                </strong>
              )}
            </div>
          </div>

          {chatsError && (
            <div className="inbox-error">
              <span>
                ⚠
              </span>

              <p>
                {chatsError}
              </p>
            </div>
          )}

          {sortedChats.length === 0 ? (
            <div className="inbox-empty">
              <div className="inbox-empty__icon">
                💬
              </div>

              <span>
                هنوز گفتگویی ندارید
              </span>

              <h2>
                صندوق پیام‌های شما
                خالی است
              </h2>

              <p>
                از صفحه جزئیات یک
                آگهی، گزینه «ارسال
                پیام به آگهی‌دهنده»
                را انتخاب کنید.
              </p>

              <Link
                to="/parking"
                className="inbox-empty__button"
              >
                مشاهده آگهی‌ها

                <span>
                  ←
                </span>
              </Link>
            </div>
          ) : filteredChats.length ===
            0 ? (
            <div className="inbox-empty">
              <div className="inbox-empty__icon">
                🔍
              </div>

              <span>
                نتیجه‌ای پیدا نشد
              </span>

              <h2>
                گفتگویی مطابق جستجو
                وجود ندارد
              </h2>

              <p>
                عبارت دیگری جستجو
                کنید یا فیلتر جستجو
                را پاک کنید.
              </p>

              <button
                type="button"
                className="inbox-empty__button"
                onClick={() =>
                  setSearchText("")
                }
              >
                پاک کردن جستجو
              </button>
            </div>
          ) : (
            <div className="inbox-list">
              {filteredChats.map(
                (chat) => {
                  const unreadCount =
                    getUnreadCount(
                      chat
                    );

                  return (
                    <InboxItem
                      key={chat.id}
                      chat={chat}
                      otherUserName={
                        getOtherUserName(
                          chat
                        )
                      }
                      otherUserRole={
                        getOtherUserRole(
                          chat
                        )
                      }
                      formattedTime={
                        formatChatTime(
                          chat.updatedAt
                        )
                      }
                      unreadCount={
                        unreadCount
                      }
                      isUnread={
                        unreadCount > 0
                      }
                      isLastMessageMine={
                        chat.lastSenderId ===
                        user.uid
                      }
                    />
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Inbox;