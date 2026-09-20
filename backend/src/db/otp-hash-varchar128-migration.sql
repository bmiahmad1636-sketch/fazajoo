-- Fazajoo OTP hash storage hardening
-- The real OTP table in Fazajoo is auth_otp_codes.
-- HMAC-SHA256 storage may include a version/prefix in addition to the digest.
-- Increase capacity without changing existing values.
ALTER TABLE auth_otp_codes
  ALTER COLUMN code_hash TYPE VARCHAR(128);
