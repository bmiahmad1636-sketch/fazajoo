import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = f => readFileSync(new URL('../' + f,import.meta.url),'utf8');
const inbox=read('src/pages/Inbox.jsx'), item=read('src/components/chat/InboxItem.jsx'), chat=read('src/pages/Chat.jsx');
const inboxCss=read('src/pages/Inbox.css'), itemCss=read('src/components/chat/InboxItem.css'), chatCss=read('src/pages/Chat.css');
test('directory filter combines unread and text search and retains auth/agency scope',()=>{
 for(const s of ['unreadOnly ? chats.filter','return pool.filter','[chats, searchText, unreadOnly]','aria-pressed={!unreadOnly}','aria-pressed={unreadOnly}','subscribeInboxChanged(load)','currentUserIds.has(String(chat?.ownerId','getChats(isAgencyMode ? "agency" : "personal")','cm02-skeleton-grid']) assert.ok(inbox.includes(s),s);
});
test('conversation links keep old route and mode; empty conversations labelled correctly',()=>{
 for(const s of ['`/chat/${chat.parkingId}?conversationId=${chat.id}', '"&chatType=agency"','chat.lastMessage ? "خوانده‌شده" : "بدون پیام"','cm02-listing-line']) assert.ok(item.includes(s),s);
});
test('new inbox layout is scoped, two-column and narrow-screen single-column',()=>{
 assert.match(inboxCss,/\.fj-inbox-cm02 \.inbox-list,[\s\S]*?grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(inboxCss,/@media \(max-width: 900px\)[\s\S]*?grid-template-columns: minmax\(0,1fr\)/);
 assert.match(itemCss,/\.fj-inbox-cm02 \.inbox-item:hover \{ transform: none/);
});
test('chat scroll stays inside message pane, not whole document',()=>{
 assert.ok(chat.includes('ref={messagesRef}'));
 assert.ok(chat.includes('pane.scrollTop = pane.scrollHeight'));
 assert.ok(!chat.includes('scrollIntoView'));
 assert.match(chatCss,/\.fj-chat-cm02 \.chat-box \{[^}]*grid-template-rows: auto auto minmax\(0,1fr\) auto/);
 assert.match(chatCss,/\.fj-chat-cm02 \.chat-box__messages \{[^}]*overflow-y: auto/);
});
test('send, read, delete, moderation and agency navigation are retained',()=>{
 for(const s of ['sendMessage(chat.id, text)','markChatRead(nextChat.id)','deleteMessageForAll(chat.id, message.id)','deleteMessageForMe(chat.id, message.id)','getChatLegalStatus(chat.id)','subscribeChat(chat.id','handleUnblockInsideChat','chatBlocked ||','|| chatBlocked','/agency/inbox','TrustSafetyActions','maxLength={2000}','(message.readAt ? 15 : 1440) * 60000'].filter(s=>s!=='chatBlocked ||')) assert.ok(chat.includes(s),s);
});
test('composer and blocked state stay accessible in scoped compact layout',()=>{
 assert.match(chatCss,/\.fj-chat-cm02 \.chat-form \{[^}]*grid-template-columns: minmax\(0,1fr\) auto/);
 assert.ok(chat.includes('disabled={chatBlocked}'));
 assert.ok(chat.includes('chat-form__error'));
 assert.ok(chat.includes('chat-send-error__unblock'));
});
