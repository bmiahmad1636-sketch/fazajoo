ALTER TABLE spaces
ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE spaces
SET image_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL
  AND BTRIM(image_url) <> ''
  AND (image_urls IS NULL OR image_urls = '[]'::jsonb);
