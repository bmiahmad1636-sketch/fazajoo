const jwt =
  require(
    "jsonwebtoken"
  );

const env =
  require(
    "../config/env"
  );

function ensureSecret() {
  if (
    !env.JWT_SECRET ||
    env.JWT_SECRET.length < 32
  ) {
    throw new Error(
      "JWT_SECRET باید حداقل 32 کاراکتر باشد."
    );
  }
}

function createToken(
  user
) {
  ensureSecret();

  return jwt.sign(
    {
      sub:
        user.id,

      phone:
        user.phone,

      systemRole:
        user.system_role,

      accountType:
        user.account_type,
    },

    env.JWT_SECRET,

    {
      expiresIn:
        env.JWT_EXPIRES_IN,
    }
  );
}

function verifyToken(
  token
) {
  ensureSecret();

  return jwt.verify(
    token,
    env.JWT_SECRET
  );
}

module.exports = {
  createToken,
  verifyToken,
};