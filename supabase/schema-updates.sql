-- Run in Supabase SQL Editor
ALTER TABLE deals ADD COLUMN IF NOT EXISTS pipedrive_deal_id BIGINT UNIQUE;

-- Settings for field mapping (insert only if not exists)
INSERT INTO settings (key, value) VALUES
  ('pipedrive_deal_field_mapping', '{"datum_passering":"","regio":"","type_deal":"","bron":""}')
ON CONFLICT (key) DO NOTHING;
