// @ts-nocheck
"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-surface border-b border-white/5 shrink-0">
      <Link href="/dashboard" className="font-semibold text-lg text-white">
        Chat
      </Link>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="flex items-center gap-2">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
              {(session?.user?.name?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          <span className="text-sm text-gray-300 hidden sm:inline">
            {session?.user?.username || session?.user?.name}
          </span>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
