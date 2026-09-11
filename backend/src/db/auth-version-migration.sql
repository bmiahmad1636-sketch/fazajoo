ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 1;

UPDATE users
SET auth_version = 1
WHERE auth_version IS NULL;