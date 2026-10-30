import { showInSiteAlert, showInSiteConfirm } from "../utils/inSiteDialog";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { updateSpace } from "../services/spaceService";
import ImageUploader from "../components/ImageUploader";
import VideoUploader from "../components/VideoUploader";
import NeshanLocationPicker from "../components/NeshanLocationPicker";
import ParkingRequestUsageFields from "../components/ParkingRequestUsageFields";
import { readParkingRequestUsage, writeParkingRequestUsage, parkingUsageLabel } from "../utils/parkingRequestUsage";
import WarehouseRequestFields from "../components/WarehouseRequestFields";
import { readWarehouseRequest, writeWarehouseRequest, warehouseRequestValidation } from "../utils/warehouseRequest";
import ResidentialFields from "../components/ResidentialFields";
import { emptyResidentialDetails } from "../components/residentialDetails";
import VillaFields from "../components/VillaFields";
import GardenFields from "../components/GardenFields";
import ShopFields from "../components/ShopFields";
import { emptyShopDetails } from "../components/shopDetails";
import { emptyGardenDetails } from "../components/gardenDetails";
import { emptyVillaDetails } from "../components/villaDetails";
import "../components/ResidentialFields.css";

import "./EditParking.css";

const EMPTY_FORM = {
  title: "",
  parkingRequestUsage: "",
  parkingOtherUsage: "",
  warehouseRequest: readWarehouseRequest("").data,
  city: "",
  area: "",
  price: "",
  priceType: "monthly",
  phone: "",
  imageUrl: "",
  imageUrls: [],
  video: null,
  description: "",
  residentialDetails: { ...emptyResidentialDetails },
  villaDetails: { ...emptyVillaDetails },
  gardenDetails: { ...emptyGardenDetails },
  shopDetails: { ...emptyShopDetails },
  agencyNetworkConsent: false,
  location: { lat: null, lng: null },
};

const PRICE_TYPES = [
  { value: "daily", label: "روزانه / شبانه" },
  { value: "weekly", label: "هفتگی" },
  { value: "monthly", label: "ماهانه" },
  { value: "yearly", label: "سالانه" },
  { value: "negotiable", label: "توافقی" },
];

function toEnglishDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    )
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    );
}

function formatPriceInput(value) {
  const digits = toEnglishDigits(value)
    .replace(/\D/g, "");

  return digits
    ? Number(digits).toLocaleString("en-US")
    : "";
}

function getPriceTypeLabel(value) {
  return (
    PRICE_TYPES.find(
      (item) => item.value === value
    )?.label || "ماهانه"
  );
}

function createFormFromParking(parking) {
  return {
    title: parking?.title || "",
    city: parking?.city || "",
    area:
      parking?.area === 0
        ? "0"
        : parking?.area || "",
    price: formatPriceInput(
      parking?.price || ""
    ),
    priceType:
      parking?.priceType || "monthly",
    phone: parking?.phone || "",
    imageUrl:
      parking?.imageUrl || parking?.imageUrls?.[0] || "",
    video: parking?.video || null,
    imageUrls:
      Array.isArray(parking?.imageUrls) && parking.imageUrls.length
        ? parking.imageUrls
        : parking?.imageUrl
          ? [parking.imageUrl]
          : [],
    residentialDetails: { ...emptyResidentialDetails, ...(parking?.residentialDetails || {}) },
    villaDetails: { ...emptyVillaDetails, ...(parking?.villaDetails || {}) },
    gardenDetails: { ...emptyGardenDetails, ...(parking?.gardenDetails || {}) },
    shopDetails: { ...emptyShopDetails, ...(parking?.shopDetails || {}) },
    description: parking?.listingType === "wanted" && parking?.category === "storage"
      ? readWarehouseRequest(parking?.description).description
      : readParkingRequestUsage(parking?.description).description,
    parkingRequestUsage: readParkingRequestUsage(parking?.description).usage,
    parkingOtherUsage: readParkingRequestUsage(parking?.description).otherUsage,
    warehouseRequest: readWarehouseRequest(parking?.description).data,
    agencyNetworkConsent: Boolean(parking?.agencyNetworkConsent),
    location: {
      lat: parking?.location?.lat ?? null,
      lng: parking?.location?.lng ?? null,
    },
  };
}

