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

/*
|--------------------------------------------------------------------------
| Express security basics
|--------------------------------------------------------------------------
*/

app.disable("x-powered-by");

/*
|--------------------------------------------------------------------------
| Reverse Proxy
|--------------------------------------------------------------------------
|
| در Development مقدار پیش‌فرض false است.
|
| در Production فقط زمانی TRUST_PROXY را فعال می‌کنیم که Backend
| واقعاً پشت Reverse Proxy مطمئن قرار گرفته باشد.
|
| Rate Limiter برای تشخیص IP کاربر از request.ip استفاده می‌کند،
| بنابراین تنظیم درست trust proxy بسیار مهم است.
|
*/

app.set(
  "trust proxy",
  env.TRUST_PROXY
);

/*
|--------------------------------------------------------------------------
| Security Headers
|--------------------------------------------------------------------------
*/

app.use(
  helmet()
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
|
| فقط Originهای موجود در CORS_ORIGINS اجازه دسترسی مرورگری دارند.
|
| درخواست‌هایی که Origin ندارند مثل:
| - درخواست داخلی سرور
| - curl
| - Health Check
|
| می‌توانند عبور کنند.
|
*/

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
        env.CORS_ORIGINS.includes(
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

    maxAge:
      86400,
  })
);

/*
|--------------------------------------------------------------------------
| JSON body limit
|--------------------------------------------------------------------------
|
| درخواست‌های JSON فضاجو نباید حجم غیرعادی داشته باشند.
| تصاویر از مسیر Upload جداگانه ارسال می‌شوند.
|
*/

app.use(
  express.json({
    limit:
      "100kb",
  })
);

/*
|--------------------------------------------------------------------------
| Authentication Rate Limit
|--------------------------------------------------------------------------
|
| LOGIN:
| حداکثر 10 تلاش ناموفق در 15 دقیقه برای هر IP.
|
| REGISTER:
| حداکثر 10 درخواست ثبت‌نام در یک ساعت برای هر IP.
|
| IP واقعی کاربر از request.ip گرفته می‌شود و در حالت Production
| با تنظیم صحیح TRUST_PROXY پشت Reverse Proxy نیز درست کار می‌کند.
|
*/

const loginRateLimiter =
  rateLimit({
    windowMs:
      15 *
      60 *
      1000,

    limit:
      10,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    skipSuccessfulRequests:
      true,

    message: {
      ok:
        false,

      message:
        "تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً حدود ۱۵ دقیقه بعد دوباره تلاش کنید.",
    },
  });

const registerRateLimiter =
  rateLimit({
    windowMs:
      60 *
      60 *
      1000,

    limit:
      10,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      ok:
        false,

      message:
        "تعداد درخواست‌های ثبت‌نام بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
    },
  });

/*
|--------------------------------------------------------------------------
| Root
|--------------------------------------------------------------------------
*/

app.get(
  "/",
  (
    request,
    response
  ) => {
    return response.json({
      ok:
        true,

      service:
        "Fazajoo API",

      message:
        "Backend مستقل فضاجو فعال است.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| Health
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(
  (
    request,
    response
  ) => {
    return response
      .status(404)
      .json({
        ok:
          false,

        message:
          "مسیر API پیدا نشد.",
      });
  }
);

/*
|--------------------------------------------------------------------------
| Error Handler
|--------------------------------------------------------------------------
*/

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
          ok:
            false,

          message:
            "دسترسی این مبدأ مجاز نیست.",
        });
    }

    return response
      .status(500)
      .json({
        ok:
          false,

        message:
          "خطای داخلی سرور فضاجو.",
      });
  }
);

module.exports =
  app;