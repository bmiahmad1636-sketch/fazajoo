import { useEffect, useMemo, useState } from "react";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { Link, Navigate } from "react-router-dom";

import { db } from "../firebase";

import "./AgencyAccess.css";

function AgencyAccess({
  currentUser = null,
  userProfile = null,
  profileLoading = false,
}) {
  const [form, setForm] = useState({
    agencyName: "",
    agentName: "",
    city: "",
    phone: "",
  });

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    setForm({
      agencyName:
        userProfile?.agencyName || "",
      agentName:
        userProfile?.agentName || "",
      city:
        userProfile?.agencyCity || "",
      phone:
        userProfile?.phone || "",
    });
  }, [userProfile]);

  const isApprovedAgent =
    useMemo(
      () =>
        userProfile?.accountType ===
          "agent" &&
        userProfile?.agencyStatus ===
          "approved",
      [userProfile]
    );

  const isPending =
    userProfile?.agencyStatus ===
    "pending";

  if (profileLoading) {
    return (
      <main className="agency-access">
        <div className="agency-access__loading">
          در حال بررسی حساب...
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

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (!currentUser?.uid) {
        return;
      }

      if (
        !form.agencyName.trim() ||
        !form.agentName.trim() ||
        !form.city.trim() ||
        !/^09\d{9}$/.test(
          form.phone
            .replace(/\s/g, "")
            .trim()
        )
      ) {
        setMessage(
          "لطفاً اطلاعات را کامل و شماره موبایل را صحیح وارد کنید."
        );

        return;
      }

      setSaving(true);
      setMessage("");

      try {
        await setDoc(
          doc(
            db,
            "users",
            currentUser.uid
          ),
          {
            accountType:
              userProfile?.accountType ||
              "user",

            agencyStatus:
              "pending",

            agencyName:
              form.agencyName.trim(),

            agentName:
              form.agentName.trim(),

            agencyCity:
              form.city.trim(),

            phone:
              form.phone
                .replace(/\s/g, "")
                .trim(),

            agencyRequestedAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        setMessage(
          "درخواست فعال‌سازی پنل مشاور ثبت شد. پس از تأیید، همین حساب کاربری مستقیماً به پنل حرفه‌ای دسترسی خواهد داشت."
        );
      } catch (error) {
        console.error(
          "Agency request error:",
          error
        );

        setMessage(
          "ثبت درخواست انجام نشد. دوباره تلاش کنید."
        );
      } finally {
        setSaving(false);
      }
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
            حساب عادی و حساب مشاور جدا نیستند؛
            همان حساب فعلی شما پس از تأیید،
            امکانات حرفه‌ای مشاور را هم دریافت
            می‌کند.
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
              فایل‌ها و ابزارهای حرفه‌ای اینجا
              در اختیار مشاوران تأییدشده قرار
              می‌گیرد.
            </p>

            <div className="agency-access__benefits">
              <span>
                ✓ یک حساب کاربری؛ بدون ورود دوباره
              </span>

              <span>
                ✓ دسترسی فقط برای مشاور تأییدشده
              </span>

              <span>
                ✓ موتور تطبیق حرفه‌ای فایل و متقاضی
              </span>
            </div>
          </div>

          <div className="agency-access__form-card">
            {isPending ? (
              <div className="agency-access__pending">
                <span>⏳</span>

                <h2>
                  درخواست شما در انتظار بررسی است
                </h2>

                <p>
                  بعد از تأیید، دکمه «ویژه
                  مشاورین املاک» در هدر به
                  «پنل حرفه‌ای مشاور» تبدیل
                  می‌شود.
                </p>

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
                    مشخصات مشاور یا دفتر
                  </h2>

                  <p>
                    این مرحله فقط برای تشخیص و
                    تأیید حساب حرفه‌ای است.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit}
                >
                  <label>
                    نام دفتر / آژانس
                    <input
                      name="agencyName"
                      value={form.agencyName}
                      onChange={handleChange}
                      placeholder="مثلاً املاک سپهر"
                    />
                  </label>

                  <label>
                    نام مشاور
                    <input
                      name="agentName"
                      value={form.agentName}
                      onChange={handleChange}
                      placeholder="نام و نام خانوادگی"
                    />
                  </label>

                  <label>
                    شهر فعالیت
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="مثلاً شهرضا"
                    />
                  </label>

                  <label>
                    شماره موبایل
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="09123456789"
                      inputMode="numeric"
                      dir="ltr"
                      maxLength={11}
                    />
                  </label>

                  {message && (
                    <div className="agency-access__message">
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? "در حال ثبت..."
                      : "ثبت درخواست فعال‌سازی"}
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