-- ============================================
-- To-do tabel voor Costa Select Dashboard
-- ============================================

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  assigned_to uuid not null references auth.users(id) on delete cascade,
  description text not null,
  deadline date,
  status text not null default 'open' check (status in ('open', 'afgerond')),
  completed_at timestamptz
);

-- Index voor snelle queries op assigned_to + status
create index if not exists idx_todos_assigned_status on public.todos (assigned_to, status);

-- RLS inschakelen
alter table public.todos enable row level security;

-- ============================================
-- RLS Policies
-- ============================================

-- Admins: volledige toegang tot alle todos
create policy "admins_full_access" on public.todos
  for all
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  );

-- Consultants: kunnen todos ZIEN die aan hen zijn toegewezen OF die zij hebben aangemaakt
create policy "consultants_select" on public.todos
  for select
  using (
    assigned_to = auth.uid() or created_by = auth.uid()
  );

-- Consultants: kunnen eigen todos AANMAKEN (assigned_to moet zichzelf zijn)
create policy "consultants_insert" on public.todos
  for insert
  with check (
    created_by = auth.uid() and assigned_to = auth.uid()
  );

-- Consultants: kunnen alleen status updaten van todos die aan hen zijn toegewezen
create policy "consultants_update_status" on public.todos
  for update
  using (
    assigned_to = auth.uid()
  )
  with check (
    assigned_to = auth.uid()
  );

-- Consultants mogen NIET verwijderen (alleen admins via admins_full_access)
