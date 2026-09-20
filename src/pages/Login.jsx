import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  convertDigitsToEnglish,
  isValidIranianPhoneNumber,
  loginWithPhoneAndPassword,
  normalizePhoneNumber,
  requestOtpCode,
  verifyOtpCode,
  requestPasswordResetCode,
  confirmPasswordReset,
} from "../services/authService";

import "./Login.css";


function Login() {
  const navigate = useNavigate();
  const codeInputRef = useRef(null);

  const [mode, setMode] =
    useState("otp");

  const [step, setStep] =
    useState("phone");

  const [phone, setPhone] =
    useState("");

  const [code, setCode] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmNewPassword, setConfirmNewPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    resendSeconds,
    setResendSeconds,
  ] = useState(0);


  useEffect(() => {
    if (
      (mode === "otp" || mode === "reset") &&
      step === "code"
    ) {
      const focusTimer =
        window.setTimeout(() => {
          codeInputRef.current?.focus();
        }, 100);

      return () =>
        window.clearTimeout(
          focusTimer
        );
    }

    return undefined;
  }, [mode, step]);


  useEffect(() => {
    if (resendSeconds <= 0) {
      return undefined;
    }

    const timer =
      window.setInterval(() => {
        setResendSeconds(
          (current) => {
            if (current <= 1) {
              return 0;
            }

            return current - 1;
          }
        );
      }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendSeconds]);


  const clearMessages = () => {
    setError("");
    setMessage("");
  };


  const handlePhoneChange =
    (event) => {
      setPhone(
        normalizePhoneNumber(
          event.target.value
        )
      );

      clearMessages();
    };


  const handleCodeChange =
    (event) => {
      const nextCode =
        convertDigitsToEnglish(
          event.target.value
        )
          .replace(/\D/g, "")
          .slice(0, 6);

      setCode(nextCode);
      clearMessages();
    };


  const handleRequestOtp =
    async (event) => {
      event.preventDefault();
      clearMessages();

      if (
        !isValidIranianPhoneNumber(
          phone
        )
      ) {
        setError(
          "شماره موبایل را به شکل 09123456789 وارد کنید."
        );

        return;
      }

      setLoading(true);

      try {
        const result =
          await requestOtpCode({
            phone,
          });

        setStep("code");
        setCode("");

        setResendSeconds(
          Number(
            result.retryAfter || 60
          )
        );

        setMessage(
          result.message ||
            "کد ورود فضاجو برای شما ارسال شد."
        );
      } catch (requestError) {
        console.error(
          "OTP request error:",
          requestError
        );

        setError(
          requestError.message ||
            "ارسال کد ورود انجام نشد. دوباره تلاش کنید."
        );
      } finally {
        setLoading(false);
      }
    };


  const handleVerifyOtp =
    async (event) => {
      event.preventDefault();
      clearMessages();

      if (
        !isValidIranianPhoneNumber(
          phone
        )
      ) {
        setError(
          "شماره موبایل معتبر نیست."
        );

        return;
      }

      if (
        !/^\d{6}$/.test(code)
      ) {
        setError(
          "کد ورود ۶ رقمی را کامل وارد کنید."
        );

        return;
      }

      setLoading(true);

      try {
        await verifyOtpCode({
          phone,
          code,
        });

        navigate("/", {
          replace: true,

          state: {
            message:
              "با موفقیت وارد حساب شدید.",
          },
        });
      } catch (verifyError) {
        console.error(
          "OTP verify error:",
          verifyError
        );

        setError(
          verifyError.message ||
            "کد ورود صحیح نیست یا منقضی شده است."
        );
      } finally {
        setLoading(false);
      }
    };


  const handleResendOtp =
    async () => {
      if (
        loading ||
        resendSeconds > 0
      ) {
        return;
      }

      clearMessages();
      setLoading(true);

      try {
        const result =
          await requestOtpCode({
            phone,
          });

        setCode("");

        setResendSeconds(
          Number(
            result.retryAfter || 60
          )
        );

        setMessage(
          result.message ||
            "کد جدید برای شما ارسال شد."
        );

        window.setTimeout(() => {
          codeInputRef.current?.focus();
        }, 100);
      } catch (requestError) {
        console.error(
          "OTP resend error:",
          requestError
        );

        if (
          requestError?.data
            ?.retryAfter
        ) {
          setResendSeconds(
            Number(
              requestError.data
                .retryAfter
            )
          );
        }

        setError(
          requestError.message ||
            "ارسال مجدد کد انجام نشد."
        );
      } finally {
        setLoading(false);
      }
    };


  const handleEditPhone = () => {
    if (loading) {
      return;
    }

    setStep("phone");
    setCode("");
    setResendSeconds(0);
    clearMessages();
  };


  const handlePasswordLogin =
    async (event) => {
      event.preventDefault();
      clearMessages();

      if (
        !isValidIranianPhoneNumber(
          phone
        )
      ) {
        setError(
          "شماره موبایل را به شکل 09123456789 وارد کنید."
        );

        return;
      }

      if (!password) {
        setError(
          "رمز عبور را وارد کنید."
        );

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
            message:
              "با موفقیت وارد حساب شدید.",
          },
        });
      } catch (loginError) {
        console.error(
          "Login error:",
          loginError
        );

        setError(
          loginError.message ||
            "ورود انجام نشد. شماره موبایل و رمز عبور را بررسی کنید."
        );
      } finally {
        setLoading(false);
      }
    };


  const handleRequestPasswordReset =
    async (event) => {
      event.preventDefault();
      clearMessages();

      if (!isValidIranianPhoneNumber(phone)) {
        setError("شماره موبایل را به شکل 09123456789 وارد کنید.");
        return;
      }

      setLoading(true);
      try {
        const result = await requestPasswordResetCode({ phone });
        setStep("code");
        setCode("");
        setNewPassword("");
        setConfirmNewPassword("");
        setResendSeconds(Number(result.retryAfter || 60));
        setMessage(result.message);
      } catch (requestError) {
        setError(
          requestError.message ||
            "درخواست بازیابی رمز انجام نشد."
        );
      } finally {
        setLoading(false);
      }
    };


  const handleResendPasswordReset =
    async () => {
      if (loading || resendSeconds > 0) return;
      clearMessages();
      setLoading(true);
      try {
        const result = await requestPasswordResetCode({ phone });
        setCode("");
        setResendSeconds(Number(result.retryAfter || 60));
        setMessage(result.message);
        window.setTimeout(() => codeInputRef.current?.focus(), 100);
      } catch (requestError) {
        if (requestError?.data?.retryAfter) {
          setResendSeconds(Number(requestError.data.retryAfter));
        }
        setError(requestError.message || "ارسال مجدد کد بازیابی انجام نشد.");
      } finally {
        setLoading(false);
      }
    };


  const handleConfirmPasswordReset =
    async (event) => {
      event.preventDefault();
      clearMessages();

      if (!/^\d{6}$/.test(code)) {
        setError("کد بازیابی ۶ رقمی را کامل وارد کنید.");
        return;
      }

      if (new TextEncoder().encode(newPassword).length < 8) {
        setError("رمز عبور جدید باید حداقل ۸ کاراکتر باشد.");
        return;
      }

      if (newPassword !== confirmNewPassword) {
        setError("تکرار رمز عبور با رمز جدید یکسان نیست.");
        return;
      }

      setLoading(true);
      try {
        const result = await confirmPasswordReset({
          phone,
          code,
          newPassword,
        });

        setMode("password");
        setStep("phone");
        setCode("");
        setPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setResendSeconds(0);
        setMessage(
          result.message ||
            "رمز عبور با موفقیت تغییر کرد. اکنون با رمز جدید وارد شوید."
        );
      } catch (resetError) {
        setError(resetError.message || "بازیابی رمز انجام نشد.");
      } finally {
        setLoading(false);
      }
    };


  const switchToPasswordReset = () => {
    if (loading) return;
    setMode("reset");
    setStep("phone");
    setCode("");
    setPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setResendSeconds(0);
    clearMessages();
  };


  const switchToOtp = () => {
    if (loading) {
      return;
    }

    setMode("otp");
    setStep("phone");
    setCode("");
    setPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setResendSeconds(0);
    clearMessages();
  };


  const switchToPassword =
    () => {
      if (loading) {
        return;
      }

      setMode("password");
      setStep("phone");
      setCode("");
      setResendSeconds(0);
      clearMessages();
    };


  return (
    <main
      className="login-page"
      dir="rtl"
    >
      <div className="login-background login-background-one" />
      <div className="login-background login-background-two" />

      <section className="login-shell">
        <aside className="login-intro">
          <Link
            className="login-brand"
            to="/"
          >
            <span className="login-brand-icon">
              ف
            </span>

            <span className="login-brand-text">
              <strong>
                فضاجو
              </strong>

              <small>
                جای پارک، بدون دردسر
              </small>
            </span>
          </Link>

          <div className="login-intro-content">
            <span className="login-badge">
              ورود به حساب کاربری
            </span>

            <h1>
              دوباره خوش آمدید
              <span>
                {" "}
                به فضاجو.
              </span>
            </h1>

            <p>
              با شماره موبایل خود وارد شوید و آگهی‌ها،
              گفتگوها و حساب کاربری‌تان را مدیریت کنید.
            </p>

            <div className="login-features">
              <div className="login-feature">
                <span>✓</span>
                <p>
                  ورود سریع با کد پیامکی
                </p>
              </div>

              <div className="login-feature">
                <span>✓</span>
                <p>
                  بدون نیاز به حفظ رمز عبور
                </p>
              </div>

              <div className="login-feature">
                <span>✓</span>
                <p>
                  کد ورود یک‌بارمصرف و زمان‌دار
                </p>
              </div>
            </div>
          </div>

          <p className="login-intro-footer">
            اطلاعات حساب شما با امنیت نگهداری می‌شود.
          </p>
        </aside>


        <section className="login-card">
          <header className="login-card-header">
            <span>
              ورود کاربران
            </span>

            <h2>
              ورود به فضاجو
            </h2>

            <p>
              {mode === "otp"
                ? step === "phone"
                  ? "شماره موبایل حساب خود را وارد کنید تا کد ورود برایتان ارسال شود."
                  : "کد ۶ رقمی ارسال‌شده به شماره موبایل خود را وارد کنید."
                : mode === "reset"
                  ? step === "phone"
                    ? "شماره موبایل حساب را وارد کنید تا کد بازیابی رمز ارسال شود."
                    : "کد بازیابی و رمز عبور جدید را وارد کنید."
                  : "شماره موبایل و رمز عبور حساب خود را وارد کنید."}
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


          {message && (
            <div
              className="login-message login-message-success"
              role="status"
            >
              <span>✓</span>
              <p>{message}</p>
            </div>
          )}


          {mode === "otp" &&
            step === "phone" && (
              <form
                className="login-form"
                onSubmit={
                  handleRequestOtp
                }
                noValidate
              >
                <div className="login-field">
                  <label htmlFor="phone">
                    شماره موبایل
                  </label>

                  <div className="login-phone-field">
                    <span className="login-country-code">
                      +98
                    </span>

                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="09123456789"
                      value={phone}
                      onChange={
                        handlePhoneChange
                      }
                      maxLength={11}
                      disabled={
                        loading
                      }
                      autoFocus
                    />
                  </div>

                  <small>
                    شماره موبایل باید با 09 شروع شود.
                  </small>
                </div>

                <button
                  className="login-primary-button"
                  type="submit"
                  disabled={
                    loading ||
                    !isValidIranianPhoneNumber(
                      phone
                    )
                  }
                >
                  {loading ? (
                    <>
                      <span className="login-spinner" />
                      در حال ارسال کد...
                    </>
                  ) : (
                    <>
                      دریافت کد ورود
                      <span aria-hidden="true">
                        ←
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}


          {mode === "otp" &&
            step === "code" && (
              <form
                className="login-form"
                onSubmit={
                  handleVerifyOtp
                }
                noValidate
              >
                <div className="login-field">
                  <label htmlFor="otp-code">
                    کد ورود
                  </label>

                  <div className="login-password-field login-otp-field">
                    <input
                      ref={
                        codeInputRef
                      }
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="کد ۶ رقمی"
                      value={code}
                      onChange={
                        handleCodeChange
                      }
                      maxLength={6}
                      disabled={
                        loading
                      }
                      dir="ltr"
                    />
                  </div>

                  <small>
                    کد ارسال‌شده به{" "}
                    <strong>
                      {phone}
                    </strong>{" "}
                    را وارد کنید.
                  </small>
                </div>


                <div
                  className={
                    resendSeconds > 0
                      ? "login-otp-timer"
                      : "login-otp-timer login-otp-timer--ready"
                  }
                  aria-live="polite"
                >
                  {resendSeconds > 0 ? (
                    <>
                      <span className="login-otp-timer__icon">
                        ◷
                      </span>

                      <div className="login-otp-timer__text">
                        <span>
                          امکان ارسال مجدد کد تا
                        </span>

                        <strong>
                          {resendSeconds}
                          {" "}
                          ثانیه دیگر
                        </strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="login-otp-timer__icon">
                        ✓
                      </span>

                      <div className="login-otp-timer__text">
                        <span>
                          زمان انتظار تمام شد
                        </span>

                        <strong>
                          می‌توانید کد جدید دریافت کنید
                        </strong>
                      </div>
                    </>
                  )}
                </div>


                <button
                  className="login-primary-button"
                  type="submit"
                  disabled={
                    loading ||
                    !/^\d{6}$/.test(
                      code
                    )
                  }
                >
                  {loading ? (
                    <>
                      <span className="login-spinner" />
                      در حال بررسی...
                    </>
                  ) : (
                    <>
                      ورود به حساب
                      <span aria-hidden="true">
                        ←
                      </span>
                    </>
                  )}
                </button>


                <button
                  type="button"
                  className="login-secondary-button"
                  onClick={
                    handleResendOtp
                  }
                  disabled={
                    loading ||
                    resendSeconds > 0
                  }
                >
                  {resendSeconds > 0
                    ? "ارسال مجدد کد"
                    : "ارسال مجدد کد ورود"}
                </button>


                <button
                  type="button"
                  className="login-text-button"
                  onClick={
                    handleEditPhone
                  }
                  disabled={
                    loading
                  }
                >
                  اصلاح شماره موبایل
                </button>
              </form>
            )}


          {mode === "reset" &&
            step === "phone" && (
              <form
                className="login-form"
                onSubmit={handleRequestPasswordReset}
                noValidate
              >
                <div className="login-field">
                  <label htmlFor="reset-phone">شماره موبایل</label>
                  <div className="login-phone-field">
                    <span className="login-country-code">+98</span>
                    <input
                      id="reset-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="09123456789"
                      value={phone}
                      onChange={handlePhoneChange}
                      maxLength={11}
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <small>کد بازیابی فقط برای شماره ثبت‌شده در فضاجو ارسال می‌شود.</small>
                </div>

                <button
                  className="login-primary-button"
                  type="submit"
                  disabled={loading || !isValidIranianPhoneNumber(phone)}
                >
                  {loading ? (
                    <><span className="login-spinner" />در حال ارسال کد...</>
                  ) : (
                    <>دریافت کد بازیابی <span aria-hidden="true">←</span></>
                  )}
                </button>

                <button
                  type="button"
                  className="login-text-button"
                  onClick={switchToPassword}
                  disabled={loading}
                >
                  بازگشت به ورود با رمز عبور
                </button>
              </form>
            )}


          {mode === "reset" &&
            step === "code" && (
              <form
                className="login-form"
                onSubmit={handleConfirmPasswordReset}
                noValidate
              >
                <div className="login-field">
                  <label htmlFor="reset-code">کد بازیابی</label>
                  <div className="login-password-field login-otp-field">
                    <input
                      ref={codeInputRef}
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="کد ۶ رقمی"
                      value={code}
                      onChange={handleCodeChange}
                      maxLength={6}
                      disabled={loading}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="reset-new-password">رمز عبور جدید</label>
                  <div className="login-password-field">
                    <input
                      id="reset-new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="حداقل ۸ کاراکتر"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value);
                        clearMessages();
                      }}
                      disabled={loading}
                      maxLength={72}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      disabled={loading}
                    >
                      {showPassword ? "مخفی" : "نمایش"}
                    </button>
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="reset-confirm-password">تکرار رمز عبور جدید</label>
                  <div className="login-password-field">
                    <input
                      id="reset-confirm-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="رمز جدید را دوباره وارد کنید"
                      value={confirmNewPassword}
                      onChange={(event) => {
                        setConfirmNewPassword(event.target.value);
                        clearMessages();
                      }}
                      disabled={loading}
                      maxLength={72}
                    />
                  </div>
                </div>

                <div
                  className={
                    resendSeconds > 0
                      ? "login-otp-timer"
                      : "login-otp-timer login-otp-timer--ready"
                  }
                  aria-live="polite"
                >
                  <span className="login-otp-timer__icon">
                    {resendSeconds > 0 ? "◷" : "✓"}
                  </span>
                  <div className="login-otp-timer__text">
                    <span>{resendSeconds > 0 ? "امکان ارسال مجدد کد تا" : "زمان انتظار تمام شد"}</span>
                    <strong>
                      {resendSeconds > 0
                        ? `${resendSeconds} ثانیه دیگر`
                        : "می‌توانید کد جدید دریافت کنید"}
                    </strong>
                  </div>
                </div>

                <button
                  className="login-primary-button"
                  type="submit"
                  disabled={
                    loading ||
                    !/^\d{6}$/.test(code) ||
                    newPassword.length < 8 ||
                    newPassword !== confirmNewPassword
                  }
                >
                  {loading ? (
                    <><span className="login-spinner" />در حال تغییر رمز...</>
                  ) : (
                    <>ثبت رمز عبور جدید <span aria-hidden="true">←</span></>
                  )}
                </button>

                <button
                  type="button"
                  className="login-secondary-button"
                  onClick={handleResendPasswordReset}
                  disabled={loading || resendSeconds > 0}
                >
                  ارسال مجدد کد بازیابی
                </button>

                <button
                  type="button"
                  className="login-text-button"
                  onClick={handleEditPhone}
                  disabled={loading}
                >
                  اصلاح شماره موبایل
                </button>
              </form>
            )}


          {mode === "password" && (
            <form
              className="login-form"
              onSubmit={
                handlePasswordLogin
              }
              noValidate
            >
              <div className="login-field">
                <label htmlFor="phone-password">
                  شماره موبایل
                </label>

                <div className="login-phone-field">
                  <span className="login-country-code">
                    +98
                  </span>

                  <input
                    id="phone-password"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="09123456789"
                    value={phone}
                    onChange={
                      handlePhoneChange
                    }
                    maxLength={11}
                    disabled={
                      loading
                    }
                    autoFocus
                  />
                </div>

                <small>
                  شماره موبایل باید با 09 شروع شود.
                </small>
              </div>


              <div className="login-field">
                <label htmlFor="password">
                  رمز عبور
                </label>

                <div className="login-password-field">
                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    placeholder="رمز عبور خود را وارد کنید"
                    value={password}
                    onChange={(
                      event
                    ) => {
                      setPassword(
                        event.target.value
                      );

                      clearMessages();
                    }}
                    disabled={
                      loading
                    }
                    maxLength={128}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (previousValue) =>
                          !previousValue
                      )
                    }
                    disabled={
                      loading
                    }
                    aria-label={
                      showPassword
                        ? "مخفی کردن رمز عبور"
                        : "نمایش رمز عبور"
                    }
                  >
                    {showPassword
                      ? "مخفی"
                      : "نمایش"}
                  </button>
                </div>
              </div>


              <button
                type="button"
                className="login-forgot-button"
                onClick={switchToPasswordReset}
                disabled={loading}
              >
                رمز عبورم را فراموش کرده‌ام
              </button>


              <button
                className="login-primary-button"
                type="submit"
                disabled={
                  loading ||
                  !isValidIranianPhoneNumber(
                    phone
                  ) ||
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
                    <span aria-hidden="true">
                      ←
                    </span>
                  </>
                )}
              </button>
            </form>
          )}


          {mode !== "reset" && (
            <div className="login-register-link">
              {mode === "otp" ? (
                <>
                  <span>ورود با رمز عبور را ترجیح می‌دهید؟</span>
                  <button type="button" onClick={switchToPassword} disabled={loading}>
                    ورود با رمز عبور
                  </button>
                </>
              ) : (
                <>
                  <span>ورود سریع‌تر و امن‌تر</span>
                  <button type="button" onClick={switchToOtp} disabled={loading}>
                    ورود با کد پیامکی
                  </button>
                </>
              )}
            </div>
          )}


          <div className="login-register-link">
            <span>
              هنوز حساب ندارید؟
            </span>

            <Link to="/register">
              ثبت‌نام کنید
            </Link>
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