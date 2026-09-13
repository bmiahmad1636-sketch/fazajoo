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
  requireAuth,
} = require(
  "../middleware/auth.middleware"
);



const {
  changePasswordLimiter,
} = require(
  "../middleware/accountSecurityRateLimit.middleware"
);

const router =
  express.Router();


router.post(
  "/register",
  register
);


router.post(
  "/login",
  login
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