function EditParking({
  parkings = [],
  updateParkingInState,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const parking = useMemo(() => {
    return parkings.find(
      (item) =>
        String(item.id) === String(id)
    );
  }, [parkings, id]);

  const isWanted =
    (parking?.listingType || "offer") === "wanted";

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [initialForm, setInitialForm] =
    useState(EMPTY_FORM);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] =
    useState(false);

  const [showSuccess, setShowSuccess] =
    useState(false);

  useEffect(() => {
    if (!parking) {
      return;
    }

    const nextForm =
      createFormFromParking(parking);

    setForm(nextForm);
    setInitialForm(nextForm);
    setErrors({});
  }, [parking]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !==
      JSON.stringify(initialForm);
  }, [form, initialForm]);

  const completionPercentage =
    useMemo(() => {
      // Requests are complete without photos; negotiated budgets need no amount.
      const fields = [
        form.title.trim(),
        form.city.trim(),
        isWanted && parking?.category === "storage" ? (form.warehouseRequest?.minArea || form.warehouseRequest?.maxArea) : form.area,
        form.priceType === "negotiable" ? true : form.price.trim(),
        form.phone.trim(),
        ...(!isWanted ? [form.imageUrl] : []),
        ...(isWanted && parking?.category === "storage" ? [form.warehouseRequest?.purpose] : [form.description.trim()]),
      ];

      const completedFields =
        fields.filter(Boolean).length;

      return Math.round(
        (completedFields /
          fields.length) *
          100
      );
    }, [form, isWanted]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]:
        name === "price"
          ? formatPriceInput(value)
          : value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));

    setShowSuccess(false);
  };

  const handleImageUpload = (imageUrls) => {
    const nextImages = Array.isArray(imageUrls) ? imageUrls : [];
    setForm((currentForm) => ({
      ...currentForm,
      imageUrls: nextImages,
      imageUrl:
        currentForm.imageUrl && nextImages.includes(currentForm.imageUrl)
          ? currentForm.imageUrl
          : nextImages[0] || "",
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      imageUrl: "",
    }));

    setShowSuccess(false);
  };

  const handleMainImageChange = (url) => {
    setForm((currentForm) => ({
      ...currentForm,
      imageUrl: url || "",
    }));
    setShowSuccess(false);
  };

  const validateForm = () => {
    const nextErrors = {};
    if (isWanted && parking?.category === "storage") {
      const warehouseError = warehouseRequestValidation(form.warehouseRequest);
      if (warehouseError) nextErrors.warehouseRequest = warehouseError;
    }
    if (isWanted && parking?.category === "parking") {
      if (!form.parkingRequestUsage) nextErrors.parkingRequestUsage = "کاربری موردنظر را انتخاب کنید.";
      else if (form.parkingRequestUsage === "other" && form.parkingOtherUsage.trim().length < 5) nextErrors.parkingRequestUsage = "کاربری دیگر را حداقل در ۵ حرف توضیح دهید.";
    }

    if (!form.title.trim()) {
      nextErrors.title =
        isWanted ? "عنوان درخواست را وارد کنید." : "عنوان آگهی را وارد کنید.";
    } else if (
      form.title.trim().length < 5
    ) {
      nextErrors.title =
        "عنوان باید حداقل ۵ کاراکتر باشد.";
    }

    if (!form.city.trim()) {
      nextErrors.city =
        "نام شهر را وارد کنید.";
    }

    if (
      form.area &&
      Number(form.area) <= 0
    ) {
      nextErrors.area =
        "متراژ باید بیشتر از صفر باشد.";
    }

    if (parking?.category === "residential") {
      if (!String(form.residentialDetails?.deposit || "").trim() &&
          !String(form.residentialDetails?.monthlyRent || "").trim()) {
        nextErrors.price = "حداقل مبلغ رهن یا اجاره را وارد کنید.";
      }
    } else if (form.priceType !== "negotiable" && !form.price.trim()) {
      nextErrors.price = isWanted ? "سقف بودجه را وارد کنید." : "قیمت را وارد کنید.";
    }

    const normalizedPhone =
      form.phone.replace(/\s/g, "");

    if (!normalizedPhone) {
      nextErrors.phone =
        "شماره تماس را وارد کنید.";
    } else if (
      !/^09\d{9}$/.test(normalizedPhone)
    ) {
      nextErrors.phone =
        "شماره موبایل معتبر وارد کنید.";
    }

    if (!isWanted && !form.imageUrl) {
      nextErrors.imageUrl =
        "یک تصویر برای آگهی فضای قابل اجاره انتخاب کنید.";
    }

    if (
      !(isWanted && parking?.category === "storage") && form.description.trim().length < 10
    ) {
      nextErrors.description =
        "توضیحات باید حداقل ۱۰ کاراکتر باشد.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  const resetChanges = async () => {
    if (!hasChanges || loading) {
      return;
    }

    const shouldReset = await showInSiteConfirm(
      "تغییرات ذخیره‌نشده حذف شوند؟",
      "حذف تغییرات"
    );

    if (!shouldReset) {
      return;
    }

    setForm(initialForm);
    setErrors({});
    setShowSuccess(false);
  };

  const handleCancel = async () => {
    if (hasChanges && !loading) {
      const shouldLeave = await showInSiteConfirm(
        "تغییرات ذخیره نشده‌اند. از صفحه خارج می‌شوید؟",
        "خروج از صفحه"
      );

      if (!shouldLeave) {
        return;
      }
    }

    navigate(`/parking/${id}`);
  };

  const saveEdit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    if (!hasChanges) {
      setShowSuccess(true);
      return;
    }

    setLoading(true);
    setShowSuccess(false);

    const normalizedPhone =
      form.phone.replace(/\s/g, "");

    const updatedData = {
      title: form.title.trim(),
      city: form.city.trim(),

      area: isWanted && parking?.category === "storage"
        ? Number(form.warehouseRequest.minArea || form.warehouseRequest.maxArea || 0)
        : form.area ? Number(form.area) : 0,

      price:
        parking?.category === "residential"
          ? String(
              form.residentialDetails?.monthlyRent ||
              form.residentialDetails?.deposit ||
              ""
            )
          : form.priceType === "negotiable" ? "" : form.price.replace(/,/g, "").trim(),
      priceType:
        parking?.category === "residential"
          ? "monthly"
          : form.priceType,
      residentialDetails:
        parking?.category === "residential"
          ? form.residentialDetails
          : {},
      gardenDetails: parking?.category === "garden" ? form.gardenDetails : {},
      shopDetails: parking?.category === "shop" ? form.shopDetails : {},
      villaDetails:
        parking?.category === "villa"
          ? form.villaDetails
          : {},
      phone: normalizedPhone,
      imageUrl: isWanted && parking?.category === "storage" ? "" : form.imageUrl,
      imageUrls: isWanted && parking?.category === "storage" ? [] : form.imageUrls,
      video: isWanted && parking?.category === "storage" ? null : form.video,

      description:
        isWanted && parking?.category === "parking"
          ? writeParkingRequestUsage(form.description, form.parkingRequestUsage, form.parkingOtherUsage)
          : isWanted && parking?.category === "storage"
            ? writeWarehouseRequest("", form.warehouseRequest)
            : form.description.trim(),
      agencyNetworkConsent: Boolean(form.agencyNetworkConsent),
      location: form.location,

    };

    try {
      await updateSpace(id, updatedData);

      if (updateParkingInState) {
        updateParkingInState(id, {
          ...updatedData,
          updatedAt: new Date(),
        });
      }

      const nextInitialForm = {
        ...form,
        title: form.title.trim(),
        city: form.city.trim(),
        price: formatPriceInput(
          form.price
        ),
        priceType: form.priceType,
        phone: normalizedPhone,
        description:
          form.description.trim(),
      };

      setForm(nextInitialForm);
      setInitialForm(nextInitialForm);
      setShowSuccess(true);

      window.setTimeout(() => {
        navigate(`/parking/${id}`);
      }, 1800);
    } catch (error) {
      console.error(
        "خطا در ویرایش آگهی:",
        error
      );

      showInSiteAlert("ویرایش آگهی انجام نشد. دوباره تلاش کنید.", "ویرایش آگهی");
    } finally {
      setLoading(false);
    }
  };

  if (!parking) {
    return (
      <main className="edit-parking-not-found">
        <div className="edit-parking-not-found__orb edit-parking-not-found__orb--one" />
        <div className="edit-parking-not-found__orb edit-parking-not-found__orb--two" />

        <section className="edit-parking-not-found__card">
          <div className="edit-parking-not-found__icon">
            ?
          </div>

          <span className="edit-parking-not-found__eyebrow">
            نتیجه‌ای پیدا نشد
          </span>

          <h1>آگهی در دسترس نیست</h1>

          <p>
            ممکن است آگهی حذف شده باشد یا
            هنوز اطلاعات آن دریافت نشده
            باشد.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/parking")
            }
          >
            <span>→</span>
            بازگشت به آگهی‌ها
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={`edit-parking-page${isWanted ? " edit-parking-page--wanted" : ""}`}>
      <div className="edit-parking-page__background">
        <span className="edit-parking-orb edit-parking-orb--one" />
        <span className="edit-parking-orb edit-parking-orb--two" />
        <span className="edit-parking-orb edit-parking-orb--three" />
      </div>

      <section className="edit-parking-hero">
        <div className="container">
          <div className="edit-parking-toolbar">
            <button
              type="button"
              className="edit-parking-back"
              onClick={handleCancel}
              disabled={loading}
            >
              <span>→</span>
              بازگشت به آگهی
            </button>

            <div
              className={[
                "edit-parking-status",
                hasChanges
                  ? "edit-parking-status--changed"
                  : "edit-parking-status--saved",
              ].join(" ")}
            >
              <span />

              {hasChanges
                ? "تغییرات ذخیره‌نشده"
                : "همه تغییرات ذخیره شده"}
            </div>
          </div>

          <div className="edit-parking-hero__content">
            <div>
              <span className="edit-parking-eyebrow">
                {isWanted ? "مدیریت درخواست" : "مدیریت آگهی"}
              </span>

              <h1>{isWanted ? "ویرایش درخواست پارکینگ" : "ویرایش آگهی پارکینگ"}</h1>

              <p>
                {isWanted
                  ? "شرایط و بودجه موردنیازت را دقیق‌تر کن تا تأمین‌کنندگان فضای مناسب‌تری پیشنهاد بدهند."
                  : "اطلاعات آگهی را دقیق‌تر کن تا کاربران سریع‌تر فضای مناسب خودشان را پیدا کنند."}
              </p>
            </div>

            <div className="edit-parking-hero__meta">
              <span className="edit-parking-hero__meta-icon">
                ✎
              </span>

              <div>
                <small>{isWanted ? "درخواست در حال ویرایش" : "آگهی در حال ویرایش"}</small>

                <strong>
                  {parking.title}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="edit-parking-content">
        <div className="container">
          {showSuccess && (
            <div className="edit-parking-success">
              <span>✓</span>

              <div>
                <strong>
                  تغییرات با موفقیت ذخیره شد
                </strong>

                <p>
                  {isWanted ? "در حال انتقال به صفحه درخواست..." : "در حال انتقال به صفحه آگهی..."}
                </p>
              </div>
            </div>
          )}

          <div className="edit-parking-layout">
            <form
              className="edit-parking-form"
              onSubmit={saveEdit}
              noValidate
            >

        {parking?.category === "residential" && (
          <ResidentialFields
            value={form.residentialDetails}
            disabled={loading}
            onChange={(residentialDetails) =>
              setForm((currentForm) => ({
                ...currentForm,
                residentialDetails,
                price: String(residentialDetails.monthlyRent || residentialDetails.deposit || ""),
              }))
            }
          />
        )}

        {parking?.category === "shop" && <ShopFields value={form.shopDetails} disabled={loading} onChange={(shopDetails) => setForm(current => ({ ...current, shopDetails }))} />}

        {parking?.category === "garden" && <GardenFields value={form.gardenDetails} disabled={loading} onChange={(gardenDetails) => setForm((current) => ({ ...current, gardenDetails }))} />}

        {parking?.category === "villa" && (
          <VillaFields
            value={form.villaDetails}
            disabled={loading}
            onChange={(villaDetails) =>
              setForm((currentForm) => ({
                ...currentForm,
                villaDetails,
              }))
            }
          />
        )}

              <section className="edit-parking-card">
                <div className="edit-parking-card__header">
                  <div className="edit-parking-card__icon">
                    01
                  </div>

                  <div>
                    <span>
                      اطلاعات پایه
                    </span>

                    <h2>
                      {isWanted ? "مشخصات اصلی درخواست" : "مشخصات اصلی آگهی"}
                    </h2>

                    <p>
                      عنوان، موقعیت و اندازه
                      پارکینگ را ویرایش کن.
                    </p>
                  </div>
                </div>

                <div className="edit-parking-card__body">
                  {isWanted && parking?.category === "parking" && (
                    <ParkingRequestUsageFields
                      usage={form.parkingRequestUsage}
                      otherUsage={form.parkingOtherUsage}
                      disabled={loading}
                      error={errors.parkingRequestUsage}
                      onChange={({ usage, otherUsage }) => {
                        setForm((current) => ({ ...current, parkingRequestUsage: usage, parkingOtherUsage: otherUsage }));
                        setErrors((current) => ({ ...current, parkingRequestUsage: "" }));
                      }}
                    />
                  )}
                  <div className="edit-parking-field edit-parking-field--full">
                    <label htmlFor="title">
                      {isWanted ? "عنوان درخواست" : "عنوان آگهی"}
                      <span>*</span>
                    </label>

                    <div
                      className={[
                        "edit-parking-input",
                        errors.title
                          ? "edit-parking-input--error"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="edit-parking-input__icon">
                        ✎
                      </span>

                      <input
                        id="title"
                        name="title"
                        type="text"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="مثلاً پارکینگ مسقف نزدیک میدان ونک"
                        maxLength={80}
                        disabled={loading}
                      />
                    </div>

                    <div className="edit-parking-field__meta">
                      {errors.title ? (
                        <span className="edit-parking-error">
                          {errors.title}
                        </span>
                      ) : (
                        <span>
                          عنوانی واضح و
                          قابل‌جست‌وجو بنویس.
                        </span>
                      )}

                      <span>
                        {form.title.length}
                        /۸۰
                      </span>
                    </div>
                  </div>

                  <div className="edit-parking-grid">
                    <div className="edit-parking-field">
                      <label htmlFor="city">
                        شهر
                        <span>*</span>
                      </label>

                      <div
                        className={[
                          "edit-parking-input",
                          errors.city
                            ? "edit-parking-input--error"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="edit-parking-input__icon">
                          ⌖
                        </span>

                        <input
                          id="city"
                          name="city"
                          type="text"
                          value={form.city}
                          onChange={handleChange}
                          placeholder="مثلاً تهران"
                          disabled={loading}
                        />
                      </div>

                      {errors.city && (
                        <span className="edit-parking-error">
                          {errors.city}
                        </span>
                      )}
                    </div>

                    {!(isWanted && parking?.category === "storage") && (
                    <div className="edit-parking-field">
                      <label htmlFor="area">
                        متراژ
                      </label>

                      <div
                        className={[
                          "edit-parking-input",
                          errors.area
                            ? "edit-parking-input--error"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="edit-parking-input__icon">
                          ↔
                        </span>

                        <input
                          id="area"
                          name="area"
                          type="number"
                          min="1"
                          value={form.area}
                          onChange={handleChange}
                          placeholder="مثلاً ۱۵"
                          disabled={loading}
                        />

                        <span className="edit-parking-input__suffix">
                          متر
                        </span>
                      </div>

                      {errors.area && (
                        <span className="edit-parking-error">
                          {errors.area}
                        </span>
                      )}
                    </div>
                    )}
                  </div>
                  {isWanted && parking?.category === "storage" && (
                    <>
                      <div style={{ padding: 14, background: "#fff8f2", border: "1px solid #f3d7c2", borderRadius: 14 }}>
                        <strong>فضایی را که لازم داری توصیف کن</strong>
                        <p style={{ margin: "6px 0 0" }}>کاربری، متراژ موردنیاز، امکانات و شرایط خاص را در کادر زیر ویرایش کن. «شرایط خاص» اختیاری است.</p>
                      </div>
                      <WarehouseRequestFields value={form.warehouseRequest} disabled={loading} error={errors.warehouseRequest} onChange={(warehouseRequest) => { setForm(current => ({ ...current, warehouseRequest })); setErrors(current => ({ ...current, warehouseRequest: "" })); }} />
                    </>
                  )}
                </div>
              </section>

              <section className="edit-parking-card">
                <div className="edit-parking-card__header">
                  <div className="edit-parking-card__icon">⌖</div>
                  <div>
                    <span>موقعیت مکانی</span>
                    <h2>ویرایش موقعیت روی نقشه</h2>
                    <p>{isWanted ? "محدوده مطلوب ثبت‌شده را ببین و فقط در صورت نیاز تغییر بده." : "نقطه فعلی آگهی را ببین و در صورت نیاز جای آن را تغییر بده."}</p>
                  </div>
                </div>
                <div className="edit-parking-card__body">
                  <NeshanLocationPicker
                    value={form.location}
                    city={form.city}
                    disabled={loading}
                    onChange={(location) => {
                      setForm((currentForm) => ({ ...currentForm, location }));
                      setShowSuccess(false);
                    }}
                  />
                </div>
              </section>

              {!isWanted && (
              <section className="edit-parking-card">
                <div className="edit-parking-card__header">
                  <div className="edit-parking-card__icon edit-parking-card__icon--cyan">
                    02
                  </div>

                  <div>
                    <span>
                      تصویر آگهی
                    </span>

                    <h2>
                      عکس‌های آگهی
                    </h2>

                    <p>
                      تا ۸ عکس نگه دار، عکس جدید اضافه کن یا عکس اصلی کارت را تغییر بده.
                    </p>
                  </div>
                </div>

                <div className="edit-parking-card__body">
                  <div
                    className={[
                      "edit-parking-uploader",
                      form.imageUrl
                        ? "edit-parking-uploader--complete"
                        : "",
                      errors.imageUrl
                        ? "edit-parking-uploader--error"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <ImageUploader
                      imageUrls={form.imageUrls}
                      mainImageUrl={form.imageUrl}
                      maxImages={10}
                      onUploadComplete={handleImageUpload}
                      onMainImageChange={handleMainImageChange}
                    />
                  </div>

                  {errors.imageUrl && (
                    <span className="edit-parking-error edit-parking-error--block">
                      {errors.imageUrl}
                    </span>
                  )}

                  {form.imageUrl && (
                    <div className="edit-parking-image-status">
                      <span>✓</span>

                      <div>
                        <strong>
                          {form.imageUrls.length.toLocaleString("fa-IR")} عکس آگهی آماده است
                        </strong>

                        <p>
                          اولین عکس روی کارت و همه عکس‌ها در گالری صفحه جزئیات نمایش داده می‌شوند.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              )}

              {!isWanted && (
                <section className="edit-parking-card">
                  <div className="edit-parking-card__header">
                    <div className="edit-parking-card__icon edit-parking-card__icon--cyan">▶</div>
                    <div>
                      <span>رسانه آگهی</span>
                      <h2>ویدئوی کوتاه فضا</h2>
                      <p>اختیاری؛ حداکثر ۲ دقیقه و ۱۰۰ مگابایت. می‌توانی ویدئو را نگه داری، حذف یا جایگزین کنی.</p>
                    </div>
                  </div>
                  <div className="edit-parking-card__body">
                    <VideoUploader
                      persisted
                      video={form.video}
                      onChange={(video) => { setForm((current) => ({ ...current, video })); setShowSuccess(false); }}
                    />
                  </div>
                </section>
              )}

              <section className="edit-parking-card">
                <div className="edit-parking-card__header">
                  <div className="edit-parking-card__icon edit-parking-card__icon--green">
                    {isWanted ? "02" : "03"}
                  </div>

                  <div>
                    <span>
                      جزئیات نهایی
                    </span>

                    <h2>
                      {isWanted ? "بودجه و اطلاعات تماس" : "قیمت و اطلاعات تماس"}
                    </h2>

                    <p>
                      اطلاعاتی که کاربران
                      برای تصمیم‌گیری نیاز
                      دارند.
                    </p>
                  </div>
                </div>

                <div className="edit-parking-card__body">
                  <div className="edit-parking-grid">
                    {parking?.category !== "residential" && (
<div className="edit-parking-field" style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: form.priceType === "negotiable" ? "minmax(0, 1fr)" : "minmax(145px, 1fr) minmax(0, 2fr)", gap: "12px", alignItems: "end", direction: "rtl" }}>
                      <div className="edit-parking-field" style={{ margin: 0 }}>
                        <label htmlFor="priceType">{isWanted ? "دوره بودجه" : "نوع قیمت"} <span>*</span></label>
                        <div className="edit-parking-input">
                          <select id="priceType" name="priceType" value={form.priceType} onChange={handleChange} disabled={loading}
                            style={{ width: "100%", border: "none", outline: "none", background: "transparent", font: "inherit", color: "inherit" }}>
                            {(parking?.category === "villa" ? PRICE_TYPES.filter((item) => ["daily", "negotiable"].includes(item.value)) : PRICE_TYPES).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                          </select>
                        </div>
                      </div>
                      {form.priceType !== "negotiable" && (
                        <div className="edit-parking-field" style={{ margin: 0 }}>
                          <label htmlFor="price">{isWanted ? "سقف بودجه پیشنهادی" : "قیمت"} <span>*</span></label>
                          <div className={`edit-parking-input${errors.price ? " edit-parking-input--error" : ""}`}>
                            <span className="edit-parking-input__icon">﷼</span>
                            <input id="price" name="price" type="text" inputMode="numeric" value={form.price} onChange={handleChange} placeholder="مبلغ به ریال" autoComplete="off" disabled={loading} />
                            <span className="edit-parking-input__suffix">ریال</span>
                          </div>
                          {errors.price && <span className="edit-parking-error">{errors.price}</span>}
                        </div>
                      )}
                    </div>
              )}

                    <div className="edit-parking-field">
                      <label htmlFor="phone">
                        شماره تماس
                        <span>*</span>
                      </label>

                      <div
                        className={[
                          "edit-parking-input",
                          errors.phone
                            ? "edit-parking-input--error"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="edit-parking-input__icon">
                          ☎
                        </span>

                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          inputMode="numeric"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="09123456789"
                          maxLength={11}
                          dir="ltr"
                          disabled={loading}
                        />
                      </div>

                      {errors.phone && (
                        <span className="edit-parking-error">
                          {errors.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {!(isWanted && parking?.category === "storage") && (
                  <div className="edit-parking-field edit-parking-field--full">
                    <label htmlFor="description">
                      {isWanted ? "توضیحات درخواست" : "توضیحات آگهی"}
                      <span>*</span>
                    </label>

                    <div
                      className={[
                        "edit-parking-textarea",
                        errors.description
                          ? "edit-parking-input--error"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <textarea
                        id="description"
                        name="description"
                        value={
                          form.description
                        }
                        onChange={handleChange}
                        placeholder="درباره موقعیت، امنیت، دسترسی، مسقف بودن و سایر ویژگی‌های پارکینگ توضیح بده..."
                        rows={7}
                        maxLength={800}
                        disabled={loading}
                      />
                    </div>

                    <div className="edit-parking-field__meta">
                      {errors.description ? (
                        <span className="edit-parking-error">
                          {
                            errors.description
                          }
                        </span>
                      ) : (
                        <span>
                          جزئیاتی بنویس که
                          ابهام کاربر را کم
                          کند.
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
                  )}
                </div>
              </section>

              <label className="edit-parking-network-consent">
                <input
                  type="checkbox"
                  checked={form.agencyNetworkConsent}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      agencyNetworkConsent: event.target.checked,
                    }))
                  }
                  disabled={loading}
                />
                <span>
                  <strong>کمک مشاوران فضاجو برای پیدا کردن {isWanted ? "فایل مناسب" : "مشتری"}</strong>
                  <small>
                    {isWanted
                      ? "مایلم مشاوران تأییدشده فضاجو برای پیدا کردن فایل مناسب با من ارتباط بگیرند."
                      : "مایلم مشاوران تأییدشده فضاجو بتوانند برای این آگهی با من ارتباط بگیرند."}
                  </small>
                </span>
              </label>

              <div className="edit-parking-actions">
                <button
                  type="button"
                  className="edit-parking-button edit-parking-button--cancel"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  انصراف
                </button>

                <div>
                  <button
                    type="button"
                    className="edit-parking-button edit-parking-button--reset"
                    onClick={resetChanges}
                    disabled={
                      loading || !hasChanges
                    }
                  >
                    بازنشانی تغییرات
                  </button>

                  <button
                    type="submit"
                    className="edit-parking-button edit-parking-button--save"
                    disabled={
                      loading || !hasChanges
                    }
                  >
                    {loading ? (
                      <>
                        <span className="edit-parking-spinner" />
                        در حال ذخیره...
                      </>
                    ) : (
                      <>
                        ذخیره تغییرات
                        <span>✓</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            <aside className="edit-parking-sidebar">
              <section className="edit-parking-preview">
                <div className="edit-parking-preview__top">
                  <div>
                    <span>
                      پیش‌نمایش زنده
                    </span>

                    <strong>
                      {isWanted ? "کارت درخواست شما" : "کارت آگهی شما"}
                    </strong>
                  </div>

                  <span className="edit-parking-preview__live">
                    <i />
                    زنده
                  </span>
                </div>

                <div className="edit-parking-preview__image">
                  {isWanted ? (
                    <div className="edit-parking-preview__placeholder" role="img" aria-label="درخواست پارکینگ بدون نیاز به تصویر">
                      <span>🔎</span>
                      <p>{parkingUsageLabel(form.parkingRequestUsage, form.parkingOtherUsage)}</p>
                    </div>
                  ) : form.imageUrl ? (
                    <img
                      src={form.imageUrl}
                      alt={
                        form.title ||
                        "تصویر پارکینگ"
                      }
                    />
                  ) : (
                    <div className="edit-parking-preview__placeholder">
                      <span>▧</span>
                      <p>
                        تصویر آگهی اینجا
                        نمایش داده می‌شود
                      </p>
                    </div>
                  )}

                  <span className="edit-parking-preview__badge">
                    {isWanted ? "درخواست فعال" : "آماده انتشار"}
                  </span>
                </div>

                <div className="edit-parking-preview__content">
                  <div className="edit-parking-preview__location">
                    <span>⌖</span>

                    {form.city ||
                      (isWanted ? "شهر موردنظر" : "شهر پارکینگ")}
                  </div>

                  <h3>
                    {form.title ||
                      (isWanted ? "عنوان درخواست پارکینگ" : "عنوان آگهی پارکینگ")}
                  </h3>

                  <p>
                    {form.description ||
                      (isWanted ? "شرایط موردنیاز شما در این بخش نمایش داده می‌شود." : "توضیحات آگهی پس از وارد کردن در این بخش نمایش داده می‌شود.")}
                  </p>

                  <div className="edit-parking-preview__features">
                    <span>
                      <i>↔</i>

                      {form.area
                        ? `${form.area} متر`
                        : "متراژ نامشخص"}
                    </span>

                    <span>
                      <i>☎</i>

                      {form.phone ||
                        "شماره تماس"}
                    </span>
                  </div>

                  <div className="edit-parking-preview__price">
                    <span>
                      {isWanted ? "بودجه پیشنهادی" : "هزینه استفاده"}
                    </span>

                    <strong>
                      {form.priceType === "negotiable"
                        ? "توافقی"
                        : form.price
                          ? `${form.price} ریال - ${getPriceTypeLabel(form.priceType)}`
                          : (isWanted ? "بودجه ثبت نشده" : "قیمت ثبت نشده")}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="edit-parking-completion">
                <div className="edit-parking-completion__header">
                  <div>
                    <span>
                      {isWanted ? "کامل بودن درخواست" : "کامل بودن آگهی"}
                    </span>

                    <strong>
                      {completionPercentage}٪
                    </strong>
                  </div>

                  <span>
                    {completionPercentage ===
                    100
                      ? "عالی"
                      : "در حال تکمیل"}
                  </span>
                </div>

                <div className="edit-parking-completion__bar">
                  <span
                    style={{
                      width: `${completionPercentage}%`,
                    }}
                  />
                </div>

                <p>
                  {isWanted
                    ? "درخواست‌های دقیق‌تر، پیدا کردن پارکینگ مناسب را آسان‌تر می‌کنند. عکس و فیلم برای درخواست لازم نیست."
                    : "آگهی‌های کامل‌تر اعتماد و بازدید بیشتری دریافت می‌کنند."}
                </p>
              </section>

              <section className="edit-parking-tip">
                <span>✦</span>

                <div>
                  <strong>
                    قبل از ذخیره بررسی کن
                  </strong>

                  <p>
                    {isWanted
                      ? "شهر، محدوده روی نقشه، بودجه، شماره تماس و شرایط موردنیازت را دوباره بررسی کن."
                      : "قیمت، شماره تماس و تصویر آگهی را دوباره بررسی کن تا کاربران اطلاعات اشتباه نبینند."}
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

export default EditParking;