-- Maakt lunchpauze optioneel op viewing_trips.
-- Default true zodat bestaande trips ongewijzigd blijven.
alter table public.viewing_trips
  add column if not exists lunch_enabled boolean not null default true;
