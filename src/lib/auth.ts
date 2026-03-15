/**
 * NextAuth configuration: Credentials (email/password) + Google OAuth.
 * Callbacks add user id and username to session.
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const user = await User.findOne({ email: credentials.email });
        if (!user?.password) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.avatar ?? undefined,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      await connectDB();
      if (account?.provider === "google") {
        const existing = await User.findOne({ email: user.email! });
        if (!existing) {
          await User.create({
            name: user.name!,
            email: user.email!,
            avatar: user.image ?? undefined,
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        // Google gives provider id; we must use our MongoDB _id everywhere
        if (account?.provider === "google" && user.email) {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email })
            .select("_id username")
            .lean();
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.username = dbUser.username ?? null;
          } else {
            token.id = user.id;
            token.username = (user as { username?: string }).username ?? null;
          }
        } else {
          token.id = user.id;
          token.username = (user as { username?: string }).username ?? null;
        }
      }
      if (trigger === "update" && session?.username) {
        token.username = session.username;
      }
      // Ensure username is loaded from DB (e.g. after refresh)
      if (token.id && token.username == null) {
        await connectDB();
        const dbUser = await User.findById(token.id).select("username").lean();
        if (dbUser?.username) token.username = dbUser.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { username?: string }).username = token.username as
          | string
          | undefined;
      }
      return session;
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  events: {
    async signIn() {},
  },
  secret: process.env.NEXTAUTH_SECRET,
};
