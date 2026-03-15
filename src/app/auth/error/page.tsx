"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "Something went wrong";

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="rounded-2xl bg-surface-light p-8 max-w-md w-full border border-white/5 text-center">
        <h1 className="text-xl font-bold text-red-400 mb-2">Authentication error</h1>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Link
          href="/auth/signin"
          className="inline-block rounded-lg bg-primary-600 px-4 py-2 text-white font-medium hover:bg-primary-500 transition"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-surface text-gray-400">Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
