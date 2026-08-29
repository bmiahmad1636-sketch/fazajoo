const router = require("express").Router();
const c = require("../controllers/smartSearch.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.use(requireAuth);
router.get("/notifications", c.notifications);
router.patch("/notifications/read-all", c.markAllRead);
router.patch("/notifications/:id/read", c.markRead);
router.get("/", c.list);
router.post("/", c.create);
router.patch("/:id", c.toggle);
router.delete("/:id", c.remove);

module.exports = router;
