const express =
  require(
    "express"
  );

const cors =
  require(
    "cors"
  );

const helmet =
  require(
    "helmet"
  );

const env =
  require(
    "./config/env"
  );

const healthRoutes =
  require(
    "./routes/health.routes"
  );

const authRoutes =
  require(
    "./routes/auth.routes"
  );

const spacesRoutes = require("./routes/spaces.routes");
const favoritesRoutes = require("./routes/favorites.routes");


const app =
  express();


app.disable(
  "x-powered-by"
);


app.use(
  helmet()
);


app.use(
  cors({
    origin(
      origin,
      callback
    ) {
      if (!origin) {
        return callback(
          null,
          true
        );
      }

      if (
        env.CORS_ORIGINS
          .includes(
            origin
          )
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          "Origin not allowed by CORS"
        )
      );
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);


app.use(
  express.json({
    limit:
      "100kb",
  })
);


app.get(
  "/",
  (
    request,
    response
  ) => {
    return response.json({
      ok: true,

      service:
        "Fazajoo API",

      message:
        "Backend مستقل فضاجو فعال است.",
    });
  }
);


app.use(
  "/api/health",
  healthRoutes
);


app.use(
  "/api/auth",
  authRoutes
);

app.use("/api/spaces", spacesRoutes);
app.use("/api/favorites", favoritesRoutes);


app.use(
  (
    request,
    response
  ) => {
    return response
      .status(404)
      .json({
        ok: false,

        message:
          "مسیر API پیدا نشد.",
      });
  }
);


app.use(
  (
    error,
    request,
    response,
    next
  ) => {
    console.error(
      "API error:",
      error
    );

    if (
      error.message ===
      "Origin not allowed by CORS"
    ) {
      return response
        .status(403)
        .json({
          ok: false,

          message:
            "دسترسی این مبدأ مجاز نیست.",
        });
    }

    return response
      .status(500)
      .json({
        ok: false,

        message:
          "خطای داخلی سرور فضاجو.",
      });
  }
);


module.exports =
  app;