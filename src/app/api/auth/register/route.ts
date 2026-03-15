/**
 * POST /api/auth/register - Sign up with email and password.
 * Creates user and hashes password with bcrypt.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Valid email and password (min 6 characters) required" },
        { status: 400 }
      );
    }
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    await connectDB();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
    });

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      username: user.username,
    });
  } catch (err) {
    console.error("POST /api/auth/register", err);
    return NextResponse.json(
      { error: "Failed to register" },
      { status: 500 }
    );
  }
}
