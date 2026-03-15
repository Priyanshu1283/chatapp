/**
 * Zustand store for chat UI: selected user, messages, typing, socket connection.
 */

import { create } from "zustand";

export interface ChatUser {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  online?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string | Date;
  read: boolean;
}

interface ChatState {
  users: ChatUser[];
  setUsers: (users: ChatUser[]) => void;
  selectedUser: ChatUser | null;
  setSelectedUser: (user: ChatUser | null) => void;
  messages: Record<string, ChatMessage[]>;
  appendMessage: (otherUserId: string, message: ChatMessage) => void;
  setMessages: (otherUserId: string, messages: ChatMessage[]) => void;
  typingUserIds: Set<string>;
  setTyping: (userId: string, typing: boolean) => void;
  socketConnected: boolean;
  setSocketConnected: (v: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  users: [],
  setUsers: (users) => set({ users }),
  selectedUser: null,
  setSelectedUser: (selectedUser) => set({ selectedUser }),
  messages: {},
  appendMessage: (otherUserId, message) => {
    set((state) => {
      const list = state.messages[otherUserId] ?? [];
      if (list.some((m) => m.id === message.id)) return state;
      // When real message arrives, remove matching optimistic (temp-*) message
      const isReal = !String(message.id).startsWith("temp-");
      const filtered = isReal
        ? list.filter(
            (m) =>
              !(
                String(m.id).startsWith("temp-") &&
                m.message === message.message &&
                m.senderId === message.senderId
              )
          )
        : list;
      return {
        messages: {
          ...state.messages,
          [otherUserId]: [...filtered, message],
        },
      };
    });
  },
  setMessages: (otherUserId, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [otherUserId]: messages,
      },
    }));
  },
  typingUserIds: new Set(),
  setTyping: (userId, typing) => {
    set((state) => {
      const next = new Set(state.typingUserIds);
      if (typing) next.add(userId);
      else next.delete(userId);
      return { typingUserIds: next };
    });
  },
  socketConnected: false,
  setSocketConnected: (socketConnected) => set({ socketConnected }),
}));
