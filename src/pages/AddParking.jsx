import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import ImageUploader from "../components/ImageUploader";

import "./AddParking.css";

const INITIAL_FORM = {
  title: "",
  city: "",
  area: "",
  price: "",
  phone: "",
  imageUrl: "",
  description: "",
};

const STEPS = [
  {
    id: 1,
    title: "مشخصات اصلی",
    description: "عنوان، شهر و متراژ",
  },
  {
    id: 2,
    title: "تصویر آگهی",
    description: "افزودن تصویر پارکینگ",
  },
  {
    id: 3,
    title: "اطلاعات تماس",
    description: "قیمت، تماس و توضیحات",
  },
];

function AddParking() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const progress = useMemo(() => {
    return (currentStep / STEPS.length) * 100;
  }, [currentStep]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
  };

  const handleImageUpload = (imageUrl) => {
    setForm((currentForm) => ({
      ...currentForm,
      imageUrl,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      imageUrl: "",
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!form.title.trim()) {
        newErrors.title =
          "عنوان آگهی را وارد کنید.";
      }

      if (!form.city.trim()) {
        newErrors.city =
          "شهر پارکینگ را وارد کنید.";
      }

      if (
        form.area &&
        Number(form.area) <= 0
      ) {
        newErrors.area =
          "متراژ باید بیشتر از صفر باشد.";
      }
    }

    if (step === 2) {
      if (!form.imageUrl) {
        newErrors.imageUrl =
          "برای آگهی یک تصویر انتخاب کنید.";
      }
    }

    if (step === 3) {
      if (!form.price.trim()) {
        newErrors.price =
          "قیمت یا عبارت توافقی را وارد کنید.";
      }

      if (!form.phone.trim()) {
        newErrors.phone =
          "شماره تماس را وارد کنید.";
      } else if (
        !/^09\d{9}$/.test(
          form.phone.replace(/\s/g, "")
        )
      ) {
        newErrors.phone =
          "شماره موبایل معتبر وارد کنید.";
      }

      if (
        form.description.trim().length <
        10
      ) {
        newErrors.description =
          "توضیحات باید حداقل ۱۰ کاراکتر باشد.";
      }
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length === 0
    );
  };

  const goToNextStep = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setCurrentStep((step) =>
      Math.min(step + 1, STEPS.length)
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const goToPreviousStep = () => {
    setErrors({});

    setCurrentStep((step) =>
      Math.max(step - 1, 1)
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const goToStep = (step) => {
    if (step >= currentStep) {
      return;
    }

    setErrors({});
    setCurrentStep(step);
  };

  const saveParking = async (event) => {
    event.preventDefault();

    if (currentStep !== STEPS.length) {
      goToNextStep();
      return;
    }

    if (!validateStep(3)) {
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert(
        "برای ثبت آگهی ابتدا وارد حساب شوید."
      );

      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      await addDoc(
        collection(db, "spaces"),
        {
          title: form.title.trim(),
          city: form.city.trim(),

          area: form.area
            ? Number(form.area)
            : 0,

          price: form.price.trim(),
          phone: form.phone
            .replace(/\s/g, "")
            .trim(),

          imageUrl: form.imageUrl,

          description:
            form.description.trim(),

          ownerId: currentUser.uid,

          ownerEmail:
            currentUser.email || "",

          createdAt: serverTimestamp(),
        }
      );

      alert(
        "آگهی با موفقیت ثبت شد."
      );

      setForm(INITIAL_FORM);
      setErrors({});
      setCurrentStep(1);

      navigate("/parking");
    } catch (error) {
      console.error(error);

      alert(
        "خطا در ثبت آگهی. دوباره تلاش کنید."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="add-parking-page">
      <div className="add-parking-background">
        <span className="add-parking-orb add-parking-orb--one" />
        <span className="add-parking-orb add-parking-orb--two" />
        <span className="add-parking-orb add-parking-orb--three" />
      </div>

      <section className="add-parking-hero">
        <div className="container">
          <button
            type="button"
            className="add-parking-back"
            onClick={() =>
              navigate("/parking")
            }
          >
            <span>→</span>
            بازگشت به آگهی‌ها
          </button>

          <div className="add-parking-hero__content">
            <div>
              <span className="add-parking-eyebrow">
                ثبت فضای جدید
              </span>

              <h1>
                پارکینگت را در فضاجو
                معرفی کن
              </h1>

              <p>
                اطلاعات پارکینگ را در سه
                مرحله کوتاه وارد کن و
                آگهی حرفه‌ای خودت را
                منتشر کن.
              </p>
            </div>

            <div className="add-parking-hero__badge">
              <span>۳</span>

              <div>
                <strong>
                  مرحله کوتاه
                </strong>

                <small>
                  تا انتشار آگهی
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="add-parking-content">
        <div className="container">
          <div className="add-parking-layout">
            <aside className="add-parking-sidebar">
              <div className="add-parking-progress-card">
                <div className="add-parking-progress-card__heading">
                  <div>
                    <span>
                      پیشرفت ثبت آگهی
                    </span>

                    <strong>
                      مرحله {currentStep} از{" "}
                      {STEPS.length}
                    </strong>
                  </div>

                  <span className="add-parking-progress-card__percent">
                    {Math.round(progress)}٪
                  </span>
                </div>

                <div className="add-parking-progress">
                  <span
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <div className="add-parking-steps">
                  {STEPS.map((step) => {
                    const isActive =
                      step.id === currentStep;

                    const isCompleted =
                      step.id < currentStep;

                    return (
                      <button
                        type="button"
                        key={step.id}
                        onClick={() =>
                          goToStep(step.id)
                        }
                        className={[
                          "add-parking-step",
                          isActive
                            ? "add-parking-step--active"
                            : "",
                          isCompleted
                            ? "add-parking-step--completed"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="add-parking-step__number">
                          {isCompleted
                            ? "✓"
                            : step.id}
                        </span>

                        <span className="add-parking-step__text">
                          <strong>
                            {step.title}
                          </strong>

                          <small>
                            {step.description}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="add-parking-tip">
                <span className="add-parking-tip__icon">
                  ✦
                </span>

                <div>
                  <strong>
                    آگهی کامل‌تر، بازدید
                    بیشتر
                  </strong>

                  <p>
                    تصویر واضح، عنوان دقیق
                    و توضیحات کامل باعث
                    اعتماد بیشتر کاربران
                    می‌شود.
                  </p>
                </div>
              </div>
            </aside>

            <div className="add-parking-form-card">
              <form
                onSubmit={saveParking}
                noValidate
              >
                <div className="add-parking-form-header">
                  <span className="add-parking-form-header__step">
                    مرحله {currentStep}
                  </span>

                  <h2>
                    {
                      STEPS[currentStep - 1]
                        .title
                    }
                  </h2>

                  <p>
                    {
                      STEPS[currentStep - 1]
                        .description
                    }
                  </p>
                </div>

                {currentStep === 1 && (
                  <div className="add-parking-step-content">
                    <div className="add-parking-intro">
                      <span>🚘</span>

                      <div>
                        <strong>
                          مشخصات اصلی
                          پارکینگ
                        </strong>

                        <p>
                          اطلاعاتی وارد کن
                          که کاربران در نگاه
                          اول باید بدانند.
                        </p>
                      </div>
                    </div>

                    <div className="add-parking-field">
                      <label htmlFor="title">
                        عنوان آگهی
                        <span>*</span>
                      </label>

                      <div
                        className={[
                          "add-parking-input",
                          errors.title
                            ? "add-parking-input--error"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="add-parking-input__icon">
                          ✎
                        </span>

                        <input
                          id="title"
                          name="title"
                          type="text"
                          placeholder="مثلاً پارکینگ مسقف در مرکز شهر"
                          value={form.title}
                          onChange={handleChange}
                          disabled={loading}
                          maxLength={80}
                          autoFocus
                        />
                      </div>

                      <div className="add-parking-field__meta">
                        {errors.title ? (
                          <span className="add-parking-error">
                            {errors.title}
                          </span>
                        ) : (
                          <span>
                            عنوانی کوتاه و
                            واضح انتخاب کن.
                          </span>
                        )}

                        <span>
                          {form.title.length}
                          /۸۰
                        </span>
                      </div>
                    </div>

                    <div className="add-parking-fields-grid">
                      <div className="add-parking-field">
                        <label htmlFor="city">
                          شهر
                          <span>*</span>
                        </label>

                        <div
                          className={[
                            "add-parking-input",
                            errors.city
                              ? "add-parking-input--error"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="add-parking-input__icon">
                            ⌖
                          </span>

                          <input
                            id="city"
                            name="city"
                            type="text"
                            placeholder="مثلاً تهران"
                            value={form.city}
                            onChange={
                              handleChange
                            }
                            disabled={loading}
                          />
                        </div>

                        {errors.city && (
                          <span className="add-parking-error">
                            {errors.city}
                          </span>
                        )}
                      </div>

                      <div className="add-parking-field">
                        <label htmlFor="area">
                          متراژ
                        </label>

                        <div
                          className={[
                            "add-parking-input",
                            errors.area
                              ? "add-parking-input--error"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="add-parking-input__icon">
                            ↔
                          </span>

                          <input
                            id="area"
                            name="area"
                            type="number"
                            min="1"
                            placeholder="مثلاً ۱۵"
                            value={form.area}
                            onChange={
                              handleChange
                            }
                            disabled={loading}
                          />

                          <span className="add-parking-input__suffix">
                            متر
                          </span>
                        </div>

                        {errors.area && (
                          <span className="add-parking-error">
                            {errors.area}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="add-parking-step-content">
                    <div className="add-parking-intro add-parking-intro--image">
                      <span>▧</span>

                      <div>
                        <strong>
                          تصویر اصلی آگهی
                        </strong>

                        <p>
                          یک تصویر روشن،
                          واضح و واقعی از
                          پارکینگ انتخاب کن.
                        </p>
                      </div>
                    </div>

                    <div
                      className={[
                        "add-parking-uploader",
                        errors.imageUrl
                          ? "add-parking-uploader--error"
                          : "",
                        form.imageUrl
                          ? "add-parking-uploader--completed"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <ImageUploader
                        imageUrl={
                          form.imageUrl
                        }
                        onUploadComplete={
                          handleImageUpload
                        }
                      />
                    </div>

                    {errors.imageUrl && (
                      <span className="add-parking-error add-parking-error--block">
                        {errors.imageUrl}
                      </span>
                    )}

                    {form.imageUrl && (
                      <div className="add-parking-upload-success">
                        <span>✓</span>

                        <div>
                          <strong>
                            تصویر آماده است
                          </strong>

                          <p>
                            این تصویر به‌عنوان
                            تصویر اصلی آگهی
                            نمایش داده می‌شود.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="add-parking-image-guide">
                      <div>
                        <span>☀</span>

                        <strong>
                          نور مناسب
                        </strong>

                        <p>
                          تصویر روشن و واضح
                          انتخاب کن.
                        </p>
                      </div>

                      <div>
                        <span>▣</span>

                        <strong>
                          کادر کامل
                        </strong>

                        <p>
                          فضای پارکینگ مشخص
                          باشد.
                        </p>
                      </div>

                      <div>
                        <span>✓</span>

                        <strong>
                          تصویر واقعی
                        </strong>

                        <p>
                          از عکس واقعی ملک
                          استفاده کن.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="add-parking-step-content">
                    <div className="add-parking-intro add-parking-intro--contact">
                      <span>☎</span>

                      <div>
                        <strong>
                          اطلاعات نهایی
                        </strong>

                        <p>
                          قیمت، شماره تماس و
                          جزئیات آگهی را کامل
                          کن.
                        </p>
                      </div>
                    </div>

                    <div className="add-parking-fields-grid">
                      <div className="add-parking-field">
                        <label htmlFor="price">
                          قیمت
                          <span>*</span>
                        </label>

                        <div
                          className={[
                            "add-parking-input",
                            errors.price
                              ? "add-parking-input--error"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="add-parking-input__icon">
                            ﷼
                          </span>

                          <input
                            id="price"
                            name="price"
                            type="text"
                            placeholder="مثلاً ماهانه ۳ میلیون"
                            value={form.price}
                            onChange={
                              handleChange
                            }
                            disabled={loading}
                          />
                        </div>

                        {errors.price && (
                          <span className="add-parking-error">
                            {errors.price}
                          </span>
                        )}
                      </div>

                      <div className="add-parking-field">
                        <label htmlFor="phone">
                          شماره تماس
                          <span>*</span>
                        </label>

                        <div
                          className={[
                            "add-parking-input",
                            errors.phone
                              ? "add-parking-input--error"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="add-parking-input__icon">
                            ☎
                          </span>

                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            placeholder="09123456789"
                            value={form.phone}
                            onChange={
                              handleChange
                            }
                            disabled={loading}
                            dir="ltr"
                            maxLength={11}
                          />
                        </div>

                        {errors.phone && (
                          <span className="add-parking-error">
                            {errors.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="add-parking-field">
                      <label htmlFor="description">
                        توضیحات آگهی
                        <span>*</span>
                      </label>

                      <div
                        className={[
                          "add-parking-textarea",
                          errors.description
                            ? "add-parking-input--error"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <textarea
                          id="description"
                          name="description"
                          placeholder="درباره موقعیت، دسترسی، مسقف بودن، امنیت و سایر ویژگی‌های پارکینگ توضیح بده..."
                          value={
                            form.description
                          }
                          onChange={
                            handleChange
                          }
                          rows={7}
                          disabled={loading}
                          maxLength={800}
                        />
                      </div>

                      <div className="add-parking-field__meta">
                        {errors.description ? (
                          <span className="add-parking-error">
                            {
                              errors.description
                            }
                          </span>
                        ) : (
                          <span>
                            جزئیاتی بنویس که
                            به تصمیم‌گیری
                            کاربران کمک کند.
                          </span>
                        )}

                        <span>
                          {
                            form.description
                              .length
                          }
                          /۸۰۰
                        </span>
                      </div>
                    </div>

                    <div className="add-parking-preview">
                      <div className="add-parking-preview__heading">
                        <div>
                          <span>
                            پیش‌نمایش آگهی
                          </span>

                          <strong>
                            آماده انتشار
                          </strong>
                        </div>

                        <span className="add-parking-preview__status">
                          <i />
                          فعال
                        </span>
                      </div>

                      <div className="add-parking-preview__card">
                        <div className="add-parking-preview__image">
                          {form.imageUrl ? (
                            <img
                              src={
                                form.imageUrl
                              }
                              alt={
                                form.title ||
                                "پیش‌نمایش آگهی"
                              }
                            />
                          ) : (
                            <span>🚘</span>
                          )}
                        </div>

                        <div className="add-parking-preview__content">
                          <span>
                            {form.city ||
                              "شهر پارکینگ"}
                          </span>

                          <h3>
                            {form.title ||
                              "عنوان آگهی"}
                          </h3>

                          <div>
                            <strong>
                              {form.price ||
                                "قیمت آگهی"}
                            </strong>

                            <small>
                              {form.area
                                ? `${form.area} متر`
                                : "متراژ ثبت نشده"}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="add-parking-actions">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      className="add-parking-button add-parking-button--secondary"
                      onClick={
                        goToPreviousStep
                      }
                      disabled={loading}
                    >
                      <span>→</span>
                      مرحله قبل
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="add-parking-button add-parking-button--secondary"
                      onClick={() =>
                        navigate("/parking")
                      }
                      disabled={loading}
                    >
                      انصراف
                    </button>
                  )}

                  {currentStep <
                  STEPS.length ? (
                    <button
                      type="button"
                      className="add-parking-button add-parking-button--primary"
                      onClick={goToNextStep}
                      disabled={loading}
                    >
                      ادامه
                      <span>←</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="add-parking-button add-parking-button--publish"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="add-parking-spinner" />
                          در حال انتشار...
                        </>
                      ) : (
                        <>
                          انتشار آگهی
                          <span>✓</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AddParking;