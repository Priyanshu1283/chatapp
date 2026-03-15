# Personal Chat Application

A modern real-time chat app for messaging friends. Built with Next.js (App Router), TypeScript, Tailwind CSS, Socket.io, MongoDB, and NextAuth.

## Features

- **Authentication**: Email/password sign up and sign in, Google OAuth
- **Username**: After login, choose a unique username (required to use the app)
- **Dashboard**: List of all users with search; click to open chat
- **Real-time chat**: WebSocket (Socket.io) for instant messaging
- **Messages stored in MongoDB**: Persisted and loaded on open
- **Unread notifications**: Bell icon in navbar; click to see unread senders and open chat
- **Typing indicator**: See when the other user is typing
- **Responsive UI**: Mobile and desktop with loading skeletons and empty states

## Tech Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Socket.io (custom Node server)
- MongoDB with Mongoose
- NextAuth (Credentials + Google)
- Zustand, Framer Motion

## Setup

1. **Clone and install**

   ```bash
   cd Chating_App
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env.local` and set:

   - `MONGODB_URI` – MongoDB connection string
   - `NEXTAUTH_URL` – e.g. `http://localhost:3000`
   - `NEXTAUTH_SECRET` – random secret (e.g. `openssl rand -base64 32`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – for Google login (optional)

3. **Run**

   ```bash
   npm run dev
   ```

   Opens at [http://localhost:3000](http://localhost:3000). Use **Sign up** to create an account or **Continue with Google**. After first login, set a username, then you can chat with other registered users.

## Scripts

- `npm run dev` – Start custom server (Next.js + Socket.io)
- `npm run build` – Build Next.js
- `npm start` – Production (run `node server.js` after build)
- `npm run lint` – ESLint

## Project structure

- `src/app` – App Router pages and API routes
- `src/components` – Navbar, UserList, ChatPanel, NotificationBell, SocketProvider
- `src/lib` – DB connection, auth config, socket client
- `src/models` – Mongoose User and Message
- `src/socket` – Socket.io server logic (used by `server.js`)
- `src/store` – Zustand chat and notification stores
- `server.js` – Custom HTTP server running Next.js + Socket.io

## Note

This app uses a **custom Node server** (`server.js`) so Socket.io can share the same HTTP server as Next.js. It cannot be deployed to Vercel (no long-lived WebSockets). Use a Node host (e.g. Railway, Render, or a VPS) for production.
