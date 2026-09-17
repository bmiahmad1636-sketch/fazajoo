const router=require("express").Router();
const {requireAuth,requireAdmin}=require("../middleware/auth.middleware");
const s=require("../services/adminDirect.service");
router.use(requireAuth,requireAdmin);
router.get("/users",async(req,res)=>{try{return res.json({ok:true,users:await s.searchUsers(req.query.q)})}catch(e){console.error(e);return res.status(500).json({ok:false,message:"جستجوی کاربر انجام نشد."})}});
router.get("/users/:id",async(req,res)=>{try{return res.json({ok:true,...await s.getUser(req.params.id)})}catch(e){return res.status(e.status||500).json({ok:false,message:e.status?e.message:"دریافت پرونده مدیریتی کاربر انجام نشد."})}});
router.post("/actions",async(req,res)=>{try{return res.json({ok:true,message:"اقدام مستقیم مدیریتی ثبت و اجرا شد.",action:await s.act(req.user.id,req.body||{})})}catch(e){console.error("Direct admin action:",e);return res.status(e.status||500).json({ok:false,message:e.status?e.message:"اجرای اقدام مدیریتی انجام نشد."})}});
module.exports=router;
