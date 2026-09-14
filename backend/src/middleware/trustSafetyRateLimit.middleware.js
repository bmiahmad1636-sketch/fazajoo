const rateLimit = require("express-rate-limit");
const trustActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
  handler: (req,res) => res.status(429).json({ok:false,message:"تعداد عملیات گزارش یا مسدودسازی بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید."}),
});
module.exports={trustActionLimiter};
