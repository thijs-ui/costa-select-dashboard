-- Centrale tabel voor OAuth refresh-tokens van externe providers (Canva,
-- mogelijk later anderen). Single-row-per-provider via PRIMARY KEY.
-- Run in Supabase Studio (dashboard project).

create table if not exists oauth_tokens (
  provider      text primary key,
  refresh_token text not null,
  updated_at    timestamptz default now()
);

-- Service-role schrijft/leest. Geen UI-toegang nodig — RLS strikt:
-- alleen service-role kan deze tabel lezen of muteren.
alter table oauth_tokens enable row level security;
alter table oauth_tokens force row level security;

-- Geen policies = geen authenticated/anon toegang. Service-role
-- omzeilt RLS sowieso, dus de routes blijven werken.
