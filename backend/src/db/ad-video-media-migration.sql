-- Fazajoo ad video/media foundation
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS media_items JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_spaces_media_items_gin ON spaces USING GIN (media_items);


-- Fazajoo video evidentiary/action history.
-- Append-only audit trail for moderation/legal actions; do not delete rows during ordinary video replacement/removal.
CREATE TABLE IF NOT EXISTS video_action_history (
  id UUID PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  video_url TEXT,
  action_type VARCHAR(40) NOT NULL,
  source VARCHAR(30) NOT NULL,
  source_ref TEXT,
  previous_status VARCHAR(30),
  new_status VARCHAR(30),
  reason_code VARCHAR(120),
  note TEXT,
  actor_id UUID REFERENCES users(id),
  video_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_action_history_space ON video_action_history(space_id, created_at DESC);
