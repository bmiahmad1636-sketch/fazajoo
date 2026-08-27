import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  Navigate,
} from "react-router-dom";

import "./AgencyAccess.css";
import {
  getAuthToken,
  initializeAuthSession,
} from "../services/authService";


const DOCUMENT_SERVER_URL =
  "http://127.0.0.1:6060";

const API_SERVER_URL =
  "http://127.0.0.1:6060";


const INITIAL_FORM = {
  agencyName: "",
  agentName: "",
  city: "",
  address: "",
  phone: "",
  nationalId: "",
  licenseNumber: "",
};


const INITIAL_DOCUMENTS = {
  national_card_front: null,
  national_card_back: null,
  business_license: null,
};


const INITIAL_UPLOAD_STATUS = {
  national_card_front: "idle",
  national_card_back: "idle",
  business_license: "idle",
};


const DOCUMENT_CONFIG = {
  national_card_front: {
    title: "روی کارت ملی",
    description: "تصویر واضح و خوانا",
    icon: "🪪",
  },

  national_card_back: {
    title: "پشت کارت ملی",
    description: "تصویر واضح و خوانا",
    icon: "🪪",
  },

  business_license: {
    title: "جواز یا پروانه کسب",
    description: "مدرک معتبر فعالیت دفتر",
    icon: "📄",
  },
};


function normalizeDigits(
  value = ""
) {
  const persianDigits =
    "۰۱۲۳۴۵۶۷۸۹";

  const arabicDigits =
    "٠١٢٣٤٥٦٧٨٩";

  return String(value)
    .replace(
      /[۰-۹]/g,
      (digit) =>
        persianDigits.indexOf(
          digit
        )
    )
    .replace(
      /[٠-٩]/g,
      (digit) =>
        arabicDigits.indexOf(
          digit
        )
    );
}


function validateIranianNationalId(
  value = ""
) {
  const nationalId =
    normalizeDigits(value)
      .replace(/\D/g, "");

  if (
    !/^\d{10}$/.test(
      nationalId
    )
  ) {
    return false;
  }

  if (
    /^(\d)\1{9}$/.test(
      nationalId
    )
  ) {
    return false;
  }

  const check =
    Number(
      nationalId[9]
    );

  let sum = 0;

  for (
    let index = 0;
    index < 9;
    index += 1
  ) {
    sum +=
      Number(
        nationalId[index]
      ) *
      (10 - index);
  }

  const remainder =
    sum % 11;

  const expected =
    remainder < 2
      ? remainder
      : 11 - remainder;

  return (
    check === expected
  );
}


