/**
 * Socket.IO server: userId <-> socketId map, private messaging, typing, join/leave.
 * Events: join, send_message, receive_message, typing_start, typing_stop, disconnect.
 * Uses mongoose directly so this file can run under Node without loading TS.
 */

const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/chating-app";

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
const Message = mongoose.models?.Message || mongoose.model("Message", MessageSchema);

async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
}

// userId -> socketId (single socket per user for simplicity)
const userSockets = new Map();

function setupSocketServer(io) {
  io.on("connection", (socket) => {
    socket.on("join", async (payload) => {
      const userId = payload?.userId;
      if (!userId) return;
      userSockets.set(userId, socket.id);
      socket.userId = userId;
      socket.join(`user:${userId}`);
    });

    socket.on("send_message", async (payload) => {
      const { senderId, receiverId, message } = payload || {};
      if (!senderId || !receiverId || typeof message !== "string") return;
      try {
        await ensureDb();
        const doc = await Message.create({
          senderId,
          receiverId,
          message: message.trim(),
          read: false,
        });
        const receiverSocketId = userSockets.get(receiverId);
        const msg = {
          id: doc._id.toString(),
          senderId,
          receiverId,
          message: doc.message,
          createdAt: doc.createdAt,
          read: doc.read,
        };
        socket.emit("receive_message", msg);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", msg);
        }
      } catch (err) {
        console.error("send_message error", err);
        socket.emit("send_message_error", { error: "Failed to send message" });
      }
    });

    socket.on("typing_start", (payload) => {
      const { userId, targetUserId } = payload || {};
      if (!userId || !targetUserId) return;
      const targetSocketId = userSockets.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("typing_start", { userId });
      }
    });

    socket.on("typing_stop", (payload) => {
      const { userId, targetUserId } = payload || {};
      if (!userId || !targetUserId) return;
      const targetSocketId = userSockets.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("typing_stop", { userId });
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
      }
    });
  });
}

module.exports = { setupSocketServer, userSockets };
