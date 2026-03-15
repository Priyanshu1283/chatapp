/**
 * POST /api/messages/read - Mark messages from a sender as read.
 * Body: { senderId: string }
 */

export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Message } from "@/models/Message";

export async function POST(request: Request) {
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

    const body = await request.json();
    const senderId = body.senderId;
    if (!senderId) {
      return NextResponse.json(
        { error: "senderId is required" },
        { status: 400 }
      );
    }

    await Message.updateMany(
      {
        senderId,
        receiverId: currentUser._id.toString(),
        read: false,
      },
      { $set: { read: true } }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/messages/read", err);
    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
