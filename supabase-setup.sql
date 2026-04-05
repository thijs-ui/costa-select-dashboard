-- =============================================================
-- Costa Select Platform: User Roles Setup
-- Draai dit script in je Supabase SQL Editor
-- =============================================================

-- 1. Maak de user_roles tabel
create table if not exists public.user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'consultant' check (role in ('admin', 'consultant')),
  created_at timestamptz default now(),
  unique(user_id)
);

-- 2. Row Level Security aanzetten
alter table public.user_roles enable row level security;

-- 3. Gebruikers mogen hun eigen rol lezen
create policy "Users can read own role"
  on public.user_roles
  for select
  using (auth.uid() = user_id);

-- 4. Alleen service role kan rollen aanmaken/wijzigen
-- (dit gebeurt via de Supabase dashboard of service key)

-- =============================================================
-- NA HET DRAAIEN VAN DIT SCRIPT:
--
-- 1. Ga naar Authentication > Users in je Supabase dashboard
-- 2. Maak gebruikers aan met email + wachtwoord
-- 3. Voeg voor elke admin-gebruiker een rij toe:
--
--    INSERT INTO public.user_roles (user_id, role)
--    VALUES ('<user-id-van-supabase>', 'admin');
--
-- Consultants krijgen automatisch de 'consultant' rol
-- (default in de auth-context als er geen rij bestaat)
-- =============================================================
