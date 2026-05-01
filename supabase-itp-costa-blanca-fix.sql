-- Costa Blanca ITP: 10% tot €1.000.000, 11% boven dat (Comunidad Valenciana progressief)
-- Voer uit in Supabase SQL editor.

update public.regional_settings
set
  itp_percentage = 10.0,
  itp_progressive = '[{"threshold": 1000000, "rate": 10.0}, {"threshold": null, "rate": 11.0}]'::jsonb,
  updated_at = now()
where region in ('Costa Blanca', 'Costa Blanca Noord', 'Costa Blanca Zuid', 'Valencia');
