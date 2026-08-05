import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  isValidIranianPhoneNumber,
  normalizePhoneNumber,
  registerWithPhoneAndPassword,
} from "../services/authService";

import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    displayName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [acceptedRules, setAcceptedRules] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setError("");

    if (name === "phone") {
      setFormData((previousData) => ({
        ...previousData,
        phone: normalizePhoneNumber(value),
      }));

      return;
    }

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const {
      displayName,
      phone,
      password,
      confirmPassword,
    } = formData;

    if (displayName.trim().length < 2) {
      return "نام و نام خانوادگی را وارد کنید.";
    }

    if (!isValidIranianPhoneNumber(phone)) {
      return "شماره موبایل را به شکل 09123456789 وارد کنید.";
    }

    if (password.length < 6) {
      return "رمز عبور باید حداقل ۶ کاراکتر باشد.";
    }

    if (password !== confirmPassword) {
      return "رمز عبور و تکرار آن یکسان نیستند.";
    }

    if (!acceptedRules) {
      return "برای ثبت‌نام باید قوانین فضاجو را بپذیرید.";
    }

    return "";
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await registerWithPhoneAndPassword({
        displayName: formData.displayName,
        phone: formData.phone,
        password: formData.password,
      });

      navigate("/", {
        replace: true,
        state: {
          message: "حساب شما با موفقیت ساخته شد.",
        },
      });
    } catch (registerError) {
      console.error("Register error:", registerError);

      setError(
        registerError.message ||
          "ثبت‌نام انجام نشد. دوباره تلاش کنید."
      );
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (() => {
    const password = formData.password;

    if (!password) {
      return {
        level: 0,
        label: "",
      };
    }

    let score = 0;

    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Za-z]/.test(password) && /\d/.test(password)) {
      score += 1;
    }

    const labels = {
      1: "ضعیف",
      2: "متوسط",
      3: "مناسب",
    };

    return {
      level: score,
      label: labels[score] || "ضعیف",
    };
  })();

  return (
    <main className="register-page" dir="rtl">
      <div className="register-decoration register-decoration-one" />
      <div className="register-decoration register-decoration-two" />

      <section className="register-shell">
        <aside className="register-intro">
          <Link className="register-brand" to="/">
            <span className="register-brand-logo">ف</span>

            <span className="register-brand-text">
              <strong>فضاجو</strong>
              <small>جای پارک، بدون دردسر</small>
            </span>
          </Link>

          <div className="register-intro-content">
            <span className="register-intro-badge">
              عضویت در فضاجو
            </span>

            <h1>
              جای پارک مناسب را
              <span> ساده‌تر پیدا کنید.</span>
            </h1>

            <p>
              حساب خود را در چند لحظه بسازید و به پارکینگ‌های
              اطراف، رزروها و امکانات فضاجو دسترسی داشته باشید.
            </p>

            <div className="register-benefits">
              <div className="register-benefit">
                <span>✓</span>
                <p>دسترسی سریع به پارکینگ‌های اطراف</p>
              </div>

              <div className="register-benefit">
                <span>✓</span>
                <p>مدیریت ساده آگهی‌ها و رزروها</p>
              </div>

              <div className="register-benefit">
                <span>✓</span>
                <p>آماده برای ورود پیامکی در نسخه نهایی</p>
              </div>
            </div>
          </div>

          <p className="register-intro-footer">
            اطلاعات حساب شما با امنیت نگهداری می‌شود.
          </p>
        </aside>

        <section className="register-card">
          <header className="register-card-header">
            <span>ساخت حساب کاربری</span>

            <h2>ثبت‌نام در فضاجو</h2>

            <p>
              برای شروع، اطلاعات زیر را وارد کنید.
            </p>
          </header>

          {error && (
            <div
              className="register-alert register-alert-error"
              role="alert"
            >
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          <form
            className="register-form"
            onSubmit={handleRegister}
            noValidate
          >
            <div className="register-field">
              <label htmlFor="displayName">
                نام و نام خانوادگی
              </label>

              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                placeholder="مثلاً علی رضایی"
                value={formData.displayName}
                onChange={handleChange}
                disabled={loading}
                maxLength={60}
              />
            </div>

            <div className="register-field">
              <label htmlFor="phone">
                شماره موبایل
              </label>

              <div className="register-phone-input">
                <span>+98</span>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="09123456789"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                  maxLength={11}
                />
              </div>

              <small>
                شماره موبایل بعداً برای ورود پیامکی استفاده خواهد
                شد.
              </small>
            </div>

            <div className="register-field">
              <label htmlFor="password">
                رمز عبور
              </label>

              <div className="register-password-input">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="حداقل ۶ کاراکتر"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  minLength={6}
                  maxLength={128}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previousValue) => !previousValue)
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "مخفی کردن رمز عبور"
                      : "نمایش رمز عبور"
                  }
                >
                  {showPassword ? "مخفی" : "نمایش"}
                </button>
              </div>

              {formData.password && (
                <div className="register-password-strength">
                  <div className="register-strength-bars">
                    {[1, 2, 3].map((level) => (
                      <span
                        key={level}
                        className={
                          passwordStrength.level >= level
                            ? "active"
                            : ""
                        }
                      />
                    ))}
                  </div>

                  <small>
                    قدرت رمز: {passwordStrength.label}
                  </small>
                </div>
              )}
            </div>

            <div className="register-field">
              <label htmlFor="confirmPassword">
                تکرار رمز عبور
              </label>

              <div className="register-password-input">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  autoComplete="new-password"
                  placeholder="رمز عبور را دوباره وارد کنید"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  minLength={6}
                  maxLength={128}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previousValue) => !previousValue
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showConfirmPassword
                      ? "مخفی کردن تکرار رمز"
                      : "نمایش تکرار رمز"
                  }
                >
                  {showConfirmPassword ? "مخفی" : "نمایش"}
                </button>
              </div>
            </div>

            <label className="register-rules">
              <input
                type="checkbox"
                checked={acceptedRules}
                onChange={(event) => {
                  setAcceptedRules(event.target.checked);
                  setError("");
                }}
                disabled={loading}
              />

              <span>
                قوانین استفاده و حریم خصوصی فضاجو را می‌پذیرم.
              </span>
            </label>

            <button
              className="register-submit-button"
              type="submit"
              disabled={
                loading ||
                !isValidIranianPhoneNumber(formData.phone) ||
                formData.password.length < 6 ||
                !acceptedRules
              }
            >
              {loading ? (
                <>
                  <span className="register-spinner" />
                  در حال ساخت حساب...
                </>
              ) : (
                <>
                  ساخت حساب کاربری
                  <span aria-hidden="true">←</span>
                </>
              )}
            </button>
          </form>

          <div className="register-login-link">
            <span>قبلاً ثبت‌نام کرده‌اید؟</span>
            <Link to="/login">وارد شوید</Link>
          </div>
        </section>
      </section>
    </main>
  );
}

export default Register;