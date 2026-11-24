import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const inboxJsx = read("src/pages/Inbox.jsx");
const inboxCss = read("src/pages/Inbox.css");
const inboxItemJsx = read("src/components/chat/InboxItem.jsx");
const inboxItemCss = read("src/components/chat/InboxItem.css");
const chatJsx = read("src/pages/Chat.jsx");
const chatCss = read("src/pages/Chat.css");

test("CM01 keeps inbox realtime/search logic and adds richer summary chips", () => {
  for (const token of [
    "subscribeInboxChanged(load)",
    "setSearchText",
    "inbox-toolbar__chips",
    "filteredUnreadCount",
    "unreadChatCount",
    "InboxItem",
  ]) assert.ok(inboxJsx.includes(token), token);
  assert.match(inboxCss, /\.inbox-toolbar__chips/);
  assert.match(inboxCss, /\.inbox-search input/);
});

test("CM01 inbox items preserve conversation route and add mode/status badges", () => {
  assert.match(inboxItemJsx, /conversationId=\$\{chat\.id\}/);
  assert.match(inboxItemJsx, /chat\.chatType === "agency" \? "&chatType=agency" : ""/);
  for (const token of [
    "inbox-item__image-badge",
    "inbox-item__status",
    "پیام جدید",
    "گفتگوی شخصی",
    "گفتگوی کاری",
  ]) assert.ok(inboxItemJsx.includes(token), token);
  assert.match(inboxItemCss, /\.inbox-item__image-badge/);
  assert.match(inboxItemCss, /\.inbox-item__status--unread/);
});

test("CM01 chat page keeps messaging logic and upgrades presentation only", () => {
  for (const token of [
    "createOrGetChat",
    "getChatLegalStatus",
    "deleteMessageForAll",
    "deleteMessageForMe",
    "chat-hero__security",
    "chat-box__stats",
    "chat-form__error",
    "chatHomePath",
  ]) assert.ok(chatJsx.includes(token), token);
  assert.match(chatCss, /\.chat-ad-card__meta/);
  assert.match(chatCss, /\.chat-box__stats/);
  assert.match(chatCss, /\.chat-info-pill/);
  assert.match(chatCss, /\.chat-form__error/);
});
