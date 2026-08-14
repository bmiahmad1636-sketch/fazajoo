import crypto from "crypto";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const app = express();

const PORT =
  Number(process.env.DOCUMENT_SERVER_PORT) ||
  5050;

const CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME;

const CLOUDINARY_API_KEY =
  process.env.CLOUDINARY_API_KEY;

const CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET;

const AGENCY_DOCUMENT_PRESET =
  "fazajoo_agency_documents";

const AGENCY_DOCUMENT_FOLDER =
  "fazajoo/agency-documents";


/* =========================
   CLOUDINARY
========================= */

function cloudinaryIsConfigured() {
  return Boolean(
    CLOUDINARY_CLOUD_NAME &&
      CLOUDINARY_API_KEY &&
      CLOUDINARY_API_SECRET
  );
}


if (cloudinaryIsConfigured()) {
  cloudinary.config({
    cloud_name:
      CLOUDINARY_CLOUD_NAME,

    api_key:
      CLOUDINARY_API_KEY,

    api_secret:
      CLOUDINARY_API_SECRET,

    secure: true,
  });
} else {
  console.warn(
    "\n⚠️ Cloudinary credentials are missing.\n"
  );
}


/* =========================
   CORS
========================= */

const allowedOrigins =
  new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    "http://localhost:5174",
    "http://127.0.0.1:5174",

    "http://localhost:5175",
    "http://127.0.0.1:5175",
  ]);


const corsOptions = {
  origin(
    origin,
    callback
  ) {
    /*
     * درخواست‌هایی مثل تست مستقیم
     * از مرورگر ممکن است Origin
     * نداشته باشند.
     */
    if (!origin) {
      return callback(
        null,
        true
      );
    }


    if (
      allowedOrigins.has(
        origin
      )
    ) {
      return callback(
        null,
        true
      );
    }


    console.warn(
      "Blocked CORS origin:",
      origin
    );


    return callback(
      new Error(
        "Origin not allowed by CORS"
      )
    );
  },

  methods: [
    "GET",
    "POST",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  exposedHeaders: [],

  credentials: false,

  optionsSuccessStatus: 204,
};


app.use(
  cors(
    corsOptions
  )
);


/*
 * پاسخ صریح به Preflight
 */
app.options(
  /{*splat}/,
  cors(
    corsOptions
  )
);


/* =========================
   EXPRESS
========================= */

app.disable(
  "x-powered-by"
);


app.use(
  express.json({
    limit: "30kb",
  })
);


/* =========================
   REQUEST LOGGER
========================= */

app.use(
  (
    request,
    response,
    next
  ) => {
    console.log(
      `[${new Date().toISOString()}]`,
      request.method,
      request.originalUrl,
      "| origin:",
      request.headers.origin ||
        "none"
    );

    next();
  }
);


/* =========================
   HELPERS
========================= */

function sanitizeValue(
  value = "",
  maxLength = 128
) {
  return String(value)
    .trim()
    .replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    )
    .slice(
      0,
      maxLength
    );
}


function createDocumentPublicId({
  userId,
  documentType,
}) {
  const safeUserId =
    sanitizeValue(
      userId,
      128
    );


  const safeDocumentType =
    sanitizeValue(
      documentType,
      50
    );


  const randomPart =
    crypto
      .randomUUID()
      .replace(
        /-/g,
        ""
      )
      .slice(
        0,
        16
      );


  return [
    safeUserId,
    safeDocumentType,
    Date.now(),
    randomPart,
  ].join(
    "_"
  );
}


/* =========================
   HEALTH
========================= */

app.get(
  "/api/health",

  (
    request,
    response
  ) => {
    return response.json({
      ok: true,

      service:
        "fazajoo-agency-document-server",

      cloudinaryConfigured:
        cloudinaryIsConfigured(),

      time:
        new Date().toISOString(),
    });
  }
);


/* =========================
   SIGN DOCUMENT
========================= */

