const router = require("express").Router();
const controller = require("../controllers/favorites.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.use(requireAuth);
router.get("/", controller.list);
router.get("/:spaceId/status", controller.status);
router.post("/:spaceId", controller.add);
router.delete("/:spaceId", controller.remove);

module.exports = router;
