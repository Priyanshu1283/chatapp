# Chat App – Flow & Architecture

This document describes the end-to-end flow and architecture of the personal chat application in one place.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │ Next.js App │  │ Zustand     │  │ Socket.io   │  │ NextAuth Session  │  │
│  │ (React)     │  │ (chat +     │  │ Client      │  │ (JWT)             │  │
│  │             │  │ notifications)│  │             │  │                  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬───────────┘  │
│         │                │                │                   │              │
└─────────┼────────────────┼────────────────┼───────────────────┼──────────────┘
          │                │                │                   │
          │ HTTP           │ (state)        │ WebSocket         │ HTTP (cookies)
          ▼                ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CUSTOM NODE SERVER (server.js)                            │
│  ┌──────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Next.js Request Handler      │  │ Socket.io Server                      │  │
│  │ (Pages, API routes, Auth)    │  │ (src/socket/server.js)                │  │
│  │                              │  │ • userId ↔ socketId map               │  │
│  │ • /api/auth/*, /api/users/*   │  │ • send_message, receive_message      │  │
│  │ • /api/messages/*, /dashboard│  │ • typing_start, typing_stop            │  │
│  └──────────────┬───────────────┘  └────────────────┬────────────────────┘  │
│                 │                                     │                      │
└─────────────────┼─────────────────────────────────────┼──────────────────────┘
                  │                                     │
                  ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MongoDB                                            │
│  ┌─────────────────┐  ┌─────────────────────────────────────────────────┐  │
│  │ User            │  │ Message                                          │  │
│  │ name, email,    │  │ senderId, receiverId, message, createdAt, read    │  │
│  │ username,       │  │                                                  │  │
│  │ avatar, password│  │                                                  │  │
│  └─────────────────┘  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Flow

### 2.1 Sign Up (Email + Password)

```
User → /auth/signin (tab: Sign up)
  → Enter name, email, password
  → POST /api/auth/register
      → connectDB()
      → Check User exists by email
      → bcrypt.hash(password)
      → User.create({ name, email, password })
  → signIn("credentials", { email, password })
  → NextAuth: GET /api/auth/session, JWT created
  → authorize() in auth.ts: User.findOne, bcrypt.compare
  → jwt() callback: token.id = user.id, token.username = user.username
  → session() callback: session.user.id, session.user.username
  → Redirect: if !username → /auth/set-username else → /dashboard
```

### 2.2 Sign In (Credentials)

```
User → /auth/signin (tab: Sign in)
  → Enter email, password
  → signIn("credentials", { email, password })
  → authorize(): User.findOne({ email }), bcrypt.compare
  → jwt(): token.id, token.username (from DB user)
  → If token.username missing: fetch User by id, set token.username
  → Redirect: !username ? /auth/set-username : /dashboard
```

### 2.3 Google OAuth

```
User → Click "Continue with Google"
  → signIn("google", { callbackUrl: "/dashboard" })
  → NextAuth redirects to Google
  → After consent → callback to /api/auth/callback/google
  → signIn() callback: User.findOne({ email }), if !existing → User.create({ name, email, avatar })
  → jwt(): token.id from provider, token.username from DB (or null)
  → Redirect: !username ? /auth/set-username : /dashboard
```

### 2.4 Set Username (First-Time / Missing Username)

```
User → /auth/set-username (redirect if session.user.username is null)
  → Enter username
  → POST /api/users/username { username }
      → getServerSession(), connectDB()
      → Check unique: User.findOne({ username: regex }), exclude current email
      → User.findOneAndUpdate({ email }, { $set: { username } })
  → router.push("/dashboard"), router.refresh()
  → Session can be updated (optional) so JWT gets new username on next request
```

### 2.5 Session & Protected Routes

```
Every request to /dashboard/*
  → getServerSession(authOptions) in dashboard/layout.tsx
  → No session → redirect("/auth/signin")
  → session.user.username missing → redirect("/auth/set-username")
  → Else: render layout (Navbar + SocketProvider) and children
```

---

## 3. Dashboard & User List Flow

```
User lands on /dashboard
  → DashboardLayout: session check, username check, render SocketProvider + Navbar + children
  → DashboardPage → DashboardClient (Suspense) → DashboardContent
  → UserList mounts
      → useEffect: GET /api/users?search=...
          → getServerSession(), connectDB(), User.find({ _id ≠ current, username exists, optional search })
          → setUsers(data)
      → Search input: onChange → same GET /api/users?search=... → setUsers
  → User clicks a user in list
      → onSelectUser(user) → setSelectedUser(user), setStoreSelected(user)
  → ChatPanel receives selectedUser
      → If no user: show "Select a conversation"
      → If user: load messages + mark read (see Section 5)
```

---

## 4. WebSocket (Socket.io) Flow

### 4.1 Connection & Join

```
Client (SocketProvider)
  → status === "authenticated" && session?.user?.id
  → getSocket() → io(origin, { path: "/api/socketio" })
  → socket.on("connect")
      → setSocketConnected(true)
      → socket.emit("join", { userId: session.user.id })
  → Server (src/socket/server.js)
      → on("join", { userId })
      → userSockets.set(userId, socket.id)
      → socket.userId = userId
      → socket.join(`user:${userId}`)
  → On disconnect: userSockets.delete(socket.userId), setSocketConnected(false)
```

### 4.2 Send Message

```
User types and clicks Send (or Enter) in ChatPanel
  → getSocket().emit("send_message", { senderId, receiverId, message })
  → Server
      → ensureDb() (mongoose.connect if needed)
      → Message.create({ senderId, receiverId, message, read: false })
      → msg = { id, senderId, receiverId, message, createdAt, read }
      → socket.emit("receive_message", msg)  // echo to sender
      → receiverSocketId = userSockets.get(receiverId)
      → if (receiverSocketId) io.to(receiverSocketId).emit("receive_message", msg)
  → Client (SocketProvider)
      → socket.on("receive_message", msg)
      → otherId = msg.senderId === myId ? msg.receiverId : msg.senderId
      → appendMessage(otherId, msg)  // Zustand chatStore
  → ChatPanel re-renders (messages from store), scroll to bottom
```

### 4.3 Typing Indicator

```
User types in input (ChatPanel)
  → onChange → handleTyping()
  → If !typing: setTyping(true), socket.emit("typing_start", { userId, targetUserId })
  → Clear previous timeout; set timeout 2s → socket.emit("typing_stop", ...), setTyping(false)
  → Server
      → on("typing_start") → io.to(userSockets.get(targetUserId)).emit("typing_start", { userId })
      → on("typing_stop")  → io.to(...).emit("typing_stop", { userId })
  → Other client: socket.on("typing_start/typing_stop") → setTyping(userId, true/false) in chatStore
  → ChatPanel: otherTyping = typingUserIds.has(user.id) → show "typing..." bubble
```

---

## 5. Chat Panel & Messages Flow

### 5.1 Opening a Chat (Load History)

```
User selects a user (selectedUser set)
  → ChatPanel useEffect(selectedUser.id)
      → setLoading(true)
      → GET /api/messages?otherUserId=selectedUser.id
          → getServerSession(), connectDB(), currentUser
          → Message.find({ $or: [A→B, B→A] }, sort createdAt -1, limit)
          → return list
      → setMessages(userId, data)
      → markRead(userId)  // Zustand: remove from unread list in UI
      → POST /api/messages/read { senderId: user.id }  // server: Message.updateMany(..., read: true)
      → setLoading(false)
  → Messages rendered from useChatStore().messages[user.id]
  → messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
```

### 5.2 Real-Time New Message in Open Chat

```
Already covered in Section 4.2: receive_message → appendMessage(otherId, msg).
ChatPanel shows list from store; new message appears and auto-scroll runs (useEffect on list.length).
```

### 5.3 Empty State & Loading

```
selectedUser null → "Select a conversation"
selectedUser set, loading → ChatSkeleton (bubbles)
selectedUser set, !loading, messages.length === 0 → "No messages yet. Send a message..."
selectedUser set, messages.length > 0 → MessageBubble list + input
```

---

## 6. Notifications (Unread) Flow

### 6.1 Fetching Unread (Bell)

```
Navbar mounts → NotificationBell mounts
  → useEffect: GET /api/messages/unread
      → getServerSession(), connectDB(), currentUser
      → Message.aggregate([ { receiverId, read: false }, group by senderId, count, lastMessage, lastAt ])
      → User.find(senderIds) for name, username, avatar
      → return list of { senderId, senderName, senderUsername, senderAvatar, count, lastMessage, lastAt }
  → setUnread(data)  // notificationStore
  → Polling: setInterval(fetchUnread, 30000)
  → Bell icon shows total count (sum of count)
```

### 6.2 Opening Chat from Notification

```
User clicks bell → dropdown with unread list
  → User clicks a row → Link to /dashboard?chat={senderId}
  → markRead(senderId)  // local store: remove from unread list
  → setOpen(false)
  → Dashboard loads; DashboardContent useEffect(chatUserId, users)
      → users.find(id === chatUserId) → setSelectedUser(u), setStoreSelected(u)
  → ChatPanel loads messages and POST /api/messages/read (Section 5.1)
  → Unread count decreases (next fetch or already updated locally)
```

---

## 7. Data & State Flow Summary

| Data / Action           | Where it lives              | Flow |
|-------------------------|----------------------------|------|
| Session (user, id, username) | NextAuth JWT / session     | Server: auth callbacks; Client: useSession() |
| User list                | Zustand chatStore.users    | GET /api/users → setUsers() |
| Selected user            | Zustand chatStore.selectedUser | UserList onSelect → setSelectedUser |
| Messages per conversation| Zustand chatStore.messages[otherUserId] | GET /api/messages → setMessages; socket receive_message → appendMessage |
| Typing indicators        | Zustand chatStore.typingUserIds | socket typing_start/typing_stop → setTyping() |
| Socket connected         | Zustand chatStore.socketConnected | SocketProvider connect/disconnect → setSocketConnected |
| Unread list              | Zustand notificationStore.unread | GET /api/messages/unread → setUnread; markRead() on open chat |
| Persisted messages       | MongoDB Message            | Socket send_message → Message.create; GET /api/messages reads |
| Persisted read status     | MongoDB Message.read       | POST /api/messages/read → updateMany |

---

## 8. File & Folder Responsibilities (Parallel View)

| Path | Responsibility |
|------|----------------|
| **server.js** | Custom HTTP server; runs Next.js handler + Socket.io on same port; entry for `npm run dev` / `npm start`. |
| **src/app/layout.tsx** | Root layout; wraps children with Providers (SessionProvider). |
| **src/app/page.tsx** | Redirect: session ? /dashboard : /auth/signin. |
| **src/app/providers.tsx** | SessionProvider for NextAuth. |
| **src/app/auth/signin/page.tsx** | Sign in / Sign up tabs; credentials form; Google button; calls /api/auth/register and signIn(). |
| **src/app/auth/set-username/page.tsx** | Username form; POST /api/users/username; redirect to /dashboard. |
| **src/app/auth/error/page.tsx** | Shows auth error from query; link back to signin. |
| **src/app/dashboard/layout.tsx** | Session + username check; redirect if missing; renders Navbar + SocketProvider + children. |
| **src/app/dashboard/page.tsx** | Renders DashboardClient. |
| **src/app/dashboard/DashboardClient.tsx** | Suspense + useSearchParams; UserList + ChatPanel; sync ?chat= to selectedUser. |
| **src/app/api/auth/[...nextauth]/route.ts** | NextAuth GET/POST handler; uses authOptions. |
| **src/app/api/auth/register/route.ts** | POST; create user with hashed password. |
| **src/app/api/users/route.ts** | GET; list users (exclude self, require username); optional search. |
| **src/app/api/users/username/route.ts** | POST; set/update unique username. |
| **src/app/api/messages/route.ts** | GET; conversation with otherUserId; cursor/limit. |
| **src/app/api/messages/unread/route.ts** | GET; unread grouped by sender for bell. |
| **src/app/api/messages/read/route.ts** | POST; mark messages from sender as read. |
| **src/components/Navbar.tsx** | Logo, NotificationBell, user avatar/name, Sign out. |
| **src/components/NotificationBell.tsx** | Fetch unread; dropdown list; Link to /dashboard?chat=; markRead. |
| **src/components/SocketProvider.tsx** | Connect socket when authenticated; emit join(userId); listen receive_message, typing_*; update chatStore. |
| **src/components/UserList.tsx** | Search input; GET /api/users; list with avatar/name/username; onSelectUser; loading skeleton; empty state. |
| **src/components/ChatPanel.tsx** | Selected user header; load messages (GET + mark read); message list; input; send via socket; typing indicator; auto-scroll; skeletons/empty. |
| **src/lib/db.ts** | connectDB(); Mongoose cache; getMongoUri() throws if no MONGODB_URI. |
| **src/lib/auth.ts** | NextAuth options: Credentials + Google; callbacks (signIn, jwt, session); username in JWT/session. |
| **src/lib/socket.ts** | getSocket() → io(origin, path: "/api/socketio"). |
| **src/socket/server.js** | setupSocketServer(io): join (userId→socketId), send_message (save + emit), typing_*, disconnect cleanup. |
| **src/models/User.ts** | Mongoose User schema (name, email, username, password, avatar, createdAt). |
| **src/models/Message.ts** | Mongoose Message schema (senderId, receiverId, message, read, createdAt); indexes. |
| **src/store/chatStore.ts** | users, selectedUser, messages, appendMessage, setMessages, typingUserIds, setTyping, socketConnected. |
| **src/store/notificationStore.ts** | unread list, setUnread, markRead. |
| **src/types/next-auth.d.ts** | Extend Session.user (id, username) and JWT. |

---

## 9. Request/Event Summary (Parallel Checklist)

- **Auth:** POST /api/auth/register, signIn("credentials"), signIn("google"), GET /api/auth/session, POST /api/users/username.
- **Dashboard:** GET /api/users, GET /api/users?search=.
- **Chat:** GET /api/messages?otherUserId=, POST /api/messages/read, socket join, send_message, receive_message, typing_start, typing_stop.
- **Notifications:** GET /api/messages/unread (and polling).

This file is the single place where the **full flow and architecture** are described in parallel.
