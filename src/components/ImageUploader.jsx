import { useEffect, useRef, useState } from "react";
import { deleteAdImage, uploadAdImage } from "../services/uploadService";
import "./ImageUploader.css";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_EDGE = 2400;
const OUTPUT_QUALITY = 0.85;
const OPTIMIZE_FROM_SIZE = 2 * 1024 * 1024;

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("بهینه‌سازی تصویر انجام نشد."));
      },
      type,
      quality
    );
  });
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      throw new Error(
        "فایل انتخاب‌شده تصویر معتبر نیست. لطفاً یک تصویر JPG، PNG یا WebP انتخاب کنید."
      );
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () =>
        reject(
          new Error(
            "فایل انتخاب‌شده تصویر معتبر نیست. لطفاً یک تصویر JPG، PNG یا WebP انتخاب کنید."
          )
        );

      image.src = objectUrl;
    });
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  };
}

async function optimizeImage(file) {
  const loaded = await loadImageSource(file);

  try {
    const longestEdge = Math.max(loaded.width, loaded.height);
    const needsResize = longestEdge > MAX_IMAGE_EDGE;
    const needsCompression = file.size > OPTIMIZE_FROM_SIZE;

    // عکس‌های معمولی و سبک را بی‌دلیل دوباره فشرده نمی‌کنیم.
    if (!needsResize && !needsCompression) {
      return file;
    }

    const scale = needsResize ? MAX_IMAGE_EDGE / longestEdge : 1;
    const width = Math.max(1, Math.round(loaded.width * scale));
    const height = Math.max(1, Math.round(loaded.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      throw new Error("پردازش تصویر در مرورگر ممکن نیست.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(loaded.source, 0, 0, width, height);

    // WebP برای عکس موبایل حجم مناسب و کیفیت بالایی می‌دهد و شفافیت PNG را هم حفظ می‌کند.
    const blob = await canvasToBlob(
      canvas,
      "image/webp",
      OUTPUT_QUALITY
    );

    const safeName =
      file.name.replace(/\.[^.]+$/, "") || "fazajoo-photo";

    // اگر خروجی به هر دلیل بزرگ‌تر شد، همان فایل اصلی را نگه می‌داریم.
    if (blob.size >= file.size && !needsResize) {
      return file;
    }

    return new File(
      [blob],
      `${safeName}.webp`,
      {
        type: "image/webp",
        lastModified: Date.now(),
      }
    );
  } finally {
    loaded.cleanup?.();
  }
}

async function sha256Hex(blob) {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashExistingImage(url) {
  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) return null;
    return await sha256Hex(await response.blob());
  } catch {
    // اگر مرورگر به هر دلیل اجازه خواندن تصویر قبلی را نداد،
    // آپلود را متوقف نمی‌کنیم؛ تکراری‌های انتخاب جدید همچنان کنترل می‌شوند.
    return null;
  }
}

function ImageUploader({
  imageUrls = [],
  mainImageUrl = "",
  onUploadComplete,
  onMainImageChange,
  maxImages = 10,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // ترتیب عکس‌ها را داخل خود کامپوننت هم نگه می‌داریم تا تغییر
  // «عکس اصلی» همان لحظه در رابط کاربری دیده شود و فقط وابسته
  // به رندر مجدد فرم والد نباشد.
  const normalizeImages = (value) =>
    Array.isArray(value)
      ? value.filter(Boolean).slice(0, maxImages)
      : [];

  const [images, setImages] = useState(() => normalizeImages(imageUrls));

  useEffect(() => {
    setImages(normalizeImages(imageUrls));
  }, [imageUrls, maxImages]);

  const effectiveMainImage =
    mainImageUrl && images.includes(mainImageUrl)
      ? mainImageUrl
      : images[0] || "";

  const emit = (nextImages) => {
    const normalized = normalizeImages(nextImages);
    setImages(normalized);
    onUploadComplete?.(normalized);

    // عکس اصلی یک state مستقل است؛ ترتیب گالری دیگر تعیین‌کننده اصلی بودن نیست.
    const nextMain =
      effectiveMainImage && normalized.includes(effectiveMainImage)
        ? effectiveMainImage
        : normalized[0] || "";

    if (nextMain !== effectiveMainImage) {
      onMainImageChange?.(nextMain);
    }
  };

  const uploadImages = async (event) => {
    const files = Array.from(
      event.target.files || []
    );

    event.target.value = "";

    if (!files.length) return;

    const remaining = maxImages - images.length;

    if (remaining <= 0) {
      setError(
        `حداکثر ${maxImages.toLocaleString(
          "fa-IR"
        )} عکس برای هر آگهی مجاز است.`
      );
      return;
    }

    if (files.length > remaining) {
      setError(
        `فقط ${remaining.toLocaleString(
          "fa-IR"
        )} عکس دیگر می‌توانی اضافه کنی.`
      );
      return;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(
          "فرمت همه عکس‌ها باید JPG، PNG یا WebP باشد."
        );
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(
          "حجم هر عکس نباید بیشتر از ۱۰ مگابایت باشد."
        );
        return;
      }
    }

    setUploading(true);
    setError("");

    const uploaded = [];

    try {
      // ابتدا همان نسخه‌ای را می‌سازیم که واقعاً آپلود می‌شود؛ در نتیجه
      // مقایسه با عکس‌های قبلی آگهی نیز دقیق است.
      const optimizedFiles = [];
      const selectedHashes = new Set();
      let duplicateCount = 0;

      const existingHashes = new Set(
        (
          await Promise.all(images.map(hashExistingImage))
        ).filter(Boolean)
      );

      for (const file of files) {
        const optimizedFile = await optimizeImage(file);
        const hash = await sha256Hex(optimizedFile);

        if (existingHashes.has(hash) || selectedHashes.has(hash)) {
          duplicateCount += 1;
          continue;
        }

        selectedHashes.add(hash);
        optimizedFiles.push(optimizedFile);
      }

      if (!optimizedFiles.length) {
        setError("این عکس قبلاً در آگهی وجود دارد؛ تصویر تکراری اضافه نشد.");
        return;
      }

      for (const optimizedFile of optimizedFiles) {
        const result = await uploadAdImage(optimizedFile);
        uploaded.push(result.url);
      }

      emit([...images, ...uploaded]);

      if (duplicateCount > 0) {
        setError(
          `${duplicateCount.toLocaleString("fa-IR")} عکس تکراری شناسایی شد و اضافه نشد.`
        );
      }
    } catch (uploadError) {
      console.error("UPLOAD ERROR:", uploadError);

      if (uploaded.length) {
        emit([...images, ...uploaded]);
      }

      setError(
        uploadError.message ||
          "آپلود عکس انجام نشد. دوباره تلاش کنید."
      );
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (url) => {
    if (!url || uploading) return;

    setUploading(true);
    setError("");

    try {
      await deleteAdImage(url).catch(
        () => undefined
      );

      emit(
        images.filter(
          (item) => item !== url
        )
      );
    } catch (removeError) {
      console.error(
        "REMOVE ERROR:",
        removeError
      );

      setError(
        "حذف عکس انجام نشد. دوباره تلاش کنید."
      );
    } finally {
      setUploading(false);
    }
  };

  const makeMain = (url) => {
    if (!url || !images.includes(url) || uploading) return;
    onMainImageChange?.(url);
  };

  return (
    <div
      className="multi-image-uploader"
      dir="rtl"
    >
      <div className="multi-image-uploader__top">
        <div>
          <strong>عکس‌های آگهی</strong>

          <span className="multi-image-uploader__counter">
            {images.length.toLocaleString("fa-IR")} از {maxImages.toLocaleString("fa-IR")} عکس
          </span>
        </div>

        <button
          type="button"
          className="multi-image-uploader__add"
          disabled={
            uploading ||
            images.length >= maxImages
          }
          onClick={() =>
            inputRef.current?.click()
          }
        >
          ＋ افزودن عکس
        </button>
      </div>

      <input
        ref={inputRef}
        className="multi-image-uploader__input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={uploadImages}
        disabled={
          uploading ||
          images.length >= maxImages
        }
      />

      {uploading && (
        <div className="multi-image-uploader__message">
          <span className="multi-image-uploader__spinner" />
          در حال بارگذاری عکس‌ها در فضای
          ذخیره‌سازی فضاجو...
        </div>
      )}

      {error && (
        <div className="multi-image-uploader__error">
          {error}
        </div>
      )}

      {images.length > 0 ? (
        <div className="multi-image-uploader__grid">
          {images.map((url, index) => (
            <article
              key={`${url}-${index}`}
              className={
                url === effectiveMainImage
                  ? "multi-image-uploader__item multi-image-uploader__item--main"
                  : "multi-image-uploader__item"
              }
            >
              <img
                src={url}
                alt={`عکس ${
                  index + 1
                } آگهی`}
              />

              <div className="multi-image-uploader__badge">
                {url === effectiveMainImage
                  ? "عکس اصلی"
                  : `عکس ${(
                      index + 1
                    ).toLocaleString(
                      "fa-IR"
                    )}`}
              </div>

              <div className="multi-image-uploader__actions">
                {url === effectiveMainImage ? (
                  <button
                    type="button"
                    className="multi-image-uploader__main-status"
                    disabled
                  >
                    ✓ عکس اصلی فعلی
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => makeMain(url)}
                    disabled={uploading}
                  >
                    انتخاب به‌عنوان اصلی
                  </button>
                )}

                <button
                  type="button"
                  className="multi-image-uploader__remove"
                  onClick={() =>
                    removeImage(url)
                  }
                  disabled={uploading}
                >
                  حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="multi-image-uploader__empty"
          disabled={uploading}
          onClick={() =>
            inputRef.current?.click()
          }
        >
          <span>📷</span>

          <strong>
            عکس‌های فضا را انتخاب کن
          </strong>

          <small>
            می‌توانی چند عکس را هم‌زمان انتخاب کنی؛ حداکثر ۱۰ عکس، هر عکس تا ۱۰MB؛ عکس‌های تکراری پذیرفته نمی‌شوند و تصاویر بزرگ خودکار بهینه می‌شوند
          </small>
        </button>
      )}

      {images.length > 0 &&
        images.length < maxImages && (
          <p className="multi-image-uploader__hint">
            عکس دارای برچسب «عکس اصلی»، تصویر کارت آگهی است.
            برای تغییر آن از دکمه روی هر تصویر استفاده کن.
          </p>
        )}
    </div>
  );
}

export default ImageUploader;