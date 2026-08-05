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

  const getUserTitle = (
    email = ""
  ) => {
    return email.split("@")[0];
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
      <div className="chat-page">
        <p>در حال بررسی حساب کاربری...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="chat-page">
        <h2>ورود لازم است</h2>

        <p>
          برای ارسال پیام ابتدا وارد
          حساب کاربری شوید.
        </p>

        <Link to="/login">
          ورود به حساب
        </Link>
      </div>
    );
  }

  if (!parking) {
    return (
      <div className="chat-page">
        <h2>
          آگهی پیدا نشد.
        </h2>

        <button
          type="button"
          onClick={() =>
            navigate(-1)
          }
        >
          بازگشت
        </button>
      </div>
    );
  }

  if (
    isOwner &&
    !requestedConversationId
  ) {
    return (
      <div className="chat-page">
        <h2>
          این آگهی متعلق به شماست.
        </h2>

        <p>
          برای پاسخ به متقاضیان،
          گفتگو را از بخش
          «گفتگوهای من» باز کنید.
        </p>

        <button
          type="button"
          onClick={() =>
            navigate(-1)
          }
        >
          بازگشت
        </button>
      </div>
    );
  }

  return (
    <section className="chat-page">
      <header className="chat-header">
        <div>
          <h2>
            {isOwner
              ? "پاسخ به متقاضی"
              : "پیام به آگهی‌دهنده"}
          </h2>

          <p>
            {chatMeta?.participantNames?.[
              recipientId
            ] ||
              "کاربر فضاجو"}
          </p>
        </div>
      </header>

      {chatError && (
        <p className="chat-error">
          {chatError}
        </p>
      )}

      <div className="chat-messages">
        {messagesLoading ? (
          <p>
            در حال دریافت
            پیام‌ها...
          </p>
        ) : (
          <>
            {messages.map(
              (message) => (
                <div
                  key={message.id}
                  className={
                    message.senderId ===
                    user.uid
                      ? "chat-message chat-message--mine"
                      : "chat-message"
                  }
                >
                  <p>
                    {message.text}
                  </p>
                </div>
              )
            )}

            <div
              ref={
                messagesEndRef
              }
            />
          </>
        )}
      </div>      <form
        className="chat-form"
        onSubmit={handleSubmit}
      >
        <textarea
          value={messageText}
          onChange={(event) =>
            setMessageText(
              event.target.value
            )
          }
          placeholder="پیام خود را بنویسید..."
          rows={3}
          maxLength={1000}
          disabled={sending}
        />

        <button
          type="submit"
          disabled={
            sending ||
            !messageText.trim()
          }
        >
          {sending
            ? "در حال ارسال..."
            : "ارسال پیام"}
        </button>
      </form>
    </section>
  );
}

export default Chat;