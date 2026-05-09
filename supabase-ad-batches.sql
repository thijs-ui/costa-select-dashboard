-- Wekelijkse ad-pipeline: batches + kandidaten.
-- Run éénmalig in Dashboard Supabase Studio (NIET in de bots-DB).

create table if not exists ad_batches (
  id                uuid primary key default gen_random_uuid(),
  week_iso          text not null unique,                -- bv. "2026-W19"
  status            text not null default 'generating',  -- generating | ready | reviewed | archived
  total_candidates  int default 0,
  approved_count    int default 0,
  rejected_count    int default 0,
  posted_count      int default 0,
  generation_log    jsonb,
  created_at        timestamptz default now()
);

create table if not exists ad_candidates (
  id                       uuid primary key default gen_random_uuid(),
  batch_id                 uuid not null references ad_batches(id) on delete cascade,
  bots_listing_id          text not null,

  -- Snapshot van listing-data
  project_name             text not null,
  city                     text,
  region                   text,
  price_from               numeric,
  bedrooms_range           text,
  property_type            text,
  hero_photo_url           text,
  source_url               text,

  -- Generated content
  headline                 text,
  primary_text             text,
  description_text         text,

  -- Edited overrides
  edited_headline          text,
  edited_primary_text      text,
  edited_description_text  text,

  -- Output URLs
  canva_ad_url             text,
  brochure_url             text,
  canva_design_id          text,

  -- Workflow
  status                   text not null default 'pending', -- pending | approved | rejected | posted
  rejection_reason         text,
  fb_ad_id                 text,
  posted_at                timestamptz,
  rerender_count           int default 0,
  generation_error         text,

  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create index if not exists idx_ad_candidates_bots_listing on ad_candidates(bots_listing_id);
create index if not exists idx_ad_candidates_batch        on ad_candidates(batch_id);
create index if not exists idx_ad_candidates_status       on ad_candidates(status);
create unique index if not exists idx_ad_candidates_batch_listing
  on ad_candidates(batch_id, bots_listing_id);

alter table ad_batches    enable row level security;
alter table ad_candidates enable row level security;
alter table ad_batches    force row level security;
alter table ad_candidates force row level security;
-- Geen policies = alleen service-role (en bot-cron) kunnen lezen/muteren.

-- updated_at-trigger op ad_candidates.
create or replace function update_updated_at_column()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_ad_candidates_updated_at on ad_candidates;
create trigger trg_ad_candidates_updated_at
  before update on ad_candidates
  for each row execute function update_updated_at_column();

notify pgrst, 'reload schema';
