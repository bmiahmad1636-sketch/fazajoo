"use strict";
const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");
const featured = require("../services/featuredShowcase.service");
const router = express.Router();
const safe = (handler) => async (req,res) => {
  try { return res.json(await handler(req)); }
  catch (error) {
    console.error("Featured showcase request error:",error.code || error.message);
    return res.status(error.status || 500).json({ok:false,message:error.status ? error.message : "دریافت اطلاعات ویترین ویژه انجام نشد."});
  }
};
// Public route exposes only the current featured listing's safe fields.
router.get("/current",(req,res,next) => { res.set("Cache-Control","no-store"); next(); },safe(() => featured.current()));
router.use("/admin",requireAuth,requireAdmin);
router.get("/admin",safe(() => featured.dashboard()));
router.post("/admin/owner-spaces/search",(req,res,next) => {res.set("Cache-Control","no-store");next();},safe(req => featured.lookupOwnerSpaces(req.body || {})));
router.patch("/admin/settings",safe(req => featured.updateSettings(req.body || {},req.user.id)));
router.post("/admin/bookings",safe(req => featured.addBooking(req.body || {},req.user.id)));
router.post("/admin/bookings/:id/cancel",safe(req => featured.cancelBooking(req.params.id,req.user.id)));
module.exports = router;
