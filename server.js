/**
 * Custom Node server that runs Next.js and Socket.IO on the same HTTP server.
 * Use: npm run dev / npm start (both run this file).
 * See: https://socket.io/how-to/use-with-nextjs
 */

const { createServer } = require("node:http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Socket.IO server setup is in socket/server.js
const { setupSocketServer } = require("./src/socket/server");

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
  });
  setupSocketServer(io);

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