function AgencyAccess({
  currentUser = null,
  userProfile = null,
  profileLoading = false,
}) {
  const [form, setForm] =
    useState(
      INITIAL_FORM
    );

  const [
    documents,
    setDocuments,
  ] =
    useState(
      INITIAL_DOCUMENTS
    );

  const [
    uploadStatus,
    setUploadStatus,
  ] =
    useState(
      INITIAL_UPLOAD_STATUS
    );

  const [
    uploadedDocuments,
    setUploadedDocuments,
  ] =
    useState({});

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] =
    useState("");

  const [
    liveAgencyStatus,
    setLiveAgencyStatus,
  ] = useState("");

  const [
    statusLoading,
    setStatusLoading,
  ] = useState(true);


  useEffect(() => {
    let active = true;

    const loadAgencyStatus = async () => {
      const token = getAuthToken();

      if (!token) {
        if (active) setStatusLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_SERVER_URL}/api/agency/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data?.ok) {
          throw new Error(
            data?.message || "دریافت وضعیت درخواست مشاور انجام نشد."
          );
        }

        if (active) {
          const nextStatus = data.agencyStatus || "none";
          setLiveAgencyStatus(nextStatus);

          if (nextStatus !== (userProfile?.agencyStatus || "none")) {
            await initializeAuthSession().catch(() => {});
          }
        }
      } catch (error) {
        console.error("Agency status load error:", error);

        if (active) {
          setLiveAgencyStatus(userProfile?.agencyStatus || "none");
        }
      } finally {
        if (active) setStatusLoading(false);
      }
    };

    loadAgencyStatus();

    return () => {
      active = false;
    };
  }, [userProfile?.agencyStatus]);

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    setForm({
      agencyName:
        userProfile
          .agencyName ||
        "",

      agentName:
        userProfile
          .agentName ||
        "",

      city:
        userProfile
          .agencyCity ||
        "",

      address:
        userProfile
          .agencyAddress ||
        "",

      phone:
        userProfile
          .phone ||
        "",

      nationalId:
        "",

      licenseNumber:
        userProfile
          .agencyLicenseNumber ||
        "",
    });
  }, [userProfile]);


  const effectiveAgencyStatus =
    liveAgencyStatus ||
    userProfile?.agencyStatus ||
    "none";


  const isApprovedAgent =
    effectiveAgencyStatus ===
    "approved";


  const isPending =
    effectiveAgencyStatus ===
    "pending";


  const needsRevision =
    effectiveAgencyStatus ===
    "needs_revision";


  const isRejected =
    effectiveAgencyStatus ===
    "rejected";


  const allDocumentsSelected =
    Boolean(
      documents
        .national_card_front &&
      documents
        .national_card_back &&
      documents
        .business_license
    );


  if (profileLoading || statusLoading) {
    return (
      <main className="agency-access">

        <div className="agency-access__loading">
          در حال بررسی حساب...
        </div>

      </main>
    );
  }


  if (!userProfile) {
    return (
      <main className="agency-access">

        <div className="agency-access__loading">
          اطلاعات حساب در حال دریافت است...
        </div>

      </main>
    );
  }


  if (isApprovedAgent) {
    return (
      <Navigate
        to="/agency"
        replace
      />
    );
  }


  const clearMessage =
    () => {
      setMessage("");
      setMessageType("");
    };


  const handleChange =
    (event) => {
      const {
        name,
        value,
      } =
        event.target;

      let nextValue =
        value;

      if (
        name === "phone" ||
        name === "nationalId"
      ) {
        nextValue =
          normalizeDigits(
            value
          ).replace(
            /\D/g,
            ""
          );
      }

      setForm(
        (current) => ({
          ...current,

          [name]:
            nextValue,
        })
      );

      clearMessage();
    };


  const handleDocumentChange =
    (
      documentType,
      event
    ) => {
      const file =
        event
          .target
          .files?.[0];

      if (!file) {
        return;
      }


      const allowedTypes =
        [
          "image/jpeg",
          "image/png",
          "image/webp",
        ];


      if (
        !allowedTypes.includes(
          file.type
        )
      ) {
        setMessage(
          "مدارک باید با فرمت JPG، PNG یا WEBP باشند."
        );

        setMessageType(
          "error"
        );

        event.target.value =
          "";

        return;
      }


      const maxFileSize =
        6 *
        1024 *
        1024;


      if (
        file.size >
        maxFileSize
      ) {
        setMessage(
          "حجم هر مدرک باید کمتر از ۶ مگابایت باشد."
        );

        setMessageType(
          "error"
        );

        event.target.value =
          "";

        return;
      }


      setDocuments(
        (current) => ({
          ...current,

          [documentType]:
            file,
        })
      );


      setUploadStatus(
        (current) => ({
          ...current,

          [documentType]:
            "selected",
        })
      );


      setUploadedDocuments(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            documentType
          ];

          return next;
        }
      );


      clearMessage();
    };


  const validateForm =
    () => {
      const phone =
        normalizeDigits(
          form.phone
        ).replace(
          /\D/g,
          ""
        );

      const nationalId =
        normalizeDigits(
          form.nationalId
        ).replace(
          /\D/g,
          ""
        );


      if (
        !form
          .agencyName
          .trim()
      ) {
        return "نام دفتر یا آژانس املاک را وارد کنید.";
      }


      if (
        !form
          .agentName
          .trim()
      ) {
        return "نام و نام خانوادگی مسئول دفتر را وارد کنید.";
      }


      if (
        !form
          .city
          .trim()
      ) {
        return "شهر فعالیت را وارد کنید.";
      }


      if (
        !form
          .address
          .trim()
      ) {
        return "آدرس دفتر املاک را وارد کنید.";
      }


      if (
        form
          .address
          .trim()
          .length < 10
      ) {
        return "آدرس دفتر را کامل‌تر وارد کنید.";
      }


      if (
        !/^09\d{9}$/.test(
          phone
        )
      ) {
        return "شماره موبایل را به‌صورت صحیح وارد کنید.";
      }


      if (!nationalId) {
        return "کد ملی مسئول دفتر را وارد کنید.";
      }


      if (
        !validateIranianNationalId(
          nationalId
        )
      ) {
        return "کد ملی واردشده معتبر نیست.";
      }


      if (
        !form
          .licenseNumber
          .trim()
      ) {
        return "شماره جواز یا پروانه کسب را وارد کنید.";
      }


      if (
        form
          .licenseNumber
          .trim()
          .length < 3
      ) {
        return "شماره جواز یا پروانه کسب را صحیح وارد کنید.";
      }


      if (
        !documents
          .national_card_front
      ) {
        return "تصویر روی کارت ملی را انتخاب کنید.";
      }


      if (
        !documents
          .national_card_back
      ) {
        return "تصویر پشت کارت ملی را انتخاب کنید.";
      }


      if (
        !documents
          .business_license
      ) {
        return "تصویر جواز یا پروانه کسب را انتخاب کنید.";
      }


      return "";
    };


  const uploadSingleDocument =
    async (
      documentType,
      file
    ) => {
      setUploadStatus(
        (current) => ({
          ...current,
          [documentType]:
            "uploading",
        })
      );

      try {
        const token =
          getAuthToken();

        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        formData.append(
          "documentType",
          documentType
        );

        const response =
          await fetch(
            `${API_SERVER_URL}/api/uploads/agency-document`,
            {
              method:
                "POST",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              body:
                formData,
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data?.ok
        ) {
          throw new Error(
            data?.message ||
              "آپلود مدرک انجام نشد."
          );
        }

        const safeRecord =
          data.document;

        setUploadedDocuments(
          (current) => ({
            ...current,
            [documentType]:
              safeRecord,
          })
        );

        setUploadStatus(
          (current) => ({
            ...current,
            [documentType]:
              "uploaded",
          })
        );

        return safeRecord;

      } catch (error) {
        console.error(
          `Upload ${documentType} error:`,
          error
        );

        setUploadStatus(
          (current) => ({
            ...current,
            [documentType]:
              "error",
          })
        );

        throw error;
      }
    };

  const uploadAllDocuments =
    async () => {
      const results =
        {};


      for (
        const documentType of
        Object.keys(
          DOCUMENT_CONFIG
        )
      ) {
        const file =
          documents[
            documentType
          ];


        if (!file) {
          throw new Error(
            "مدارک انتخاب‌شده کامل نیستند."
          );
        }


        results[
          documentType
        ] =
          await uploadSingleDocument(
            documentType,
            file
          );
      }


      return results;
    };


  const handleSubmit =
    async (event) => {
      event.preventDefault();


      if (
        !getAuthToken()
      ) {
        setMessage(
          "ابتدا وارد حساب کاربری شوید."
        );

        setMessageType(
          "error"
        );

        return;
      }


      const validationMessage =
        validateForm();


      if (
        validationMessage
      ) {
        setMessage(
          validationMessage
        );

        setMessageType(
          "error"
        );

        return;
      }


      setSaving(true);

      setMessage(
        "در حال ارسال امن مدارک..."
      );

      setMessageType("");


      try {
        const uploaded =
          await uploadAllDocuments();


        const phone =
          normalizeDigits(
            form.phone
          )
            .replace(
              /\D/g,
              ""
            )
            .trim();


        const nationalId =
          normalizeDigits(
            form.nationalId
          )
            .replace(
              /\D/g,
              ""
            )
            .trim();


        const token =
          getAuthToken();

        const response =
          await fetch(
            `${API_SERVER_URL}/api/agency/request`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                agencyName: form.agencyName.trim(),
                agentName: form.agentName.trim(),
                city: form.city.trim(),
                address: form.address.trim(),
                phone,
                nationalId,
                licenseNumber: form.licenseNumber.trim(),
                documents: uploaded,
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(
            result?.message ||
              "ثبت درخواست انجام نشد."
          );
        }

        setMessage(
          "درخواست احراز و مدارک با موفقیت ثبت شد. درخواست شما اکنون در انتظار بررسی مدیریت فضاجو است."
        );

        setMessageType(
          "success"
        );

        setLiveAgencyStatus(
          "pending"
        );

        await initializeAuthSession().catch(() => {});

      } catch (error) {
        console.error(
          "Agency verification request error:",
          error
        );


        setMessage(
          error?.message ||
            "ثبت درخواست یا آپلود مدارک انجام نشد. دوباره تلاش کنید."
        );

        setMessageType(
          "error"
        );

      } finally {
        setSaving(false);
      }
    };


  const getDocumentStatusText =
    (
      documentType
    ) => {
      const status =
        uploadStatus[
          documentType
        ];


      if (
        status ===
        "uploading"
      ) {
        return "در حال ارسال...";
      }


      if (
        status ===
        "uploaded"
      ) {
        return "✓ ارسال شد";
      }


      if (
        status ===
        "error"
      ) {
        return "خطا در ارسال";
      }


      if (
        documents[
          documentType
        ]
      ) {
        return "✓ انتخاب شد";
      }


      return "انتخاب تصویر";
    };


  const getDocumentFileName =
    (
      documentType
    ) => {
      const file =
        documents[
          documentType
        ];

      if (!file) {
        return "";
      }

      if (
        file.name.length <=
        28
      ) {
        return file.name;
      }

      return `${file.name.slice(
        0,
        24
      )}...`;
    };


  return (
    <main className="agency-access">


      <section className="agency-access__hero">

        <div className="agency-access__container">

          <span className="agency-access__eyebrow">
            ویژه فعالان حرفه‌ای املاک
          </span>


          <h1>
            فضاجو را به ابزار کاری

            <span>
              {" "}
              دفتر املاک خود
            </span>

            تبدیل کنید
          </h1>


          <p>
            حساب حرفه‌ای مشاور پس از بررسی
            مشخصات، هویت و مدارک فعالیت
            صنفی فعال می‌شود تا شبکه مشاوران
            فضاجو قابل اعتماد باقی بماند.
          </p>

        </div>

      </section>


      <section className="agency-access__content">

        <div className="agency-access__container agency-access__grid">


          <div className="agency-access__info">

            <span className="agency-access__info-icon">
              🏢
            </span>


            <h2>
              پنل حرفه‌ای مشاور
            </h2>


            <p>
              موتور تطبیق فایل و متقاضی،
              فرصت‌های شبکه فضاجو، مدیریت
              فایل‌ها و ابزارهای حرفه‌ای در
              اختیار مشاوران تأییدشده قرار
              می‌گیرد.
            </p>


            <div className="agency-access__benefits">

              <span>
                ✓ احراز هویت مسئول دفتر
              </span>

              <span>
                ✓ بررسی جواز یا پروانه فعالیت
              </span>

              <span>
                ✓ دسترسی فقط برای مشاور تأییدشده
              </span>

              <span>
                ✓ نشان «مشاور تأییدشده فضاجو»
              </span>

              <span>
                ✓ موتور تطبیق حرفه‌ای فایل و متقاضی
              </span>

            </div>


            <div className="agency-access__security-note">

              <span>
                🔒
              </span>


              <div>

                <strong>
                  حفاظت از مدارک هویتی
                </strong>


                <p>
                  مدارک با دسترسی محافظت‌شده
                  نگهداری می‌شوند و لینک عمومی
                  برای آنها در فضاجو ذخیره
                  نمی‌شود. مشاهده و دانلود
                  مدیریتی آنها از مسیر امن
                  انجام خواهد شد.
                </p>

              </div>

            </div>

          </div>


          <div className="agency-access__form-card">


            {isPending ? (

              <div className="agency-access__pending">


                <span>
                  ⏳
                </span>


                <h2>
                  درخواست شما در انتظار بررسی است
                </h2>


                <p>
                  مشخصات و مدارک شما ثبت شده‌اند.
                  مدیریت فضاجو پس از بررسی هویت
                  و مدارک فعالیت، نتیجه را روی
                  همین حساب اعمال خواهد کرد.
                </p>


                <div className="agency-access__pending-status">

                  <span>
                    ✓ اطلاعات اولیه ثبت شده
                  </span>

                  <span>
                    ✓ مدارک هویتی و صنفی ثبت شده
                  </span>

                  <span>
                    ◌ بررسی مدیریت فضاجو
                  </span>

                </div>


                <Link to="/">
                  بازگشت به فضاجو
                </Link>

              </div>


            ) : (

              <>


                <div className="agency-access__form-heading">

                  <span>
                    درخواست فعال‌سازی
                  </span>


                  <h2>
                    احراز مشاور یا دفتر املاک
                  </h2>


                  <p>
                    اطلاعات و مدارک را مطابق
                    مشخصات واقعی مسئول دفتر و
                    محل فعالیت وارد کنید.
                  </p>

                </div>


                {needsRevision && (

                  <div className="agency-access__status-box agency-access__status-box--warning">

                    <strong>
                      مدارک نیاز به اصلاح دارند
                    </strong>


                    <p>
                      اطلاعات یا مدارک موردنیاز
                      را اصلاح و درخواست را
                      دوباره ارسال کنید.
                    </p>

                  </div>

                )}


                {isRejected && (

                  <div className="agency-access__status-box agency-access__status-box--error">

                    <strong>
                      درخواست قبلی تأیید نشد
                    </strong>


                    <p>
                      می‌توانید اطلاعات و مدارک
                      صحیح را وارد و درخواست
                      جدید ثبت کنید.
                    </p>

                  </div>

                )}


                <form
                  onSubmit={
                    handleSubmit
                  }
                >


                  <div className="agency-access__section-title">

                    <span>
                      ۱
                    </span>


                    <div>

                      <strong>
                        مشخصات دفتر و مشاور
                      </strong>


                      <small>
                        اطلاعات محل فعالیت
                      </small>

                    </div>

                  </div>


                  <label>

                    نام دفتر / آژانس

                    <span className="agency-access__required">
                      *
                    </span>


                    <input
                      name="agencyName"

                      value={
                        form.agencyName
                      }

                      onChange={
                        handleChange
                      }

                      placeholder="مثلاً املاک سپهر"

                      disabled={
                        saving
                      }

                      maxLength={
                        80
                      }
                    />

                  </label>


                  <label>

                    نام و نام خانوادگی مسئول

                    <span className="agency-access__required">
                      *
                    </span>


                    <input
                      name="agentName"

                      value={
                        form.agentName
                      }

                      onChange={
                        handleChange
                      }

                      placeholder="نام و نام خانوادگی"

                      disabled={
                        saving
                      }

                      maxLength={
                        80
                      }
                    />

                  </label>


                  <label>

                    شهر فعالیت

                    <span className="agency-access__required">
                      *
                    </span>


                    <input
                      name="city"

                      value={
                        form.city
                      }

                      onChange={
                        handleChange
                      }

                      placeholder="مثلاً شهرضا"

                      disabled={
                        saving
                      }

                      maxLength={
                        50
                      }
                    />

                  </label>


                  <label>

                    شماره موبایل

                    <span className="agency-access__required">
                      *
                    </span>


                    <input
                      name="phone"

                      value={
                        form.phone
                      }

                      onChange={
                        handleChange
                      }

                      placeholder="09123456789"

                      inputMode="numeric"

                      dir="ltr"

                      maxLength={
                        11
                      }

                      disabled={
                        saving
                      }
                    />

                  </label>


                  <label className="agency-access__full-field">

                    آدرس کامل دفتر

                    <span className="agency-access__required">
                      *
                    </span>


                    <textarea
                      name="address"

                      value={
                        form.address
                      }

                      onChange={
                        handleChange
                      }

                      placeholder="استان، شهر، خیابان، کوچه، پلاک و سایر مشخصات محل دفتر"

                      rows={
                        3
                      }

                      disabled={
                        saving
                      }

                      maxLength={
                        250
                      }
                    />

                  </label>


                  <div className="agency-access__section-title">

                    <span>
                      ۲
                    </span>


                    <div>

                      <strong>
                        اطلاعات احراز هویت
                      </strong>


                      <small>
                        مخصوص بررسی مدیریت فضاجو
                      </small>

                    </div>

                  </div>


                  <label>

                    کد ملی مسئول دفتر

                    <span className="agency-access__required">
                      *
                    </span>


                    <input
                      name="nationalId"

                      value={
                        form.nationalId
                      }

                      onChange={
                        handleChange
                      }

                      placeholder="10 رقمی"

                      inputMode="numeric"

                      dir="ltr"

                      maxLength={
                        10
                      }

                      disabled={
                        saving
                      }
                    />


                    <small className="agency-access__field-note">

                      کد ملی باید متعلق به
                      مسئول معرفی‌شده دفتر باشد.

                    </small>

                  </label>


                  <label>

                    شماره جواز / پروانه کسب

                    <span className="agency-access__required">
                      *
                    </span>


                    <input
                      name="licenseNumber"

                      value={
                        form
                          .licenseNumber
                      }

                      onChange={
                        handleChange
                      }

                      placeholder="شماره جواز یا پروانه"

                      dir="ltr"

                      disabled={
                        saving
                      }

                      maxLength={
                        60
                      }
                    />

                  </label>


                  <div className="agency-access__section-title">

                    <span>
                      ۳
                    </span>


                    <div>

                      <strong>
                        مدارک موردنیاز
                      </strong>


                      <small>
                        تصاویر واضح و خوانا انتخاب کنید
                      </small>

                    </div>

                  </div>


                  <div className="agency-access__documents">


                    {Object.entries(
                      DOCUMENT_CONFIG
                    ).map(
                      ([
                        documentType,
                        config,
                      ]) => (

                        <label
                          key={
                            documentType
                          }

                          className="agency-access__document-card"

                          style={{
                            cursor:
                              saving
                                ? "wait"
                                : "pointer",
                          }}
                        >


                          <span className="agency-access__document-icon">

                            {
                              config.icon
                            }

                          </span>


                          <div>

                            <strong>
                              {
                                config.title
                              }
                            </strong>


                            <small>
                              {
                                config.description
                              }
                            </small>

                          </div>


                          {getDocumentFileName(
                            documentType
                          ) && (

                            <small
                              style={{
                                maxWidth:
                                  "100%",

                                overflow:
                                  "hidden",

                                textOverflow:
                                  "ellipsis",

                                whiteSpace:
                                  "nowrap",

                                color:
                                  "#6f625a",
                              }}
                            >

                              {getDocumentFileName(
                                documentType
                              )}

                            </small>

                          )}


                          <span className="agency-access__document-status">

                            {getDocumentStatusText(
                              documentType
                            )}

                          </span>


                          <input
                            type="file"

                            accept="image/jpeg,image/png,image/webp"

                            disabled={
                              saving
                            }

                            onChange={(
                              event
                            ) =>
                              handleDocumentChange(
                                documentType,
                                event
                              )
                            }

                            style={{
                              display:
                                "none",
                            }}
                          />

                        </label>

                      )
                    )}


                  </div>


                  <div className="agency-access__privacy">

                    <span>
                      🔐
                    </span>


                    <p>
                      مدارک هویتی در بخش عمومی
                      فضاجو نمایش داده نمی‌شوند.
                      اصل فایل‌ها با دسترسی
                      محافظت‌شده نگهداری می‌شوند
                      و مشاهده یا دانلود مدیریتی
                      آنها از مسیر امن انجام
                      خواهد شد.
                    </p>

                  </div>


                  {allDocumentsSelected && (

                    <div className="agency-access__message agency-access__message--success">

                      ✓ هر سه مدرک انتخاب شده‌اند
                      و پس از ثبت درخواست، به‌صورت
                      امن ارسال خواهند شد.

                    </div>

                  )}


                  {message && (

                    <div
                      className={[
                        "agency-access__message",

                        messageType
                          ? `agency-access__message--${messageType}`
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " "
                        )}
                    >

                      {message}

                    </div>

                  )}


                  <button
                    type="submit"

                    disabled={
                      saving
                    }
                  >

                    {saving
                      ? "در حال ارسال امن اطلاعات و مدارک..."
                      : "ثبت درخواست احراز و ارسال مدارک"}

                  </button>


                </form>

              </>

            )}

          </div>

        </div>

      </section>

    </main>
  );
}


export default AgencyAccess;