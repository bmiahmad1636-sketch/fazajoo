import { useState } from "react";
import { deleteAdImage, uploadAdImage } from "../services/uploadService";

function ImageUploader({ imageUrl, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("فرمت عکس باید JPG، PNG یا WebP باشد");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("حجم عکس نباید بیشتر از ۵ مگابایت باشد");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError("");

    try {
      const result = await uploadAdImage(file);

      // تست موقت برای دیدن نتیجه آپلود
      console.log("UPLOAD RESULT:", result);

      if (imageUrl) {
        await deleteAdImage(imageUrl).catch(() => undefined);
      }

      onUploadComplete(result.url);

    } catch (uploadError) {
      console.error("UPLOAD ERROR:", uploadError);
      setError(
        uploadError.message ||
        "آپلود عکس انجام نشد. دوباره تلاش کنید"
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };


  const removeImage = async () => {
    setUploading(true);
    setError("");

    try {
      await deleteAdImage(imageUrl);
      onUploadComplete("");

    } catch (removeError) {
      console.error("REMOVE ERROR:", removeError);
      setError("حذف عکس انجام نشد. دوباره تلاش کنید");

    } finally {
      setUploading(false);
    }
  };


  return (
    <div style={{ direction: "rtl", marginBottom: "20px" }}>

      <label
        style={{
          display: "block",
          marginBottom: "8px",
          fontWeight: "bold"
        }}
      >
        تصویر آگهی
      </label>


      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={uploadImage}
        disabled={uploading}
      />


      {uploading && (
        <p style={{ marginTop: "10px" }}>
          در حال ارتباط با فضای ذخیره‌سازی فضاجو...
        </p>
      )}


      {error && (
        <p style={{ marginTop: "10px", color: "red" }}>
          {error}
        </p>
      )}


      {imageUrl && (
        <div style={{ marginTop: "15px" }}>

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
              marginBottom: "10px"
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