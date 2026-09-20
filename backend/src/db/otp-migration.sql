CREATE TABLE IF NOT EXISTS auth_otp_codes (
  id UUID PRIMARY KEY,

  phone VARCHAR(11) NOT NULL,

  code_hash VARCHAR(64) NOT NULL,

  purpose VARCHAR(30) NOT NULL DEFAULT 'login',

  expires_at TIMESTAMPTZ NOT NULL,

  attempts INTEGER NOT NULL DEFAULT 0,

  max_attempts INTEGER NOT NULL DEFAULT 5,

  consumed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT auth_otp_codes_phone_format
    CHECK (phone ~ '^09[0-9]{9}$'),

  CONSTRAINT auth_otp_codes_attempts_nonnegative
    CHECK (attempts >= 0),

  CONSTRAINT auth_otp_codes_max_attempts_positive
    CHECK (max_attempts > 0)
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_phone_purpose_created
  ON auth_otp_codes (
    phone,
    purpose,
    created_at DESC
  );

CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_expires_at
  ON auth_otp_codes (
    expires_at
  );