-- Voeg region-kolom toe aan listings (Bots Supabase project sqafsrknbfzhkbxqhqlu)
-- Voer uit op de Bots Supabase, NIET op het dashboard-Supabase project.

alter table public.listings
  add column if not exists region text;

create index if not exists idx_listings_region
  on public.listings(region);

-- Backfill bestaande listings o.b.v. property province + lookup tabel.
-- Eerst alleen de paar regio's die we vóór de uitbreiding hadden.
update public.listings set region = 'Costa del Sol' where region is null and province = 'Málaga';
update public.listings set region = 'Costa Blanca Noord'
  where region is null and province = 'Alicante'
    and municipality in (
      'Dénia','Jávea','Calpe','Moraira','Benitachell','Benissa','Teulada',
      'Els Poblets','Pego','Altea','La Nucia','Polop','Finestrat',
      'Alfaz del Pi','Benidorm','Villajoyosa','Xàbia','Teulada-Moraira'
    );
update public.listings set region = 'Costa Blanca Zuid'
  where region is null and province = 'Alicante'
    and municipality in (
      'Alicante','Elche','Elx','Santa Pola','Guardamar del Segura',
      'Torrevieja','Orihuela','San Miguel de Salinas','Algorfa',
      'Los Montesinos','Rojales','Pilar de la Horadada','San Fulgencio'
    );
update public.listings set region = 'Costa Cálida' where region is null and province = 'Murcia';
update public.listings set region = 'Valencia'     where region is null and province = 'Valencia';

-- Edge cases: nog onbekend → kijk naar property province voor laatste fallback.
-- (Listings zonder match houden region=null, dat is OK; volgende scrape stempelt 'm).
