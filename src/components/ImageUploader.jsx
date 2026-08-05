import { useState } from "react";

function ImageUploader({ imageUrl, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("فقط فایل تصویری انتخاب کنید");
      event.target.value = "";
      return;
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {
      setError("حجم عکس نباید بیشتر از ۵ مگابایت باشد");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("upload_preset", "fazajoo_unsigned");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/sclguyes/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.secure_url) {
        throw new Error(
          result.error?.message || "خطا در آپلود عکس"
        );
      }

      onUploadComplete(result.secure_url);
    } catch (uploadError) {
      console.error(uploadError);
      setError("آپلود عکس انجام نشد. دوباره تلاش کنید");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removeImage = () => {
    onUploadComplete("");
    setError("");
  };

  return (
    <div
      style={{
        direction: "rtl",
        marginBottom: "20px",
      }}
    >
      <label
        style={{
          display: "block",
          marginBottom: "8px",
          fontWeight: "bold",
        }}
      >
        تصویر آگهی
      </label>

      <input
        type="file"
        accept="image/*"
        onChange={uploadImage}
        disabled={uploading}
      />

      {uploading && (
        <p
          style={{
            marginTop: "10px",
          }}
        >
          در حال آپلود عکس...
        </p>
      )}

      {error && (
        <p
          style={{
            marginTop: "10px",
            color: "red",
          }}
        >
          {error}
        </p>
      )}

      {imageUrl && (
        <div
          style={{
            marginTop: "15px",
          }}
        >
          <img
            src={imageUrl}
            alt="پیش‌نمایش تصویر آگهی"
            style={{
              width: "100%",
              maxWidth: "400px",
              height: "250px",
              objectFit: "cover",
              borderRadius: "12px",
              display: "block",
              marginBottom: "10px",
            }}
          />

          <button
            type="button"
            onClick={removeImage}
            disabled={uploading}
          >
            حذف عکس
          </button>
        </div>
      )}
    </div>
  );
}

export default ImageUploader;