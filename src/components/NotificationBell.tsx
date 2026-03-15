// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationStore, type UnreadItem } from "@/store/notificationStore";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { unread, setUnread, markRead } = useNotificationStore();

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/messages/unread");
        if (res.ok) {
          const data = await res.json();
          setUnread(data);
        }
      } catch {
        // ignore
      }
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => clearInterval(t);
  }, [setUnread]);

  const total = unread.reduce((acc, u) => acc + u.count, 0);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs flex items-center justify-center px-1">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] overflow-auto rounded-xl bg-surface-light border border-white/10 shadow-xl z-50 scrollbar-thin"
            >
              <div className="p-3 border-b border-white/5 font-medium text-sm text-gray-300">
                Unread messages
              </div>
              {unread.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No unread messages
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {unread.map((item: UnreadItem) => (
                    <li key={item.senderId}>
                      <Link
                        href={`/dashboard?chat=${item.senderId}`}
                        onClick={() => {
                          markRead(item.senderId);
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-white/5 transition block"
                      >
                        {item.senderAvatar ? (
                          <img
                            src={item.senderAvatar}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm">
                            {(item.senderName?.[0] ?? "?").toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {item.senderName} (@{item.senderUsername})
                          </p>
                          <p className="text-sm text-gray-400 truncate">
                            {item.count} new message{item.count > 1 ? "s" : ""}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
