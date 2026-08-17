const app =
  require(
    "./app"
  );

const env =
  require(
    "./config/env"
  );


const server =
  app.listen(
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

  server.close(
    () => {
      process.exit(0);
    }
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