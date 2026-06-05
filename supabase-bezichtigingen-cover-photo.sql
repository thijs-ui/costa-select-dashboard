-- Coverfoto per bezichtigingsdag: URL die op pagina 1 (rechts) van de PDF
-- wordt getoond. Leeg = default-villa. Voer uit in Supabase SQL editor.

alter table public.viewing_trips
  add column if not exists cover_photo_url text;
