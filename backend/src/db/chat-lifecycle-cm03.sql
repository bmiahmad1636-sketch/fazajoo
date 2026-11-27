-- Executed in one transaction before HTTP starts. Also tested in an isolated schema.
LOCK TABLE spaces IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE chats IN ACCESS EXCLUSIVE MODE;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS original_space_id uuid;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS deleted_space_title text;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS deleted_space_city text;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS deleted_space_listing_type text;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS listing_deleted_at timestamptz;
UPDATE chats SET original_space_id=space_id WHERE original_space_id IS NULL AND space_id IS NOT NULL;
-- Do not guess a foreign-key name or remove unrelated constraints.
DO $$
DECLARE fk record; n integer;
BEGIN
  SELECT count(*) INTO n FROM pg_constraint
  WHERE conrelid='chats'::regclass AND confrelid='spaces'::regclass AND contype='f'
    AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='chats'::regclass AND attname='space_id')];
  IF n<>1 THEN RAISE EXCEPTION 'CM03 unexpected chats/space FK count: %',n; END IF;
  SELECT conname,confdeltype,confkey INTO fk FROM pg_constraint
  WHERE conrelid='chats'::regclass AND confrelid='spaces'::regclass AND contype='f'
    AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='chats'::regclass AND attname='space_id')];
  IF fk.confdeltype NOT IN ('c','n') OR fk.confkey<>ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='spaces'::regclass AND attname='id')] THEN
    RAISE EXCEPTION 'CM03 unexpected chats/space FK definition';
  END IF;
  ALTER TABLE chats ALTER COLUMN space_id DROP NOT NULL;
  IF fk.confdeltype='c' THEN
    EXECUTE format('ALTER TABLE chats DROP CONSTRAINT %I',fk.conname);
    ALTER TABLE chats ADD CONSTRAINT chats_space_id_cm03_fkey FOREIGN KEY(space_id) REFERENCES spaces(id) ON DELETE SET NULL;
  END IF;
END $$;
-- Keep the original identifier even for future inserts and capture the final title/city
-- in the same transaction as listing deletion. No contact data or media are copied.
CREATE OR REPLACE FUNCTION cm03_keep_chat_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.space_id IS NOT NULL THEN NEW.original_space_id := NEW.space_id;
  ELSIF TG_OP='UPDATE' THEN NEW.original_space_id := COALESCE(OLD.original_space_id,OLD.space_id); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cm03_keep_chat_reference ON chats;
CREATE TRIGGER cm03_keep_chat_reference BEFORE INSERT OR UPDATE OF space_id ON chats
FOR EACH ROW EXECUTE FUNCTION cm03_keep_chat_reference();
CREATE OR REPLACE FUNCTION cm03_snapshot_deleted_space() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE chats SET original_space_id=OLD.id, deleted_space_title=OLD.title,
    deleted_space_city=OLD.city, deleted_space_listing_type=OLD.listing_type,
    listing_deleted_at=NOW() WHERE space_id=OLD.id;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS cm03_snapshot_deleted_space ON spaces;
CREATE TRIGGER cm03_snapshot_deleted_space BEFORE DELETE ON spaces
FOR EACH ROW EXECUTE FUNCTION cm03_snapshot_deleted_space();
CREATE TABLE IF NOT EXISTS chat_user_archive_cm03 (
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_id uuid NOT NULL,
  archived boolean NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY(chat_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_messages_cm03_activity ON messages(chat_id,created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS chat_policy_cm03 (
  id integer PRIMARY KEY CHECK(id=1),
  personal_days integer NOT NULL CHECK(personal_days BETWEEN 1 AND 3650),
  agency_days integer NOT NULL CHECK(agency_days BETWEEN 1 AND 3650),
  version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT NOW()
);
INSERT INTO chat_policy_cm03(id,personal_days,agency_days) VALUES(1,90,180) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS chat_policy_audit_cm03 (
  id bigserial PRIMARY KEY, actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  old_policy jsonb NOT NULL, new_policy jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW()
);
