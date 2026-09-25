const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const env = require("./config/env");
const { verifyToken } = require("./utils/token");
const { query } = require("./db/pool");

const server = http.createServer(app);


const CHAT_JOIN_WINDOW_MS =
  60 * 1000;

const CHAT_JOIN_MAX_PER_WINDOW =
  60;

const chatJoinUsage =
  new Map();

function canJoinChatRoom(
  userId
) {
  const now =
    Date.now();

  const current =
    chatJoinUsage.get(
      userId
    );

  if (
    !current ||
    now - current.windowStartedAt >=
      CHAT_JOIN_WINDOW_MS
  ) {
    chatJoinUsage.set(
      userId,
      {
        windowStartedAt: now,
        count: 1,
      }
    );

    return true;
  }

  if (
    current.count >=
    CHAT_JOIN_MAX_PER_WINDOW
  ) {
    return false;
  }

  current.count += 1;

  return true;
}

function isValidUuid(
  value
) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGINS,
    methods: ["GET", "POST"],
    allowedHeaders: [
      "Authorization",
      "Content-Type",
    ],
  },
});

app.set("io", io);

io.use(
  async (
    socket,
    next
  ) => {
    try {
      const token =
        socket.handshake.auth
          ?.token ||
        "";

      const payload =
        verifyToken(
          token
        );

      const result =
        await query(
          `
            SELECT
              id,
              auth_version
            FROM users
            WHERE id = $1
              AND is_active = TRUE
            LIMIT 1
          `,
          [
            payload.sub,
          ]
        );

      const user =
        result.rows[0];

      if (!user) {
        throw new Error(
          "Invalid user"
        );
      }

      const tokenAuthVersion =
        Number(
          payload.authVersion
        );

      const currentAuthVersion =
        Number(
          user.auth_version
        );

      if (
        !Number.isInteger(
          tokenAuthVersion
        ) ||
        tokenAuthVersion !==
          currentAuthVersion
      ) {
        throw new Error(
          "Revoked session"
        );
      }

      socket.userId =
        user.id;

      return next();

    } catch (error) {
      console.warn(
        "Socket authentication rejected:",
        error?.message ||
          error
      );

      return next(
        new Error(
          "unauthorized"
        )
      );
    }
  }
);


io.on(
  "connection",
  (socket) => {
    socket.join(
      `user:${socket.userId}`
    );

    socket.on(
      "chat:join",
      async (
        chatId
      ) => {
        try {
          if (
            !isValidUuid(
              chatId
            )
          ) {
            return;
          }

          if (
            !canJoinChatRoom(
              socket.userId
            )
          ) {
            console.warn(
              "Socket chat join rate limit exceeded",
              {
                userId:
                  socket.userId,
              }
            );

            return;
          }

          const result =
            await query(
              `
                SELECT id
                FROM chats
                WHERE id = $1
                  AND (
                    owner_id = $2
                    OR requester_id = $2
                  )
                LIMIT 1
              `,
              [
                chatId,
                socket.userId,
              ]
            );

          if (
            result.rows[0]
          ) {
            socket.join(
              `chat:${chatId}`
            );
          }

        } catch (error) {
          console.error(
            "Socket chat join error:",
            error.message
          );
        }
      }
    );

    socket.on(
      "chat:leave",
      (chatId) =>
        socket.leave(
          `chat:${chatId}`
        )
    );
  }
);


server.listen(
  env.PORT,
  env.HOST,
  () => {
    console.log(
      "\n======================================="
    );

    console.log(
      "🚀 Fazajoo Backend is running"
    );

    console.log(
      `🌐 http://${env.HOST}:${env.PORT}`
    );

    console.log(
      `❤️ http://${env.HOST}:${env.PORT}/api/health`
    );

    console.log(
      "🔐 Auth API enabled"
    );

    console.log(
      "💬 Chat API + Socket.IO enabled"
    );

    console.log(
      "🐘 PostgreSQL ready for connection"
    );

    console.log(
      "=======================================\n"
    );
  }
);


function shutdown(
  signal
) {
  console.log(
    `\n${signal} received. Shutting down...`
  );

  io.close(
    () =>
      server.close(
        () =>
          process.exit(
            0
          )
      )
  );
}

process.on(
  "SIGINT",
  () =>
    shutdown(
      "SIGINT"
    )
);

process.on(
  "SIGTERM",
  () =>
    shutdown(
      "SIGTERM"
    )
);