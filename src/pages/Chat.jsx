import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth, db } from "../firebase";
import ChatMessage from "../components/chat/ChatMessage";
import "./Chat.css";

function Chat({
  parkings = [],
}) {
  const { parkingId } = useParams();

  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const messagesEndRef = useRef(null);

  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [messages, setMessages] =
    useState([]);

  const [messagesLoading, setMessagesLoading] =
    useState(true);

  const [messageText, setMessageText] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [chatError, setChatError] =
    useState("");

  const [chatReady, setChatReady] =
    useState(false);

  const [chatMeta, setChatMeta] =
    useState(null);

  const parking = useMemo(() => {
    return parkings.find(
      (item) =>
        String(item.id) ===
        String(parkingId)
    );
  }, [
    parkings,
    parkingId,
  ]);

  const ownerId =
    parking?.ownerId || "";

  const isOwner =
    Boolean(user) &&
    Boolean(ownerId) &&
    user.uid === ownerId;

  const requestedConversationId =
    searchParams.get(
      "conversationId"
    ) || "";

  const conversationId =
    useMemo(() => {
      if (
        requestedConversationId
      ) {
        return requestedConversationId;
      }

      if (
        !user?.uid ||
        !ownerId ||
        !parkingId ||
        isOwner
      ) {
        return "";
      }

      const participantIds = [
        user.uid,
        ownerId,
      ].sort();

      return [
        String(parkingId),
        ...participantIds,
      ].join("_");
    }, [
      requestedConversationId,
      user,
      ownerId,
      parkingId,
      isOwner,
    ]);

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
            "Chat authentication error:",
            error
          );

          setUser(null);
          setAuthLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const prepareChat = async () => {
      if (
        authLoading ||
        !user ||
        !parking ||
        !ownerId ||
        !conversationId ||
        isOwner
      ) {
        if (isMounted) {
          setChatReady(false);
        }

        return;
      }

      setChatError("");

      try {
        const chatReference = doc(
          db,
          "chats",
          conversationId
        );

        await setDoc(
          chatReference,
          {
            parkingId:
              String(parkingId),

            parkingTitle:
              parking.title ||
              "آگهی پارکینگ",

            parkingCity:
              parking.city || "",

            parkingImageUrl:
              parking.imageUrl || "",

            ownerId,

            requesterId:
              user.uid,

            participants: [
              ownerId,
              user.uid,
            ],

            participantNames: {
              [ownerId]:
                parking.ownerEmail
                  ? getUserTitle(
                      parking.ownerEmail
                    )
                  : "آگهی‌دهنده",

              [user.uid]:
                getUserTitle(
                  user.email
                ),
            },
          },
          {
            merge: true,
          }
        );

        if (isMounted) {
          setChatReady(true);
        }
      } catch (error) {
        console.error(
          "Prepare chat error:",
          error
        );

        if (isMounted) {
          setChatReady(false);

          setChatError(
            "آماده‌سازی گفتگو انجام نشد."
          );
        }
      }
    };

    prepareChat();

    return () => {
      isMounted = false;
    };
  }, [
    authLoading,
    user,
    parking,
    ownerId,
    conversationId,
    isOwner,
    parkingId,
  ]);  useEffect(() => {
    if (
      authLoading ||
      !user ||
      !conversationId
    ) {
      setChatMeta(null);

      return undefined;
    }

    const chatReference = doc(
      db,
      "chats",
      conversationId
    );

    const unsubscribe = onSnapshot(
      chatReference,
      (snapshot) => {
        if (!snapshot.exists()) {
          setChatMeta(null);
          return;
        }

        const data = snapshot.data();

        if (
          !data.participants?.includes(
            user.uid
          )
        ) {
          setChatMeta(null);
          setChatReady(false);

          setChatError(
            "شما اجازه مشاهده این گفتگو را ندارید."
          );

          return;
        }

        setChatMeta({
          id: snapshot.id,
          ...data,
        });

        setChatReady(true);
      },
      (error) => {
        console.error(
          "Load chat information error:",
          error
        );

        setChatMeta(null);
        setChatReady(false);

        setChatError(
          "دریافت اطلاعات گفتگو انجام نشد."
        );
      }
    );

    return unsubscribe;
  }, [
    authLoading,
    user,
    conversationId,
  ]);

  useEffect(() => {
    if (
      !user ||
      !conversationId ||
      !chatReady
    ) {
      return;
    }

    const markConversationAsRead =
      async () => {
        try {
          await updateDoc(
            doc(
              db,
              "chats",
              conversationId
            ),
            {
              [`unreadCounts.${user.uid}`]:
                0,

              [`lastReadAt.${user.uid}`]:
                serverTimestamp(),
            }
          );
        } catch (error) {
          console.error(
            "Mark conversation as read error:",
            error
          );
        }
      };

    markConversationAsRead();
  }, [
    user,
    conversationId,
    chatReady,
    messages.length,
  ]);

  useEffect(() => {
    if (
      authLoading ||
      !user ||
      !conversationId ||
      !chatReady
    ) {
      setMessages([]);
      setMessagesLoading(false);

      return undefined;
    }

    setMessagesLoading(true);
    setChatError("");

    const messagesReference =
      collection(
        db,
        "chats",
        conversationId,
        "messages"
      );

    const messagesQuery =
      query(
        messagesReference,
        orderBy(
          "createdAt",
          "asc"
        )
      );

    const unsubscribe =
      onSnapshot(
        messagesQuery,
        (snapshot) => {
          const messageItems =
            snapshot.docs.map(
              (messageDocument) => ({
                id:
                  messageDocument.id,

                ...messageDocument.data(),
              })
            );

          setMessages(
            messageItems
          );

          setMessagesLoading(
            false
          );
        },
        (error) => {
          console.error(
            "Load chat messages error:",
            error
          );

          setMessages([]);
          setMessagesLoading(false);

          setChatError(
            "دریافت پیام‌ها انجام نشد."
          );
        }
      );

    return unsubscribe;
  }, [
    authLoading,
    user,
    conversationId,
    chatReady,
  ]);  const recipientId =
    useMemo(() => {
      if (!user) {
        return "";
      }

      return (
        chatMeta?.participants?.find(
          (participantId) =>
            participantId !== user.uid
        ) ||
        (user.uid === ownerId
          ? chatMeta?.requesterId || ""
          : ownerId)
      );
    }, [
      chatMeta,
      user,
      ownerId,
    ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const isMessageRead = (
    message
  ) => {
    if (
      !recipientId ||
      message.senderId !== user?.uid
    ) {
      return false;
    }

    const messageTime =
      message.createdAt
        ?.toMillis?.();

    const recipientReadTime =
      chatMeta?.lastReadAt?.[
        recipientId
      ]?.toMillis?.();

    if (
      !messageTime ||
      !recipientReadTime
    ) {
      return false;
    }

    return (
      recipientReadTime >=
      messageTime
    );
  };

  const getUserTitle = (
    email = ""
  ) => {
    return email.split("@")[0];
  };

  const getMessageDate = (createdAt) => {
    return createdAt?.toDate?.() || null;
  };

  const isSameDay = (firstDate, secondDate) => {
    if (!firstDate || !secondDate) {
      return false;
    }

    return (
      firstDate.getFullYear() === secondDate.getFullYear() &&
      firstDate.getMonth() === secondDate.getMonth() &&
      firstDate.getDate() === secondDate.getDate()
    );
  };

  const formatMessageDate = (createdAt) => {
    const date = getMessageDate(createdAt);

    if (!date) {
      return "";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const messageDay = new Date(date);
    messageDay.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDay.getTime() === today.getTime()) {
      return "امروز";
    }

    if (messageDay.getTime() === yesterday.getTime()) {
      return "دیروز";
    }

    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const shouldShowDateSeparator = (message, previousMessage) => {
    const currentDate = getMessageDate(message?.createdAt);

    if (!currentDate) {
      return false;
    }

    if (!previousMessage) {
      return true;
    }

    const previousDate = getMessageDate(previousMessage?.createdAt);

    if (!previousDate) {
      return true;
    }

    return !isSameDay(currentDate, previousDate);
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const trimmedMessage =
      messageText.trim();

    if (!trimmedMessage) {
      return;
    }

    if (
      isOwner &&
      !requestedConversationId
    ) {
      alert(
        "برای پاسخ به متقاضی، گفتگو را از بخش «گفتگوهای من» باز کنید."
      );

      return;
    }

    if (!recipientId) {
      alert(
        "طرف مقابل گفتگو مشخص نیست."
      );

      return;
    }

    setSending(true);

    try {
      const messagesReference =
        collection(
          db,
          "chats",
          conversationId,
          "messages"
        );

      await addDoc(
        messagesReference,
        {
          text: trimmedMessage,

          senderId: user.uid,

          senderName:
            getUserTitle(
              user.email
            ),

          createdAt:
            serverTimestamp(),
        }
      );

      await updateDoc(
        doc(
          db,
          "chats",
          conversationId
        ),
        {
          lastMessage:
            trimmedMessage,

          lastSenderId:
            user.uid,

          [`unreadCounts.${recipientId}`]:
            increment(1),

          [`unreadCounts.${user.uid}`]:
            0,

          updatedAt:
            serverTimestamp(),
        }
      );

      setMessageText("");
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      alert(
        "ارسال پیام انجام نشد."
      );
    } finally {
      setSending(false);
    }
  };  if (authLoading) {
    return (
      <main className="chat-page">
        <div className="container">
          <div className="chat-state-card">
            <span>💬</span>
            <h1>در حال آماده‌سازی گفتگو</h1>
            <p>چند لحظه صبر کنید تا اطلاعات حساب و گفتگو بررسی شود.</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="chat-page">
        <div className="container">
          <div className="chat-state-card">
            <span>🔐</span>
            <h1>ورود لازم است</h1>
            <p>برای مشاهده و ارسال پیام ابتدا وارد حساب کاربری خود شوید.</p>
            <Link to="/login" className="chat-state-card__button">
              ورود به حساب
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!parking) {
    return (
      <main className="chat-page">
        <div className="container">
          <div className="chat-state-card">
            <span>🔎</span>
            <h1>آگهی پیدا نشد</h1>
            <p>ممکن است آگهی حذف شده باشد یا نشانی آن درست نباشد.</p>
            <button
              type="button"
              className="chat-state-card__button"
              onClick={() => navigate(-1)}
            >
              بازگشت
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (isOwner && !requestedConversationId) {
    return (
      <main className="chat-page">
        <div className="container">
          <div className="chat-state-card">
            <span>📨</span>
            <h1>این آگهی متعلق به شماست</h1>
            <p>
              برای پاسخ به متقاضیان، گفتگو را از بخش «گفتگوهای من» باز کنید.
            </p>
            <Link to="/inbox" className="chat-state-card__button">
              رفتن به گفتگوهای من
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const recipientName =
    chatMeta?.participantNames?.[recipientId] || "کاربر فضاجو";

  return (
    <main className="chat-page">
      <section className="chat-hero">
        <div className="container">
          <button
            type="button"
            className="chat-hero__back"
            onClick={() => navigate(-1)}
          >
            <span>→</span>
            بازگشت
          </button>

          <div className="chat-hero__content">
            <div>
              <span className="chat-hero__eyebrow">گفتگوی امن در فضاجو</span>
              <h1>{isOwner ? "پاسخ به متقاضی" : "پیام به آگهی‌دهنده"}</h1>
              <p>
                درباره همین آگهی گفتگو کنید و برای حفظ امنیت، اطلاعات حساس را
                فقط در صورت نیاز به اشتراک بگذارید.
              </p>
            </div>

            <div className="chat-hero__security">
              <span>🛡️</span>
              <div>
                <strong>گفتگوی مستقیم</strong>
                <small>بین دو طرف همین آگهی</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="chat-content">
        <div className="container">
          <div className="chat-layout">
            <aside className="chat-ad-card">
              <div className="chat-ad-card__image">
                {parking.imageUrl ? (
                  <img
                    src={parking.imageUrl}
                    alt={parking.title || "تصویر آگهی"}
                  />
                ) : (
                  <span>🚘</span>
                )}
              </div>

              <div className="chat-ad-card__body">
                <span>آگهی مورد گفتگو</span>
                <h2>{parking.title || "آگهی پارکینگ"}</h2>
                <p>📍 {parking.city || "شهر ثبت نشده"}</p>
                <strong>{parking.price || "قیمت توافقی"}</strong>
                <Link to={`/parking/${parkingId}`}>مشاهده جزئیات آگهی</Link>
              </div>

              <div className="chat-ad-card__notice">
                <span>💡</span>
                <p>
                  پیش از هر توافق، مشخصات آگهی و شرایط معامله را بررسی کنید.
                </p>
              </div>
            </aside>

            <section className="chat-box">
              <header className="chat-box__header">
                <div className="chat-box__avatar">
                  {recipientName.slice(0, 1)}
                </div>
                <div>
                  <strong>{recipientName}</strong>
                  <span>{parking.title || "گفتگوی آگهی"}</span>
                </div>
              </header>

              {chatError && (
                <div className="chat-box__error">
                  <span>⚠️</span>
                  <p>{chatError}</p>
                </div>
              )}

              <div className="chat-box__messages">
                {messagesLoading ? (
                  <div className="chat-box__loading">
                    <span>💬</span>
                    <p>در حال دریافت پیام‌ها...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-box__empty">
                    <span>👋</span>
                    <h2>شروع گفتگو</h2>
                    <p>
                      هنوز پیامی رد و بدل نشده است. اولین پیام را درباره این آگهی
                      ارسال کنید.
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => {
                      const previousMessage =
                        index > 0 ? messages[index - 1] : null;

                      const showDateSeparator =
                        shouldShowDateSeparator(
                          message,
                          previousMessage
                        );

                      return (
                        <div
                          className="chat-message-row"
                          key={message.id}
                        >
                          {showDateSeparator && (
                            <div className="chat-date-separator">
                              <span>
                                {formatMessageDate(message.createdAt)}
                              </span>
                            </div>
                          )}

                          <ChatMessage
                            message={message}
                            isMine={message.senderId === user.uid}
                            isRead={isMessageRead(message)}
                          />
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <form className="chat-form" onSubmit={handleSubmit}>
                <textarea
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="پیام خود را بنویسید..."
                  rows={3}
                  maxLength={1000}
                  disabled={sending}
                />

                <div className="chat-form__footer">
                  <span>{messageText.length}/1000</span>
                  <button
                    type="submit"
                    disabled={sending || !messageText.trim()}
                  >
                    <span>✉️</span>
                    {sending ? "در حال ارسال..." : "ارسال پیام"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Chat;