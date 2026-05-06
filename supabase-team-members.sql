-- ─── Team-leden tabel voor de Samenwerkingen-pagina ──────────────────────
-- Run in de Supabase SQL editor (dashboard-project).
--
-- Dupliceert het Partner-concept maar zonder type-enum / specialism /
-- commission_arrangement. Velden die we wel houden parity met Partner zodat
-- de bestaande UI-componenten (modal, region-strip, region-stats) hergebruikt
-- kunnen worden zonder schema-aliasing.

create table if not exists team_members (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  role               text,                    -- 'Senior consultant', 'Marketing', etc.
  region             text,                    -- gelijke enum als partners
  contact_name       text,
  contact_phone      text,
  contact_email      text,
  internal_notes     text,
  reliability_score  int,
  is_active          boolean default true,
  is_preferred       boolean default false,
  last_contact_days  int,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index if not exists team_members_region_idx on team_members(region);
create index if not exists team_members_active_idx on team_members(is_active);

-- RLS: alleen ingelogde users kunnen lezen. Schrijven gebeurt voorlopig via
-- service-role (geen UI voor write — read-only zoals afgesproken).
alter table team_members enable row level security;

create policy "team_members readable to authenticated"
  on team_members for select
  to authenticated
  using (true);
