create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  region text not null,
  city text,
  contact_name text,
  contact_phone text,
  contact_email text,
  website text,
  property_types text[],
  commission_notes text,
  reliability_score integer check (reliability_score between 1 and 5),
  notes text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists idx_agencies_region on public.agencies (region);
create index if not exists idx_agencies_active on public.agencies (is_active);

alter table public.agencies enable row level security;
alter table public.agencies force row level security;
create policy "authenticated_full_access" on public.agencies for all to authenticated using (true) with check (true);
