const express =
  require(
    "express"
  );

const {
  testDbConnection,
} = require(
  "../db/pool"
);

const router =
  express.Router();


router.get(
  "/",
  async (
    request,
    response
  ) => {
    const database =
      await testDbConnection();

    const statusCode =
      database.ok
        ? 200
        : 503;

    return response
      .status(
        statusCode
      )
      .json({
        ok:
          database.ok,

        service:
          "fazajoo-backend",

        backend:
          "online",

        database,

        time:
          new Date()
            .toISOString(),
      });
  }
);


module.exports =
  router;