/**
 * GET /api/users - List all users (excluding current user).
 * Used by dashboard to show user list and search.
 */

export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

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
    const search = searchParams.get("search")?.trim().toLowerCase() ?? "";

    const filter: Record<string, unknown> = {
      _id: { $ne: currentUser._id },
      username: { $exists: true, $nin: [null, ""] },
    };
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("_id name username avatar createdAt")
      .sort({ username: 1 })
      .lean();

    const list = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      username: u.username,
      avatar: u.avatar,
      createdAt: u.createdAt,
    }));

    return NextResponse.json(list);
  } catch (err) {
    console.error("GET /api/users", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
