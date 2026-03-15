"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useChatStore, type ChatUser } from "@/store/chatStore";

function UserListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg bg-surface animate-pulse"
        >
          <div className="w-10 h-10 rounded-full bg-surface-lighter" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-surface-lighter rounded mb-2" />
            <div className="h-3 w-16 bg-surface-lighter rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UserList({
  onSelectUser,
  selectedUser,
}: {
  onSelectUser: (user: ChatUser) => void;
  selectedUser: ChatUser | null;
}) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { users, setUsers, socketConnected } = useChatStore();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const q = search ? `?search=${encodeURIComponent(search)}` : "";
        const res = await fetch(`/api/users${q}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(
            data.map(
              (u: {
                id: string;
                name: string;
                username?: string;
                avatar?: string;
              }) => ({
                id: u.id,
                name: u.name,
                username: u.username,
                avatar: u.avatar,
                online: socketConnected,
              })
            )
          );
        }
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [search, setUsers, socketConnected]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-white/5">
        <input
          type="search"
          placeholder="Search by username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-surface border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
        />
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin">
        {loading ? (
          <UserListSkeleton />
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            {search ? "No users match your search." : "No other users yet."}
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {users.map((user) => (
              <motion.li
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                  selectedUser?.id === user.id
                    ? "bg-primary-600/30 text-white"
                    : "hover:bg-white/5"
                }`}
                onClick={() => onSelectUser(user)}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                    {(user.name?.[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    @{user.username ?? "—"}
                    {socketConnected && (
                      <span className="ml-1 text-green-400">• online</span>
                    )}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
