const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

const env = require("./config/env");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const spacesRoutes = require("./routes/spaces.routes");
const favoritesRoutes = require("./routes/favorites.routes");
const chatsRoutes = require("./routes/chats.routes");
const uploadsRoutes = require("./routes/uploads.routes");
const adminRoutes = require("./routes/admin.routes");
const agencyRoutes = require("./routes/agency.routes");
const smartSearchRoutes = require("./routes/smartSearch.routes");
const legalRoutes = require("./routes/legal.routes");

const app = express();

app.disable("x-powered-by");

app.use(
  helmet()
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (env.CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin not allowed by CORS")
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
    limit: "100kb",
  })
);

/*
|--------------------------------------------------------------------------
| Authentication rate limits
|--------------------------------------------------------------------------
|
| هدف:
| جلوگیری از تلاش‌های پشت‌سرهم برای ورود یا ساخت حساب توسط ربات‌ها.
|
| نکته:
| این محدودیت فقط روی endpointهای حساس احراز هویت اعمال می‌شود و
| درخواست‌های عادی سایت را محدود نمی‌کند.
|
*/

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,

  standardHeaders: "draft-7",
  legacyHeaders: false,

  skipSuccessfulRequests: true,

  message: {
    ok: false,
    message:
      "تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً حدود ۱۵ دقیقه بعد دوباره تلاش کنید.",
  },
});

const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,

  standardHeaders: "draft-7",
  legacyHeaders: false,

  message: {
    ok: false,
    message:
      "تعداد درخواست‌های ثبت‌نام بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
  },
});

app.get(
  "/",
  (request, response) => {
    return response.json({
      ok: true,
      service: "Fazajoo API",
      message: "Backend مستقل فضاجو فعال است.",
    });
  }
);

app.use(
  "/api/health",
  healthRoutes
);

/*
|--------------------------------------------------------------------------
| Auth security
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth/login",
  loginRateLimiter
);

app.use(
  "/api/auth/register",
  registerRateLimiter
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/spaces",
  spacesRoutes
);

app.use(
  "/api/favorites",
  favoritesRoutes
);

app.use(
  "/api/chats",
  chatsRoutes
);

app.use(
  "/api/uploads",
  uploadsRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/agency",
  agencyRoutes
);

app.use(
  "/api/smart-searches",
  smartSearchRoutes
);

app.use(
  "/api/admin/legal",
  legalRoutes
);

app.use(
  (request, response) => {
    return response
      .status(404)
      .json({
        ok: false,
        message: "مسیر API پیدا نشد.",
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

module.exports = app;