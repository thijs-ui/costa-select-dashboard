-- Stap 3: nieuwe kolommen op ad_candidates voor de copy-generator.
-- Run in Dashboard Supabase Studio.

alter table public.ad_candidates
  add column if not exists fb_headline                    text,
  add column if not exists fb_primary_text_simple         text,
  add column if not exists fb_primary_text_variant        text,
  add column if not exists creative_project_name          text,
  add column if not exists creative_price                 text,
  add column if not exists creative_description           text,
  add column if not exists edited_fb_primary_text_simple  text,
  add column if not exists edited_fb_primary_text_variant text,
  add column if not exists edited_creative_description    text,
  add column if not exists selected_variant               text default 'simple';

-- Oude kolommen (headline/primary_text/description_text) blijven nullable
-- voor backwards-compat met de stap-1 test-route.

notify pgrst, 'reload schema';
