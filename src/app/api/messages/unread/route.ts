/**
 * GET /api/messages/unread - List unread messages for current user (for notification bell).
 * Returns senders and counts / last message info.
 */

export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Message } from "@/models/Message";

export async function GET() {
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

    const receiverId = currentUser._id.toString();
    const unread = await Message.aggregate([
      { $match: { receiverId, read: false } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
          lastMessage: { $first: "$message" },
          lastAt: { $first: "$createdAt" },
        },
      },
    ]);

    const senderIds = unread.map((u) => u._id);
    const senders = await User.find({ _id: { $in: senderIds } })
      .select("_id name username avatar")
      .lean();

    const senderMap = Object.fromEntries(
      senders.map((s) => [s._id.toString(), s])
    );

    const list = unread.map((u) => {
      const sender = senderMap[u._id];
      return {
        senderId: u._id,
        senderName: sender?.name ?? "Unknown",
        senderUsername: sender?.username ?? "",
        senderAvatar: sender?.avatar,
        count: u.count,
        lastMessage: u.lastMessage,
        lastAt: u.lastAt,
      };
    });

    return NextResponse.json(list);
  } catch (err) {
    console.error("GET /api/messages/unread", err);
    return NextResponse.json(
      { error: "Failed to fetch unread messages" },
      { status: 500 }
    );
  }
}
