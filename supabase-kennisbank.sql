-- =============================================================
-- Kennisbank: Chunks tabel voor RAG zoekfunctie
-- Draai dit script in je Supabase SQL Editor
-- =============================================================

-- 1. Maak de chunks tabel
create table if not exists public.kb_chunks (
  id bigint generated always as identity primary key,
  doc_slug text not null,
  doc_code text not null,
  doc_title text not null,
  doc_category text not null,
  chunk_index int not null,
  heading text,
  content text not null,
  fts tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(doc_title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(heading, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'C')
  ) stored
);

-- 2. Full-text search index
create index if not exists kb_chunks_fts_idx on public.kb_chunks using gin (fts);

-- 3. Index op doc_slug voor snelle lookups
create index if not exists kb_chunks_slug_idx on public.kb_chunks (doc_slug);

-- 4. RLS aanzetten + leesbeleid
alter table public.kb_chunks enable row level security;

create policy "Authenticated users can read chunks"
  on public.kb_chunks
  for select
  to authenticated
  using (true);

-- 5. Zoekfunctie
create or replace function search_kb(query text, match_count int default 10)
returns table (
  id bigint,
  doc_slug text,
  doc_code text,
  doc_title text,
  doc_category text,
  heading text,
  content text,
  rank real
)
language sql stable
as $$
  select
    kb.id,
    kb.doc_slug,
    kb.doc_code,
    kb.doc_title,
    kb.doc_category,
    kb.heading,
    kb.content,
    ts_rank(kb.fts, websearch_to_tsquery('simple', query)) as rank
  from public.kb_chunks kb
  where kb.fts @@ websearch_to_tsquery('simple', query)
  order by rank desc
  limit match_count;
$$;
