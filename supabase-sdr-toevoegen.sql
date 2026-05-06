-- SDR-rol toevoegen aan makelaars-tabel.
-- Run in Supabase Studio SQL editor.

-- Veld voor SDR's regio-pool. Voor consultants/area_managers blijft het null.
ALTER TABLE makelaars
  ADD COLUMN IF NOT EXISTS regios_assigned text[];

-- Optioneel: zet Dean's rol meteen op 'sdr' en wijs regio's toe.
-- Vervang de regio-codes door de werkelijke pool van Dean.
-- UPDATE makelaars
--   SET rol = 'sdr',
--       regios_assigned = ARRAY['CDS', 'CBN']
--   WHERE naam ILIKE 'Dean%';
