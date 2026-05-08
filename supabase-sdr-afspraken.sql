-- SDR-koppeling op afspraken-tabel.
-- Run in Supabase Studio (Costa Select Dashboard project).
--
-- Nieuwe kolom sdr_id verwijst naar makelaars.id en bewaart welke SDR de
-- klant gesproken heeft vóór de afspraak. Toewijzing gebeurt EXCLUSIEF
-- handmatig via het afspraken-formulier — geen heuristiek of backfill.
-- Bestaande rijen blijven null (geen SDR-contact).

alter table afspraken
  add column if not exists sdr_id uuid references makelaars(id) on delete set null;

-- Index voor de SDR-stats query op /dashboard/makelaars (filter op sdr_id +
-- datum-range). Laag-cost; afspraken-tabel is niet groot.
create index if not exists afspraken_sdr_id_idx on afspraken(sdr_id);
