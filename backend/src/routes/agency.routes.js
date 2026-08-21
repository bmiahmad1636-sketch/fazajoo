const express = require("express");
const router = express.Router();

const { pool } = require("../db/pool");


// ثبت درخواست مشاور املاک
router.post("/request", async (req, res) => {
  try {

    const {
      agencyName,
      agentName,
      city,
      address,
      phone,
      nationalId,
      licenseNumber,
      documents,
    } = req.body;


    if (!agencyName || !agentName || !city || !phone) {
      return res.status(400).json({
        ok: false,
        message: "اطلاعات ضروری کامل نیست."
      });
    }


    return res.json({
      ok: true,
      message: "درخواست مشاور دریافت شد."
    });


  } catch (error) {

    console.error("agency request error:", error);

    return res.status(500).json({
      ok:false,
      message:"خطای داخلی سرور."
    });

  }
});


module.exports = router;