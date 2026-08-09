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
  listingType: "offer",
  category: "parking",
  customCategory: "",
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
    title: "نوع و مشخصات فضا",
    description: "نوع آگهی، دسته‌بندی، عنوان و شهر",
  },
  {
    id: 2,
    title: "تصویر آگهی",
    description: "افزودن تصویر فضای موردنظر",
  },
  {
    id: 3,
    title: "اطلاعات نهایی",
    description: "قیمت، تماس و توضیحات",
  },
];

const SPACE_CATEGORIES = [
  {
    value: "parking",
    label: "پارکینگ",
    icon: "🚘",
  },
  {
    value: "storage",
    label: "انبار",
    icon: "📦",
  },
  {
    value: "warehouse",
    label: "سوله",
    icon: "🏭",
  },
  {
    value: "shop",
    label: "مغازه",
    icon: "🏪",
  },
  {
    value: "land",
    label: "زمین",
    icon: "🌱",
  },
  {
    value: "other",
    label: "سایر فضاها",
    icon: "✨",
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

  const selectedCategory = useMemo(() => {
    return SPACE_CATEGORIES.find(
      (item) => item.value === form.category
    );
  }, [form.category]);

  const spaceLabel =
    form.category === "other"
      ? form.customCategory.trim() ||
        "فضای دیگر"
      : selectedCategory?.label ||
        "فضا";

  const isWantedAd =
    form.listingType === "wanted";

  const listingTypeLabel = isWantedAd
    ? "دنبال فضا هستم"
    : "فضا برای اجاره دارم";

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
      if (
        form.category === "other" &&
        !form.customCategory.trim()
      ) {
        newErrors.customCategory =
          "نوع فضای موردنظر را وارد کنید.";
      }

      if (!form.title.trim()) {
        newErrors.title =
          "عنوان آگهی را وارد کنید.";
      }

      if (!form.city.trim()) {
        newErrors.city =
          "شهر موردنظر را وارد کنید.";
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
      if (
        !isWantedAd &&
        !form.imageUrl
      ) {
        newErrors.imageUrl =
          "برای آگهی فضای قابل اجاره یک تصویر انتخاب کنید.";
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
          listingType:
            form.listingType,

          category:
            form.category,

          customCategory:
            form.category === "other"
              ? form.customCategory.trim()
              : "",

          categoryLabel:
            spaceLabel,

          status: "active",

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
                ثبت آگهی جدید
              </span>

              <h1>
                فضای مناسب را در فضاجو
                پیدا کن یا معرفی کن
              </h1>

              <p>
                چه فضایی برای اجاره داشته باشی و چه دنبال فضای مناسب باشی،
                اطلاعات را در سه مرحله کوتاه وارد کن و آگهی خودت را منتشر کن.
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
                      <span>
                        {selectedCategory?.icon || "✨"}
                      </span>

                      <div>
                        <strong>
                          نوع آگهی و فضای موردنظر
                        </strong>

                        <p>
                          اول مشخص کن فضا برای اجاره داری یا دنبال اجاره فضا هستی،
                          سپس نوع فضا را انتخاب کن.
                        </p>
                      </div>
                    </div>

                    <div className="add-parking-field">
                      <label>
                        نوع آگهی
                        <span>*</span>
                      </label>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(2, minmax(0, 1fr))",
                          gap: "12px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setForm((currentForm) => ({
                              ...currentForm,
                              listingType: "offer",
                            }))
                          }
                          disabled={loading}
                          style={{
                            minHeight: "72px",
                            padding: "12px 14px",
                            borderRadius: "16px",
                            border:
                              form.listingType === "offer"
                                ? "2px solid #f47a1f"
                                : "1px solid #eadfd7",
                            background:
                              form.listingType === "offer"
                                ? "#fff4ea"
                                : "white",
                            color: "#342d29",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontWeight: "900",
                          }}
                        >
                          🏠 فضا برای اجاره دارم
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setForm((currentForm) => ({
                              ...currentForm,
                              listingType: "wanted",
                            }))
                          }
                          disabled={loading}
                          style={{
                            minHeight: "72px",
                            padding: "12px 14px",
                            borderRadius: "16px",
                            border:
                              form.listingType === "wanted"
                                ? "2px solid #f47a1f"
                                : "1px solid #eadfd7",
                            background:
                              form.listingType === "wanted"
                                ? "#fff4ea"
                                : "white",
                            color: "#342d29",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontWeight: "900",
                          }}
                        >
                          🔎 دنبال فضا برای اجاره هستم
                        </button>
                      </div>
                    </div>

                    <div className="add-parking-field">
                      <label>
                        نوع فضا
                        <span>*</span>
                      </label>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: "10px",
                        }}
                      >
                        {SPACE_CATEGORIES.map((category) => {
                          const isSelected =
                            form.category === category.value;

                          return (
                            <button
                              type="button"
                              key={category.value}
                              disabled={loading}
                              onClick={() => {
                                setForm((currentForm) => ({
                                  ...currentForm,
                                  category: category.value,
                                  customCategory:
                                    category.value === "other"
                                      ? currentForm.customCategory
                                      : "",
                                }));

                                setErrors((currentErrors) => ({
                                  ...currentErrors,
                                  customCategory: "",
                                }));
                              }}
                              style={{
                                minHeight: "82px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                padding: "10px",
                                borderRadius: "15px",
                                border: isSelected
                                  ? "2px solid #f47a1f"
                                  : "1px solid #eadfd7",
                                background: isSelected
                                  ? "#fff4ea"
                                  : "white",
                                color: "#342d29",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                fontWeight: "900",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "1.45rem",
                                }}
                              >
                                {category.icon}
                              </span>

                              {category.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {form.category === "other" && (
                      <div className="add-parking-field">
                        <label htmlFor="customCategory">
                          نوع فضای دیگر
                          <span>*</span>
                        </label>

                        <div
                          className={[
                            "add-parking-input",
                            errors.customCategory
                              ? "add-parking-input--error"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="add-parking-input__icon">
                            ✨
                          </span>

                          <input
                            id="customCategory"
                            name="customCategory"
                            type="text"
                            placeholder="مثلاً حیاط، زیرزمین، اتاق کار یا محوطه باز"
                            value={form.customCategory}
                            onChange={handleChange}
                            disabled={loading}
                            maxLength={50}
                          />
                        </div>

                        {errors.customCategory && (
                          <span className="add-parking-error">
                            {errors.customCategory}
                          </span>
                        )}
                      </div>
                    )}

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
                          placeholder={
                            isWantedAd
                              ? `مثلاً دنبال ${spaceLabel} در مرکز شهر هستم`
                              : `مثلاً ${spaceLabel} مناسب در مرکز شهر`
                          }
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
                          {isWantedAd
                            ? "تصویر آگهی (اختیاری)"
                            : "تصویر اصلی فضا"}
                        </strong>

                        <p>
                          {isWantedAd
                            ? "اگر تصویر یا نمونه‌ای از فضای مدنظرت داری می‌توانی اضافه کنی؛ برای آگهی درخواست، تصویر اجباری نیست."
                            : `یک تصویر روشن، واضح و واقعی از ${spaceLabel} انتخاب کن.`}
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
                          فضای موردنظر مشخص
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
                          {isWantedAd
                            ? "بودجه"
                            : "قیمت"}
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
                            placeholder={
                              isWantedAd
                                ? "مثلاً تا ماهانه ۳ میلیون"
                                : "مثلاً ماهانه ۳ میلیون"
                            }
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
                          placeholder={
                            isWantedAd
                              ? `درباره ${spaceLabel} موردنیازت، محدوده، متراژ، امکانات و شرایط مدنظر توضیح بده...`
                              : `درباره ${spaceLabel}، موقعیت، دسترسی، امکانات و سایر ویژگی‌ها توضیح بده...`
                          }
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
                              "شهر موردنظر"}
                          </span>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "7px",
                              marginBottom: "6px",
                            }}
                          >
                            <small
                              style={{
                                padding: "4px 8px",
                                borderRadius: "999px",
                                background: "#fff1e6",
                                color: "#d95f0b",
                                fontWeight: "900",
                              }}
                            >
                              {listingTypeLabel}
                            </small>

                            <small
                              style={{
                                padding: "4px 8px",
                                borderRadius: "999px",
                                background: "#f8f5f2",
                                color: "#65574f",
                                fontWeight: "900",
                              }}
                            >
                              {spaceLabel}
                            </small>
                          </div>

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