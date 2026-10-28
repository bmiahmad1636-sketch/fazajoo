ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS shop_details JSONB NOT NULL DEFAULT '{}'::jsonb;
