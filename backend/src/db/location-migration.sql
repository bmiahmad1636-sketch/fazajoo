-- Fazajoo listing location support
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS location_lat NUMERIC(9,6);
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS location_lng NUMERIC(9,6);
