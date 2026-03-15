/**
 * Message model for MongoDB.
 * Stores private messages between users with read status.
 */

import mongoose, { Schema, Model } from "mongoose";

export interface IMessage {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for fetching conversation and unread messages
MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
MessageSchema.index({ receiverId: 1, read: 1 });

export const Message: Model<IMessage> =
  mongoose.models.Message ?? mongoose.model<IMessage>("Message", MessageSchema);
