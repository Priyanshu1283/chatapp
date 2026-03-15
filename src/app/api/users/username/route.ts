/**
 * POST /api/users/username - Set or update username (must be unique).
 * Used after first login when user has no username.
 */

export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    if (!username || username.length < 2) {
      return NextResponse.json(
        { error: "Username must be at least 2 characters" },
        { status: 400 }
      );
    }

    const sanitized = username.replace(/\s+/g, "_").toLowerCase();
    await connectDB();

    const existing = await User.findOne({
      username: { $regex: new RegExp(`^${sanitized}$`, "i") },
    });
    if (existing && existing.email !== session.user.email) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: { username: sanitized } },
      { new: true }
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ username: user.username });
  } catch (err) {
    console.error("POST /api/users/username", err);
    return NextResponse.json(
      { error: "Failed to set username" },
      { status: 500 }
    );
  }
}
