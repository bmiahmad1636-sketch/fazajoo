const {
  Pool,
} = require("pg");

const env =
  require(
    "../config/env"
  );

const pool =
  new Pool({
    host:
      env.DB_HOST,

    port:
      env.DB_PORT,

    database:
      env.DB_NAME,

    user:
      env.DB_USER,

    password:
      env.DB_PASSWORD,

    ssl:
      env.DB_SSL
        ? {
            rejectUnauthorized:
              false,
          }
        : false,

    max: 10,

    idleTimeoutMillis:
      30000,

    connectionTimeoutMillis:
      5000,
  });

pool.on(
  "error",
  (error) => {
    console.error(
      "PostgreSQL pool error:",
      error
    );
  }
);

async function query(
  text,
  params = []
) {
  return pool.query(
    text,
    params
  );
}

async function testDbConnection() {
  try {
    const result =
      await pool.query(
        `
          SELECT
            NOW() AS now,
            current_database()
              AS database_name
        `
      );

    return {
      ok: true,

      database:
        result.rows[0]
          .database_name,

      time:
        result.rows[0].now,
    };
  } catch (error) {
    return {
      ok: false,

      error:
        error.message,
    };
  }
}

module.exports = {
  pool,
  query,
  testDbConnection,
};