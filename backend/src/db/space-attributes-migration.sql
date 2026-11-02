-- Local/production DB migration for typed space attributes. Does not delete old listings.
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS space_attributes JSONB NOT NULL DEFAULT '{}'::jsonb;
