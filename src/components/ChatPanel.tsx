"use client";

import { useRef, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { getSocket } from "@/lib/socket";
import { useChatStore, type ChatUser, type ChatMessage } from "@/store/chatStore";
import { useNotificationStore } from "@/store/notificationStore";

function MessageBubble({
  msg,
  isOwn,
}: {
  msg: ChatMessage;
  isOwn: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isOwn
            ? "bg-primary-600 text-white rounded-br-md"
            : "bg-surface-light text-gray-100 rounded-bl-md"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
        <p
          className={`text-xs mt-1 ${
            isOwn ? "text-primary-200" : "text-gray-500"
          }`}
        >
          {new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="flex justify-start">
        <div className="h-10 w-48 rounded-2xl bg-surface-light animate-pulse" />
      </div>
      <div className="flex justify-end">
        <div className="h-10 w-36 rounded-2xl bg-surface-lighter animate-pulse" />
      </div>
      <div className="flex justify-start">
        <div className="h-12 w-56 rounded-2xl bg-surface-light animate-pulse" />
      </div>
    </div>
  );
}

export function ChatPanel({ user }: { user: ChatUser | null }) {
  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    messages,
    setMessages,
    appendMessage,
    typingUserIds,
    setTyping: setTypingStore,
  } = useChatStore();
  const markRead = useNotificationStore((s) => s.markRead);

  const list = user ? messages[user.id] ?? [] : [];

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [list.length]);

  // Load messages when selecting user and mark as read on server
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/messages?otherUserId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(
          user.id,
          data.map((m: ChatMessage) => ({
            ...m,
            createdAt: m.createdAt ?? new Date().toISOString(),
          }))
        );
        markRead(user.id);
        fetch("/api/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderId: user.id }),
        }).catch(() => {});
      })
      .catch(() => setMessages(user.id, []))
      .finally(() => setLoading(false));
  }, [user?.id, setMessages, markRead]);

  const otherTyping = user && typingUserIds.has(user.id);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !user || !session?.user?.id) return;
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      senderId: session.user.id,
      receiverId: user.id,
      message: text,
      createdAt: new Date().toISOString(),
      read: false,
    };
    appendMessage(user.id, optimisticMsg);
    setInput("");
    setTyping(false);
    const socket = getSocket();
    socket.emit("send_message", {
      senderId: session.user.id,
      receiverId: user.id,
      message: text,
    });
    socket.emit("typing_stop", {
      userId: session.user.id,
      targetUserId: user.id,
    });
  };

  const handleTyping = () => {
    if (!user || !session?.user?.id) return;
    const socket = getSocket();
    if (!typing) {
      setTyping(true);
      socket.emit("typing_start", {
        userId: session.user.id,
        targetUserId: user.id,
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      socket.emit("typing_stop", {
        userId: session.user.id,
        targetUserId: user.id,
      });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">Select a conversation</p>
          <p className="text-sm mt-1">Choose a user from the list to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-surface">
      <div className="h-14 px-4 flex items-center border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm">
              {(user.name?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-white">{user.name}</p>
            <p className="text-xs text-gray-400">@{user.username ?? "—"}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin p-4 space-y-3">
        {loading ? (
          <ChatSkeleton />
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
            <p>No messages yet.</p>
            <p className="mt-1">Send a message to start the conversation.</p>
          </div>
        ) : (
          list.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.senderId === session?.user?.id}
            />
          ))
        )}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-surface-light px-4 py-2 text-sm text-gray-400">
              typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 border-t border-white/5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-xl bg-surface-light border border-white/10 px-4 py-2.5 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-xl bg-primary-600 px-4 py-2.5 text-white font-medium hover:bg-primary-500 disabled:opacity-50 transition"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
