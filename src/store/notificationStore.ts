/**
 * Zustand store for unread notifications (bell icon).
 */

import { create } from "zustand";

export interface UnreadItem {
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar?: string;
  count: number;
  lastMessage: string;
  lastAt: string;
}

interface NotificationState {
  unread: UnreadItem[];
  setUnread: (list: UnreadItem[]) => void;
  markRead: (senderId: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unread: [],
  setUnread: (unread) => set({ unread }),
  markRead: (senderId) => {
    set((state) => ({
      unread: state.unread.filter((u) => u.senderId !== senderId),
    }));
  },
}));
