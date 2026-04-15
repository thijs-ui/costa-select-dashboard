-- Projecten
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text,
  owner_id uuid references auth.users(id) on delete set null,
  target_date date,
  status text not null default 'actief' check (status in ('actief', 'on hold', 'afgerond')),
  sort_order integer not null default 0,
  color text not null default '#0EAE96',
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.projects force row level security;
create policy "authenticated_full_access" on public.projects for all to authenticated using (true) with check (true);
create policy "anon_full" on public.projects for all to anon using (true) with check (true);

-- Fases
create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.project_phases enable row level security;
alter table public.project_phases force row level security;
create policy "authenticated_full_access" on public.project_phases for all to authenticated using (true) with check (true);
create policy "anon_full" on public.project_phases for all to anon using (true) with check (true);

-- Todos uitbreiden
alter table public.todos add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.todos add column if not exists phase_id uuid references public.project_phases(id) on delete set null;
alter table public.todos add column if not exists is_week_focus boolean not null default false;
alter table public.todos add column if not exists week_focus_date date;
