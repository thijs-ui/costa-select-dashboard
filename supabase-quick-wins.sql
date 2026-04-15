alter table public.dossier_history add column if not exists financial_data jsonb;
alter table public.dossier_history add column if not exists internal_notes text;
alter table public.shortlist_items add column if not exists is_favorite boolean not null default false;
