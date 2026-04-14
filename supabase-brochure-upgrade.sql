alter table public.dossier_history add column if not exists brochure_type text not null default 'pitch';
alter table public.dossier_history add column if not exists pitch_content jsonb;
alter table public.dossier_history add column if not exists pitch_generated_at timestamptz;
