const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const env = require("./config/env");
const { verifyToken } = require("./utils/token");
const { query } = require("./db/pool");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGINS,
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization", "Content-Type"],
  },
});
app.set("io", io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || "";
    const payload = verifyToken(token);
    const result = await query(
      `SELECT id FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [payload.sub]
    );
    if (!result.rows[0]) throw new Error("Invalid user");
    socket.userId = result.rows[0].id;
    return next();
  } catch (error) {
    return next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);

  socket.on("chat:join", async (chatId) => {
    try {
      const result = await query(
        `SELECT id FROM chats WHERE id = $1 AND (owner_id = $2 OR requester_id = $2) LIMIT 1`,
        [chatId, socket.userId]
      );
      if (result.rows[0]) socket.join(`chat:${chatId}`);
    } catch (error) {
      console.error("Socket chat join error:", error.message);
    }
  });

  socket.on("chat:leave", (chatId) => socket.leave(`chat:${chatId}`));
});

server.listen(env.PORT, env.HOST, () => {
  console.log("\n=======================================");
  console.log("🚀 Fazajoo Backend is running");
  console.log(`🌐 http://${env.HOST}:${env.PORT}`);
  console.log(`❤️ http://${env.HOST}:${env.PORT}/api/health`);
  console.log("🔐 Auth API enabled");
  console.log("💬 Chat API + Socket.IO enabled");
  console.log("🐘 PostgreSQL ready for connection");
  console.log("=======================================\n");
});

function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`);
  io.close(() => server.close(() => process.exit(0)));
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
