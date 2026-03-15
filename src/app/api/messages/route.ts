/**
 * GET /api/messages - Fetch conversation between current user and another user.
 * Query: otherUserId, limit, before (cursor for pagination).
 */

export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Message } from "@/models/Message";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get("otherUserId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
    const before = searchParams.get("before"); // message id or date for cursor

    if (!otherUserId) {
      return NextResponse.json(
        { error: "otherUserId is required" },
        { status: 400 }
      );
    }

    const query: {
      $or: Array<{ senderId: string; receiverId: string }>;
      createdAt?: { $lt: Date };
    } = {
      $or: [
        { senderId: currentUser._id.toString(), receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUser._id.toString() },
      ],
    };
    if (before) {
      const beforeDate = new Date(before);
      if (!Number.isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const list = messages.reverse().map((m) => ({
      id: m._id.toString(),
      senderId: m.senderId,
      receiverId: m.receiverId,
      message: m.message,
      createdAt: m.createdAt,
      read: m.read,
    }));

    return NextResponse.json(list);
  } catch (err) {
    console.error("GET /api/messages", err);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
