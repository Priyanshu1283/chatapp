"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UserList } from "@/components/UserList";
import { ChatPanel } from "@/components/ChatPanel";
import { useChatStore, type ChatUser } from "@/store/chatStore";

function DashboardContent() {
  const router = useRouter();
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
    router.replace(`/dashboard?chat=${user.id}`);
  };

  const handleBackToList = () => {
    setSelectedUser(null);
    setStoreSelected(null);
    router.replace("/dashboard");
  };

  return (
    <>
      {/* Mobile: show user list OR chat (full screen) */}
      <aside
        className={`w-full md:w-80 lg:w-96 border-r border-white/5 flex-col shrink-0
          ${selectedUser ? "hidden md:flex" : "flex"}
        `}
      >
        <UserList
          onSelectUser={handleSelectUser}
          selectedUser={selectedUser}
        />
      </aside>
      {/* Mobile: chat full screen when selected; Desktop: always visible */}
      <section
        className={`flex-1 flex min-w-0 min-h-0
          ${selectedUser ? "flex" : "hidden md:flex"}
        `}
      >
        <ChatPanel
          user={selectedUser}
          onBack={selectedUser ? handleBackToList : undefined}
        />
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
