import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  isValidIranianPhoneNumber,
  loginWithPhoneAndPassword,
  normalizePhoneNumber,
} from "../services/authService";

import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");

    if (!isValidIranianPhoneNumber(phone)) {
      setError("شماره موبایل را به شکل 09123456789 وارد کنید.");
      return;
    }

    if (!password) {
      setError("رمز عبور را وارد کنید.");
      return;
    }

    setLoading(true);

    try {
      await loginWithPhoneAndPassword({
        phone,
        password,
      });

      navigate("/", {
        replace: true,
        state: {
          message: "با موفقیت وارد حساب شدید.",
        },
      });
    } catch (loginError) {
      console.error("Login error:", loginError);

      setError(
        loginError.message ||
          "ورود انجام نشد. شماره موبایل و رمز عبور را بررسی کنید."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page" dir="rtl">
      <div className="login-background login-background-one" />
      <div className="login-background login-background-two" />

      <section className="login-shell">
        <aside className="login-intro">
          <Link className="login-brand" to="/">
            <span className="login-brand-icon">ف</span>

            <span className="login-brand-text">
              <strong>فضاجو</strong>
              <small>جای پارک، بدون دردسر</small>
            </span>
          </Link>

          <div className="login-intro-content">
            <span className="login-badge">
              ورود به حساب کاربری
            </span>

            <h1>
              دوباره خوش آمدید
              <span> به فضاجو.</span>
            </h1>

            <p>
              با شماره موبایل و رمز عبور وارد حساب خود شوید و
              پارکینگ‌ها و آگهی‌های خود را مدیریت کنید.
            </p>

            <div className="login-features">
              <div className="login-feature">
                <span>✓</span>
                <p>ورود سریع با شماره موبایل</p>
              </div>

              <div className="login-feature">
                <span>✓</span>
                <p>مدیریت آگهی‌ها و اطلاعات حساب</p>
              </div>

              <div className="login-feature">
                <span>✓</span>
                <p>آماده برای ورود پیامکی در نسخه نهایی</p>
              </div>
            </div>
          </div>

          <p className="login-intro-footer">
            اطلاعات حساب شما با امنیت نگهداری می‌شود.
          </p>
        </aside>

        <section className="login-card">
          <header className="login-card-header">
            <span>ورود کاربران</span>

            <h2>ورود به فضاجو</h2>

            <p>
              شماره موبایل و رمز عبور حساب خود را وارد کنید.
            </p>
          </header>

          {error && (
            <div
              className="login-message login-message-error"
              role="alert"
            >
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          <form
            className="login-form"
            onSubmit={handleLogin}
            noValidate
          >
            <div className="login-field">
              <label htmlFor="phone">شماره موبایل</label>

              <div className="login-phone-field">
                <span className="login-country-code">+98</span>

                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(event) => {
                    setPhone(
                      normalizePhoneNumber(event.target.value)
                    );
                    setError("");
                  }}
                  maxLength={11}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <small>شماره موبایل باید با 09 شروع شود.</small>
            </div>

            <div className="login-field">
              <label htmlFor="password">رمز عبور</label>

              <div className="login-password-field">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="رمز عبور خود را وارد کنید"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  disabled={loading}
                  maxLength={128}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (previousValue) => !previousValue
                    )
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
            </div>

            <button
              className="login-primary-button"
              type="submit"
              disabled={
                loading ||
                !isValidIranianPhoneNumber(phone) ||
                !password
              }
            >
              {loading ? (
                <>
                  <span className="login-spinner" />
                  در حال ورود...
                </>
              ) : (
                <>
                  ورود به حساب
                  <span aria-hidden="true">←</span>
                </>
              )}
            </button>
          </form>

          <div className="login-register-link">
            <span>هنوز حساب ندارید؟</span>
            <Link to="/register">ثبت‌نام کنید</Link>
          </div>

          <p className="login-terms">
            با ورود به فضاجو، قوانین استفاده و حریم خصوصی را
            می‌پذیرید.
          </p>
        </section>
      </section>
    </main>
  );
}

export default Login;