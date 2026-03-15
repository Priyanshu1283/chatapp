/**
 * Socket.IO client for browser. Connect with path matching server.
 * Uses a singleton so emit and listeners share the same connection.
 */

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("getSocket() can only be used in the browser");
  }
  if (!socket) {
    const url = window.location.origin;
    socket = io(url, {
      path: "/api/socketio",
      addTrailingSlash: false,
    });
  }
  return socket;
}
