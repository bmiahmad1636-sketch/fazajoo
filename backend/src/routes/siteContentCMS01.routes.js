'use strict';
const express=require('express');
const {requireAuth,requireAdmin}=require('../middleware/auth.middleware');
const service=require('../services/siteContentCMS01.service');
const router=express.Router();
router.use((req,res,next)=>{res.set('Cache-Control','no-store'); next();});
const safe=handler=>async(req,res)=>{
  try {return res.json(await handler(req));}
  catch(error) {console.error('CMS01 request failed:',error.code||error.status||'INTERNAL'); return res.status(error.status || (error.code==='42P01'?503:500)).json({ok:false,message:error.status?error.message:'محتوای سایت در دسترس نیست؛ وضعیت مهاجرت و سرور را بررسی کنید.'});}
};
router.get('/public',safe(()=>service.readPublic()));
router.use('/admin',requireAuth,requireAdmin);
router.get('/admin',safe(()=>service.readAdmin()));
// Larger JSON limit is isolated here, after server-side admin checks.
const json=express.json({limit:'512kb'});
router.put('/admin/draft',json,safe(req=>service.save(req.user.id,req.body)));
router.post('/admin/publish',json,safe(req=>service.publish(req.user.id,req.body)));
router.use((err,req,res,next)=>{if(err.type==='entity.too.large'||err.type==='entity.parse.failed') return res.status(err.type==='entity.too.large'?413:400).json({ok:false,message:'حجم یا ساختار درخواست معتبر نیست.'}); next(err);});
router.use((req,res)=>res.status(404).json({ok:false,message:'مسیر محتوا پیدا نشد.'}));
module.exports=router;
