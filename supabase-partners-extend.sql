-- Partners + team_members: ontbrekende kolommen + multi-regio.
-- Run één keer in Supabase Studio (dashboard project).
-- Idempotent (IF NOT EXISTS) dus veilig om vaker te draaien.

-- ─── partners: ontbrekende English-kolommen ───────────────────────
alter table partners add column if not exists name text;
alter table partners add column if not exists type text;
alter table partners add column if not exists region text;
alter table partners add column if not exists regions text[];
alter table partners add column if not exists contact_name text;
alter table partners add column if not exists contact_phone text;
alter table partners add column if not exists contact_email text;
alter table partners add column if not exists website text;
alter table partners add column if not exists specialism text;
alter table partners add column if not exists internal_notes text;
alter table partners add column if not exists commission_arrangement text;
alter table partners add column if not exists is_active boolean default true;
alter table partners add column if not exists is_preferred boolean default false;
alter table partners add column if not exists reliability_score int;
alter table partners add column if not exists languages text[];
alter table partners add column if not exists last_contact_days int;

-- Backfill regions vanuit oude single-region kolom.
update partners
   set regions = array[region]
 where region is not null and (regions is null or array_length(regions, 1) is null);

-- ─── team_members: regions[] toevoegen ────────────────────────────
alter table team_members add column if not exists regions text[];

update team_members
   set regions = array[region]
 where region is not null and (regions is null or array_length(regions, 1) is null);

-- ─── PostgREST schema cache reload ────────────────────────────────
notify pgrst, 'reload schema';
