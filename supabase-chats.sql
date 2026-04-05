-- =============================================================
-- Woningbot: Chat geschiedenis
-- Draai dit script in je Supabase SQL Editor (Dashboard project)
-- =============================================================

create table if not exists public.web_chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  session_id text not null,
  title text not null default 'Nieuwe chat',
  messages jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists web_chats_user_idx on public.web_chats (user_id, updated_at desc);
create index if not exists web_chats_session_idx on public.web_chats (session_id);

alter table public.web_chats enable row level security;

create policy "Users can read own chats"
  on public.web_chats for select
  using (auth.uid() = user_id);

create policy "Users can insert own chats"
  on public.web_chats for insert
  with check (auth.uid() = user_id);

create policy "Users can update own chats"
  on public.web_chats for update
  using (auth.uid() = user_id);

create policy "Users can delete own chats"
  on public.web_chats for delete
  using (auth.uid() = user_id);
