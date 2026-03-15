"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UserList } from "@/components/UserList";
import { ChatPanel } from "@/components/ChatPanel";
import { useChatStore, type ChatUser } from "@/store/chatStore";

function DashboardContent() {
  const searchParams = useSearchParams();
  const chatUserId = searchParams.get("chat");
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const { users, setSelectedUser: setStoreSelected } = useChatStore();

  useEffect(() => {
    if (chatUserId && users.length > 0) {
      const u = users.find((x) => x.id === chatUserId);
      if (u) {
        setSelectedUser(u);
        setStoreSelected(u);
      }
    }
  }, [chatUserId, users, setStoreSelected]);

  const handleSelectUser = (user: ChatUser) => {
    setSelectedUser(user);
    setStoreSelected(user);
  };

  return (
    <>
      <aside className="w-full md:w-80 lg:w-96 border-r border-white/5 flex flex-col shrink-0">
        <UserList
          onSelectUser={handleSelectUser}
          selectedUser={selectedUser}
        />
      </aside>
      <section className="flex-1 flex min-w-0">
        <ChatPanel user={selectedUser} />
      </section>
    </>
  );
}

export default function DashboardClient() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full">
          <div className="w-80 border-r border-white/5 p-4 space-y-3">
            <div className="h-10 bg-surface-light rounded animate-pulse" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-surface-light rounded animate-pulse" />
            ))}
          </div>
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Loading...
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
