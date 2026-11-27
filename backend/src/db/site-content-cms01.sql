BEGIN;
CREATE TABLE IF NOT EXISTS site_content_cms01 (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  draft JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(draft) = 'object'),
  published JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(published) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS site_content_audit_cms01 (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('save','publish')),
  version INTEGER NOT NULL,
  changed_keys TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO site_content_cms01(id) VALUES (1) ON CONFLICT(id) DO NOTHING;
COMMIT;
