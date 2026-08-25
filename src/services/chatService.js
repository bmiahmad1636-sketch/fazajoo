import { io } from "socket.io-client";
import { getAuthToken } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:6060/api";
const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");
let socket = null;
let socketToken = "";

async function request(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) throw new Error(data?.message || "ارتباط با پیام‌رسان فضاجو ناموفق بود.");
  return data;
}

function getSocket() {
  const token = getAuthToken();
  if (!token) return null;
  if (!socket || socketToken !== token) {
    if (socket) socket.disconnect();
    socketToken = token;
    socket = io(SOCKET_BASE_URL, { auth: { token }, transports: ["websocket", "polling"] });
  }
  if (!socket.connected) socket.connect();
  return socket;
}

export async function getChats(chatType = "personal") {
  const type = chatType === "agency" ? "agency" : "personal";
  return (await request(`/chats?type=${encodeURIComponent(type)}`)).chats || [];
}
export async function getChat(id) { return (await request(`/chats/${id}`)).chat; }
export async function createOrGetChat(spaceId, chatType = "personal") {
  const type = chatType === "agency" ? "agency" : "personal";
  return (
    await request("/chats", {
      method: "POST",
      body: JSON.stringify({ spaceId, chatType: type }),
    })
  ).chat;
}
export async function getMessages(chatId) { return (await request(`/chats/${chatId}/messages`)).messages || []; }
export async function sendMessage(chatId, text) { return (await request(`/chats/${chatId}/messages`, { method: "POST", body: JSON.stringify({ text }) })).message; }
export async function markChatRead(chatId) { return request(`/chats/${chatId}/read`, { method: "POST", body: "{}" }); }
export async function getUnreadCount(chatType = "personal") {
  const type = chatType === "agency" ? "agency" : "personal";
  return Number(
    (await request(`/chats/unread-count?type=${encodeURIComponent(type)}`)).unreadCount || 0
  );
}

export function subscribeInboxChanged(handler) {
  const s = getSocket();
  if (!s) return () => {};
  s.on("inbox:changed", handler);
  return () => s.off("inbox:changed", handler);
}

export function subscribeChat(chatId, { onMessage, onRead }) {
  const s = getSocket();
  if (!s || !chatId) return () => {};
  s.emit("chat:join", chatId);
  if (onMessage) s.on("chat:message", onMessage);
  if (onRead) s.on("chat:read", onRead);
  return () => {
    if (onMessage) s.off("chat:message", onMessage);
    if (onRead) s.off("chat:read", onRead);
    s.emit("chat:leave", chatId);
  };
}
