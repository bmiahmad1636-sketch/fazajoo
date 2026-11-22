-- HP-03 | Showcase scheduling foundation. Apply to an independently backed-up DB.
BEGIN;
CREATE TABLE IF NOT EXISTS featured_showcase_settings (
  singleton INTEGER PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  capacity INTEGER NOT NULL DEFAULT 20 CHECK (capacity BETWEEN 1 AND 100),
  rotation_minutes INTEGER NOT NULL DEFAULT 5 CHECK (rotation_minutes BETWEEN 1 AND 60),
  package_price_rials BIGINT NOT NULL DEFAULT 0 CHECK (package_price_rials >= 0),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO featured_showcase_settings (singleton) VALUES (1)
ON CONFLICT (singleton) DO NOTHING;
CREATE TABLE IF NOT EXISTS featured_showcase_bookings (
  id UUID PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued','active','expired','cancelled')),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('complimentary','manual_verified')),
  payment_reference TEXT,
  amount_rials BIGINT NOT NULL DEFAULT 0 CHECK (amount_rials >= 0),
  note TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hp03_valid_window CHECK (
    (status = 'queued' AND activated_at IS NULL AND expires_at IS NULL)
    OR (status <> 'queued' AND (activated_at IS NULL OR (expires_at IS NOT NULL AND expires_at = activated_at + INTERVAL '72 hours')))
  ),
  CONSTRAINT hp03_manual_receipt CHECK (
    payment_mode = 'complimentary' OR (NULLIF(BTRIM(payment_reference), '') IS NOT NULL AND amount_rials > 0)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS hp03_unique_live_space ON featured_showcase_bookings(space_id)
  WHERE status IN ('queued','active');
CREATE INDEX IF NOT EXISTS hp03_active_expiry ON featured_showcase_bookings(status,expires_at);
CREATE INDEX IF NOT EXISTS hp03_queue_order ON featured_showcase_bookings(status,created_at,id);
CREATE TABLE IF NOT EXISTS featured_showcase_audit (
  id UUID PRIMARY KEY,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES featured_showcase_bookings(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;
