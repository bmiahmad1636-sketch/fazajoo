const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const crypto = require("crypto");
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
const trustSafetyRoutes = require("./routes/trustSafety.routes");
const adminDirectRoutes = require("./routes/adminDirect.routes");

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
*/

app.use(
  express.json({
    limit:
      "100kb",
  })
);

/*
|--------------------------------------------------------------------------
| Login rate limiting
|--------------------------------------------------------------------------
|
| Layer 1:
| 10 failed login attempts / 15 min / IP.
|
| Layer 2:
| 20 failed login attempts / 15 min / target phone.
| This makes rotating IP addresses much less useful to an attacker.
|
| Successful logins are not counted.
|
| The account-based limiter never stores the raw phone number as a key.
| A SHA-256 digest is used instead.
|
*/

function normalizeLoginPhone(
  value
) {
  const digits =
    String(
      value || ""
    )
      .replace(
        /[۰-۹]/g,
        (digit) =>
          String(
            "۰۱۲۳۴۵۶۷۸۹".indexOf(
              digit
            )
          )
      )
      .replace(
        /[٠-٩]/g,
        (digit) =>
          String(
            "٠١٢٣٤٥٦٧٨٩".indexOf(
              digit
            )
          )
      )
      .replace(
        /\D/g,
        ""
      );

  if (
    digits.startsWith(
      "0098"
    )
  ) {
    return `0${digits.slice(
      4,
      14
    )}`;
  }

  if (
    digits.startsWith(
      "98"
    )
  ) {
    return `0${digits.slice(
      2,
      12
    )}`;
  }

  if (
    digits.startsWith(
      "9"
    ) &&
    digits.length <= 10
  ) {
    return `0${digits}`;
  }

  return digits.slice(
    0,
    11
  );
}

function loginAccountKey(
  request
) {
  const phone =
    normalizeLoginPhone(
      request.body?.phone
    );

  if (
    !/^09\d{9}$/.test(
      phone
    )
  ) {
    /*
     * Invalid/missing phone values are grouped by IP.
     * This avoids creating unlimited arbitrary limiter keys.
     */
    return `invalid:${request.ip}`;
  }

  const digest =
    crypto
      .createHash(
        "sha256"
      )
      .update(
        phone
      )
      .digest(
        "hex"
      );

  return `phone:${digest}`;
}

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
        "تعداد تلاش‌های ورود از این اتصال بیش از حد مجاز است. لطفاً حدود ۱۵ دقیقه بعد دوباره تلاش کنید.",
    },
  });

const loginAccountRateLimiter =
  rateLimit({
    windowMs:
      15 *
      60 *
      1000,

    limit:
      20,

    standardHeaders:
      false,

    legacyHeaders:
      false,

    skipSuccessfulRequests:
      true,

    keyGenerator:
      loginAccountKey,

    message: {
      ok:
        false,

      message:
        "تعداد تلاش‌های ناموفق برای ورود به این حساب بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
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
  loginRateLimiter,
  loginAccountRateLimiter
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

app.use(
  "/api/trust",
  trustSafetyRoutes
);

app.use("/api/admin/direct", adminDirectRoutes);

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
