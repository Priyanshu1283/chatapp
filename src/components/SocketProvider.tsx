"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket";
import { useChatStore } from "@/store/chatStore";
import type { ChatMessage } from "@/store/chatStore";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const setSocketConnected = useChatStore((s) => s.setSocketConnected);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const setTyping = useChatStore((s) => s.setTyping);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    const socket = getSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("join", { userId: session.user!.id });
    });
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("receive_message", (msg: ChatMessage) => {
      const otherId =
        msg.senderId === session.user!.id ? msg.receiverId : msg.senderId;
      appendMessage(otherId, {
        ...msg,
        createdAt: typeof msg.createdAt === "string" ? msg.createdAt : (msg.createdAt as Date).toISOString(),
      });
    });

    socket.on("typing_start", (payload: { userId: string }) => {
      setTyping(payload.userId, true);
    });
    socket.on("typing_stop", (payload: { userId: string }) => {
      setTyping(payload.userId, false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("receive_message");
      socket.off("typing_start");
      socket.off("typing_stop");
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [status, session?.user?.id, setSocketConnected, appendMessage, setTyping]);

  return <>{children}</>;
}
