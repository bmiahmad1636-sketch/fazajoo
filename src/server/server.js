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

  credentials: false,

  optionsSuccessStatus: 204,
};


app.use(
  cors(
    corsOptions
  )
);


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


function isAgencyDocumentPublicId(
  publicId = ""
) {
  const normalizedPublicId =
    String(
      publicId
    ).trim();

  if (!normalizedPublicId) {
    return false;
  }

  return normalizedPublicId.startsWith(
    `${AGENCY_DOCUMENT_FOLDER}/`
  );
}


function validateDocumentFormat(
  format = ""
) {
  const safeFormat =
    sanitizeValue(
      format,
      10
    ).toLowerCase();

  const allowedFormats =
    new Set([
      "jpg",
      "jpeg",
      "png",
      "webp",
    ]);

  if (
    !safeFormat ||
    !allowedFormats.has(
      safeFormat
    )
  ) {
    return "";
  }

  return safeFormat;
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
   SIGN DOCUMENT UPLOAD
========================= */

app.post(
  "/api/cloudinary/agency-document-signature",

  (
    request,
    response
  ) => {
    try {
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


      if (!safeUserId) {
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
   SECURE DOCUMENT VIEW
========================= */

app.post(
  "/api/cloudinary/agency-document-view",

  (
    request,
    response
  ) => {
    try {
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
        publicId,
        format,
      } =
        request.body || {};


      if (
        !publicId ||
        typeof publicId !==
          "string"
      ) {
        return response
          .status(400)
          .json({
            ok: false,

            message:
              "شناسه مدرک معتبر نیست.",
          });
      }


      if (
        !isAgencyDocumentPublicId(
          publicId
        )
      ) {
        return response
          .status(403)
          .json({
            ok: false,

            message:
              "دسترسی به این فایل مجاز نیست.",
          });
      }


      const safeFormat =
        validateDocumentFormat(
          format
        );


      if (!safeFormat) {
        return response
          .status(400)
          .json({
            ok: false,

            message:
              "فرمت مدرک معتبر نیست.",
          });
      }


      const secureUrl =
        cloudinary.url(
          publicId,
          {
            secure: true,

            type:
              "authenticated",

            resource_type:
              "image",

            sign_url:
              true,

            format:
              safeFormat,
          }
        );


      return response.json({
        ok: true,

        url:
          secureUrl,
      });

    } catch (error) {
      console.error(
        "Secure document view error:",
        error
      );

      return response
        .status(500)
        .json({
          ok: false,

          message:
            "ساخت لینک امن مشاهده مدرک انجام نشد.",
        });
    }
  }
);


/* =========================
   SECURE DOCUMENT DOWNLOAD
========================= */

app.post(
  "/api/cloudinary/agency-document-download",

  (
    request,
    response
  ) => {
    try {
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
        publicId,
        format,
      } =
        request.body || {};


      if (
        !publicId ||
        typeof publicId !==
          "string"
      ) {
        return response
          .status(400)
          .json({
            ok: false,

            message:
              "شناسه مدرک معتبر نیست.",
          });
      }


      if (
        !isAgencyDocumentPublicId(
          publicId
        )
      ) {
        return response
          .status(403)
          .json({
            ok: false,

            message:
              "دسترسی به این فایل مجاز نیست.",
          });
      }


      const safeFormat =
        validateDocumentFormat(
          format
        );


      if (!safeFormat) {
        return response
          .status(400)
          .json({
            ok: false,

            message:
              "فرمت مدرک معتبر نیست.",
          });
      }


      const expiresAt =
        Math.floor(
          Date.now() /
            1000
        ) +
        5 * 60;


      const downloadUrl =
        cloudinary.utils.private_download_url(
          publicId,
          safeFormat,
          {
            resource_type:
              "image",

            type:
              "authenticated",

            attachment:
              true,

            expires_at:
              expiresAt,
          }
        );


      return response.json({
        ok: true,

        url:
          downloadUrl,

        expiresAt,
      });

    } catch (error) {
      console.error(
        "Secure document download error:",
        error
      );

      return response
        .status(500)
        .json({
          ok: false,

          message:
            "ساخت لینک دانلود مدرک انجام نشد.",
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
      `☁️ Cloudinary configured: ${
        cloudinaryIsConfigured()
          ? "YES"
          : "NO"
      }`
    );

    console.log(
      "👁️ Secure document viewing: ENABLED"
    );

    console.log(
      "⬇️ Secure document download: ENABLED"
    );

    console.log(
      "⏱️ Download links expire after 5 minutes"
    );

    console.log(
      "========================================\n"
    );
  }
);