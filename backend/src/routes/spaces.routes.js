const router = require("express").Router();
const c = require("../controllers/spaces.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  contactRevealLimiter,
} = require("../middleware/contactRateLimit.middleware");

router.get("/", c.list);
router.get("/mine", requireAuth, c.mine);
router.get(
  "/:id/contact",
  requireAuth,
  contactRevealLimiter,
  c.getContact
);
router.get("/:id", c.getOne);
router.post("/", requireAuth, c.create);
router.patch("/:id", requireAuth, c.update);
router.delete("/:id", requireAuth, c.remove);

module.exports = router;
