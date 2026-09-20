const express =
  require(
    "express"
  );

const {
  register,
  login,
  me,
  logout,
  changePassword,
} = require(
  "../controllers/auth.controller"
);

const {
  requestOtp,
  verifyOtp,
} = require(
  "../controllers/otp.controller"
);

const {
  requestPasswordReset,
  confirmPasswordReset,
} = require(
  "../controllers/passwordReset.controller"
);

const {
  requireAuth,
} = require(
  "../middleware/auth.middleware"
);

const {
  loginLimiter,
  passwordResetRequestLimiter,
  passwordResetConfirmLimiter,
  changePasswordLimiter,
} = require(
  "../middleware/accountSecurityRateLimit.middleware"
);

const {
  otpRequestLimiter,
  otpVerifyLimiter,
} = require(
  "../middleware/otpRateLimit.middleware"
);

const router =
  express.Router();


router.post(
  "/register",
  register
);


router.post(
  "/login",
  loginLimiter,
  login
);


/*
 * ورود پیامکی
 */
router.post(
  "/otp/request",
  otpRequestLimiter,
  requestOtp
);


router.post(
  "/otp/verify",
  otpVerifyLimiter,
  verifyOtp
);


/*
 * بازیابی امن رمز عبور با کد پیامکی مستقل
 */
router.post(
  "/password-reset/request",
  passwordResetRequestLimiter,
  requestPasswordReset
);

router.post(
  "/password-reset/confirm",
  passwordResetConfirmLimiter,
  confirmPasswordReset
);


router.get(
  "/me",
  requireAuth,
  me
);


router.post(
  "/change-password",
  requireAuth,
  changePasswordLimiter,
  changePassword
);


router.post(
  "/logout",
  requireAuth,
  logout
);


module.exports =
  router;