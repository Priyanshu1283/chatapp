/**
 * User model for MongoDB.
 * Stores user profile, auth data, and optional avatar.
 */

import mongoose, { Schema, Model } from "mongoose";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  avatar?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true, sparse: true },
    password: { type: String },
    avatar: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
