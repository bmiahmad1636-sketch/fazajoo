const express = require("express");

const {
  testDbConnection,
} = require("../db/pool");

const router = express.Router();

router.get(
  "/",
  async (
    request,
    response
  ) => {
    try {
      const database =
        await testDbConnection();

      if (!database.ok) {
        return response
          .status(503)
          .json({
            ok: false,
            service:
              "fazajoo-backend",
            backend:
              "online",
            database:
              "unavailable",
          });
      }

      return response.json({
        ok: true,
        service:
          "fazajoo-backend",
        backend:
          "online",
        database:
          "online",
      });
    } catch (error) {
      console.error(
        "Health check error:",
        error
      );

      return response
        .status(503)
        .json({
          ok: false,
          service:
            "fazajoo-backend",
          backend:
            "online",
          database:
            "unavailable",
        });
    }
  }
);

module.exports = router;