app.post(
  "/api/cloudinary/agency-document-signature",

  (
    request,
    response
  ) => {
    try {
      console.log(
        "Signature request received."
      );


      if (
        !cloudinaryIsConfigured()
      ) {
        return response
          .status(500)
          .json({
            ok: false,

            message:
              "تنظیمات Cloudinary روی سرور کامل نیست.",
          });
      }


      const {
        userId,
        documentType,
      } =
        request.body || {};


      if (
        !userId ||
        typeof userId !==
          "string"
      ) {
        return response
          .status(400)
          .json({
            ok: false,

            message:
              "شناسه کاربر معتبر نیست.",
          });
      }


      const safeUserId =
        sanitizeValue(
          userId,
          128
        );


      if (
        !safeUserId
      ) {
        return response
          .status(400)
          .json({
            ok: false,

            message:
              "شناسه کاربر معتبر نیست.",
          });
      }


      const allowedDocumentTypes =
        new Set([
          "national_card_front",
          "national_card_back",
          "business_license",
        ]);


      if (
        !allowedDocumentTypes.has(
          documentType
        )
      ) {
        return response
          .status(400)
          .json({
            ok: false,

            message:
              "نوع مدرک معتبر نیست.",
          });
      }


      const timestamp =
        Math.floor(
          Date.now() /
            1000
        );


      const publicId =
        createDocumentPublicId({
          userId:
            safeUserId,

          documentType,
        });


      /*
       * این پارامترها دقیقاً همان‌هایی
       * هستند که React هنگام Upload
       * به Cloudinary می‌فرستد.
       */
      const paramsToSign = {
        folder:
          AGENCY_DOCUMENT_FOLDER,

        public_id:
          publicId,

        timestamp,

        type:
          "authenticated",

        upload_preset:
          AGENCY_DOCUMENT_PRESET,
      };


      const signature =
        cloudinary
          .utils
          .api_sign_request(
            paramsToSign,
            CLOUDINARY_API_SECRET
          );


      console.log(
        "Signature created:",
        documentType,
        safeUserId
      );


      return response.json({
        ok: true,

        signature,

        timestamp,

        cloudName:
          CLOUDINARY_CLOUD_NAME,

        apiKey:
          CLOUDINARY_API_KEY,

        uploadPreset:
          AGENCY_DOCUMENT_PRESET,

        folder:
          AGENCY_DOCUMENT_FOLDER,

        publicId,

        deliveryType:
          "authenticated",
      });

    } catch (error) {
      console.error(
        "Agency document signature error:",
        error
      );


      return response
        .status(500)
        .json({
          ok: false,

          message:
            "ساخت امضای امن مدارک انجام نشد.",
        });
    }
  }
);


/* =========================
   NOT FOUND
========================= */

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
          "مسیر موردنظر پیدا نشد.",
      });
  }
);


/* =========================
   ERROR HANDLER
========================= */

app.use(
  (
    error,
    request,
    response,
    next
  ) => {
    console.error(
      "Server error:",
      error
    );


    if (
      error?.message ===
      "Origin not allowed by CORS"
    ) {
      return response
        .status(403)
        .json({
          ok: false,

          message:
            "دسترسی این مبدأ به سرور مجاز نیست.",
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


/* =========================
   START
========================= */

app.listen(
  PORT,
  "127.0.0.1",

  () => {
    console.log(
      "\n========================================"
    );

    console.log(
      "🔐 Fazajoo document server is running"
    );

    console.log(
      `🌐 http://127.0.0.1:${PORT}`
    );

    console.log(
      `❤️ Health: http://127.0.0.1:${PORT}/api/health`
    );

    console.log(
      `📁 Folder: ${AGENCY_DOCUMENT_FOLDER}`
    );

    console.log(
      `🔏 Preset: ${AGENCY_DOCUMENT_PRESET}`
    );

    console.log(
      `☁️ Cloudinary configured: ${
        cloudinaryIsConfigured()
          ? "YES"
          : "NO"
      }`
    );

    console.log(
      "✅ Allowed origins:"
    );

    for (
      const origin of
      allowedOrigins
    ) {
      console.log(
        `   ${origin}`
      );
    }

    console.log(
      "========================================\n"
    );
  }
);