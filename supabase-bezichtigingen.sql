create table if not exists public.viewing_trips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  client_name text not null,
  client_email text,
  client_phone text,
  trip_date date not null,
  start_time time not null default '09:00',
  start_address text,
  lunch_time time not null default '13:00',
  lunch_duration_minutes integer not null default 60,
  notes text,
  route_data jsonb,
  status text not null default 'concept' check (status in ('concept', 'gepland', 'afgerond'))
);

create index if not exists idx_viewing_trips_date on public.viewing_trips (trip_date desc);

alter table public.viewing_trips enable row level security;

create policy "viewing_trips_all" on public.viewing_trips for all using (true) with check (true);

create table if not exists public.viewing_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.viewing_trips(id) on delete cascade,
  sort_order integer not null default 0,
  dossier_id uuid,
  address text not null,
  property_title text,
  listing_url text,
  price numeric,
  viewing_duration_minutes integer not null default 30,
  contact_name text,
  contact_phone text,
  notes text,
  travel_time_minutes integer,
  estimated_arrival time,
  lat numeric,
  lng numeric
);

create index if not exists idx_viewing_stops_trip on public.viewing_stops (trip_id, sort_order);

alter table public.viewing_stops enable row level security;

create policy "viewing_stops_all" on public.viewing_stops for all using (true) with check (true);
