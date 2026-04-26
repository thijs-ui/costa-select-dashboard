-- =============================================================
-- Woningbot: Query observability logs (Sprint 0)
-- Draai dit script in je Supabase SQL Editor (Dashboard project)
--
-- Doel: één rij per /api/chat call op de woningbot, met per-stap timing
-- en fout-info zodat we kunnen zien WAT er stuk gaat voordat we fixen.
-- =============================================================

create table if not exists public.woningbot_query_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,

  -- request
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  user_message text not null,
  intent text,                         -- "zoekwoning" | "nieuwbouw" | "vergelijk" | etc.

  -- outcome
  status text not null,                -- "success" | "no_results" | "parse_error"
                                       -- | "scrape_error" | "selector_error" | "exception"
  error_message text,
  total_ms integer not null,

  -- per-stap timings + counts (zie woningbot/src/services/query-logger.js voor shape)
  steps jsonb not null default '{}',

  -- aggregaties die makkelijk in queries zijn
  selected_count integer,
  total_found integer,

  -- environment context
  source text default 'web'            -- "web" | "slack"
);

create index if not exists woningbot_logs_created_idx
  on public.woningbot_query_logs (created_at desc);
create index if not exists woningbot_logs_status_idx
  on public.woningbot_query_logs (status, created_at desc);
create index if not exists woningbot_logs_intent_idx
  on public.woningbot_query_logs (intent, created_at desc);
create index if not exists woningbot_logs_user_idx
  on public.woningbot_query_logs (user_id, created_at desc);

-- RLS: alleen admins lezen, alleen service-role schrijft.
alter table public.woningbot_query_logs enable row level security;

create policy "Admins can read all woningbot logs"
  on public.woningbot_query_logs for select
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );

-- Service-role bypasst RLS automatisch — geen INSERT-policy nodig
-- voor de api-route, die gebruikt service-client.
