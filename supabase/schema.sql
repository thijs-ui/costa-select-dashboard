-- =============================================
-- Costa Select Valencia — Database Schema
-- Plak deze volledige inhoud in de Supabase SQL Editor
-- en klik op "Run"
-- =============================================

-- TABEL: settings
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO settings (key, value) VALUES
  ('minimum_fee', '6000'),
  ('makelaar_commissie_pct', '0.40'),
  ('partner_commissie_pct', '0.20'),
  ('commissie_per_type', '{"resale": 0.02, "nieuwbouw": 0.04, "invest": 0.03, "renovatie": 0.05}'),
  ('regios', '["CBN", "CBZ", "CDS", "CD", "CB", "Valencia"]'),
  ('deal_types', '["Resale", "Nieuwbouw", "Invest", "Renovatie"]'),
  ('bronnen', '["Website CS", "Website CSV", "Google Ads", "Meta Ads", "LinkedIn Ads", "Referentie van partner", "Referentie"]'),
  ('afspraak_types', '["Bezichtiging", "Kennismaking", "Follow-up", "Notaris"]'),
  ('targets', '{"deals_2026": 20, "netto_omzet_2026": 200000}'),
  ('pipedrive_sync_interval', '15'),
  ('pipedrive_activiteit_namen', '["afspraak Nederland", "afspraak online"]'),
  ('bron_kostenpost_mapping', '{"Google Ads": "Google Ads", "Meta Ads": "Meta Ads (Facebook/Instagram)", "LinkedIn Ads": "LinkedIn Ads"}')
ON CONFLICT (key) DO NOTHING;

-- TABEL: makelaars
CREATE TABLE IF NOT EXISTS makelaars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT UNIQUE NOT NULL,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO makelaars (naam) VALUES
  ('Thijs Kranenborg'),
  ('Ed Bouterse'),
  ('Danielle de Haan'),
  ('Denise van Scheppingen'),
  ('Marc Stam')
ON CONFLICT (naam) DO NOTHING;

-- TABEL: deals
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_nummer SERIAL,
  datum_passering DATE NOT NULL,
  regio TEXT NOT NULL,
  type_deal TEXT NOT NULL,
  bron TEXT NOT NULL,
  aankoopprijs NUMERIC(12,2) NOT NULL,
  commissie_pct NUMERIC(5,4),
  min_fee_toegepast BOOLEAN DEFAULT false,
  bruto_commissie NUMERIC(10,2),
  makelaar_id UUID REFERENCES makelaars(id),
  makelaar_pct NUMERIC(5,4) DEFAULT 0,
  makelaar_commissie NUMERIC(10,2),
  partner_deal BOOLEAN DEFAULT false,
  partner_naam TEXT,
  partner_pct NUMERIC(5,4) DEFAULT 0,
  partner_commissie NUMERIC(10,2),
  netto_commissie_cs NUMERIC(10,2),
  notities TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABEL: kosten_categorieen
CREATE TABLE IF NOT EXISTS kosten_categorieen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT UNIQUE NOT NULL,
  volgorde INT DEFAULT 0,
  actief BOOLEAN DEFAULT true
);

INSERT INTO kosten_categorieen (naam, volgorde) VALUES
  ('Software', 1),
  ('Marketing & Ads', 2),
  ('Kantoor & faciliteiten', 3),
  ('Reis & transport', 4),
  ('Juridisch & administratie', 5),
  ('Overige kosten', 6)
ON CONFLICT (naam) DO NOTHING;

-- TABEL: kosten_posten
CREATE TABLE IF NOT EXISTS kosten_posten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id UUID REFERENCES kosten_categorieen(id),
  naam TEXT NOT NULL,
  volgorde INT DEFAULT 0,
  actief BOOLEAN DEFAULT true
);

DO $$
DECLARE
  software_id UUID;
  marketing_id UUID;
BEGIN
  SELECT id INTO software_id FROM kosten_categorieen WHERE naam = 'Software';
  SELECT id INTO marketing_id FROM kosten_categorieen WHERE naam = 'Marketing & Ads';

  INSERT INTO kosten_posten (categorie_id, naam, volgorde) VALUES
    (software_id, 'ActiveCampaign', 1),
    (software_id, 'Buffer', 2),
    (software_id, 'Zapier', 3),
    (software_id, 'Slack Pro', 4),
    (software_id, 'Google Workspace', 5),
    (software_id, 'Website hosting', 6),
    (software_id, 'Apify', 7),
    (software_id, 'Manus', 8),
    (software_id, 'Claude', 9),
    (software_id, 'Overige software', 10),
    (marketing_id, 'Google Ads', 1),
    (marketing_id, 'Meta Ads (Facebook/Instagram)', 2),
    (marketing_id, 'LinkedIn Ads', 3),
    (marketing_id, 'Overige marketing', 4);
END $$;

-- TABEL: maandkosten
CREATE TABLE IF NOT EXISTS maandkosten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kosten_post_id UUID REFERENCES kosten_posten(id),
  jaar INT NOT NULL,
  maand INT NOT NULL CHECK (maand BETWEEN 1 AND 12),
  bedrag NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE (kosten_post_id, jaar, maand)
);

-- TABEL: afspraken
CREATE TABLE IF NOT EXISTS afspraken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum DATE NOT NULL,
  lead_naam TEXT NOT NULL,
  bron TEXT,
  regio TEXT,
  makelaar_id UUID REFERENCES makelaars(id),
  type TEXT DEFAULT 'Bezichtiging',
  status TEXT DEFAULT 'Gepland' CHECK (status IN ('Gepland', 'Uitgevoerd', 'No-show', 'Geannuleerd')),
  resultaat TEXT CHECK (resultaat IN (NULL, 'Interesse', 'Bod gedaan', 'Deal gewonnen', 'Afgewezen')),
  deal_id UUID REFERENCES deals(id),
  notities TEXT,
  pipedrive_activiteit_id BIGINT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABEL: bonnen
CREATE TABLE IF NOT EXISTS bonnen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum DATE NOT NULL,
  bedrag NUMERIC(10,2) NOT NULL,
  btw_bedrag NUMERIC(10,2),
  omschrijving TEXT,
  categorie_id UUID REFERENCES kosten_categorieen(id),
  kosten_post_id UUID REFERENCES kosten_posten(id),
  bestandsnaam TEXT NOT NULL,
  bestandspad TEXT NOT NULL,
  bestandstype TEXT,
  bestandsgrootte INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABEL: commissie_uitbetalingen
CREATE TABLE IF NOT EXISTS commissie_uitbetalingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  makelaar_id UUID REFERENCES makelaars(id),
  bedrag NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Uitbetaald')),
  uitbetaald_op DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SEED DATA: Deals uit Excel
-- =============================================
DO $$
DECLARE
  thijs_id UUID;
  ed_id UUID;
BEGIN
  SELECT id INTO thijs_id FROM makelaars WHERE naam = 'Thijs Kranenborg';
  SELECT id INTO ed_id FROM makelaars WHERE naam = 'Ed Bouterse';

  -- Deal 1: CBZ, Resale, Torrevieja (min fee toegepast: 230000 * 1.5% = 3450 < 6000)
  INSERT INTO deals (datum_passering, regio, type_deal, bron, aankoopprijs, commissie_pct,
    min_fee_toegepast, bruto_commissie, makelaar_id, makelaar_pct, makelaar_commissie,
    partner_deal, partner_pct, partner_commissie, netto_commissie_cs, notities)
  VALUES ('2026-03-02', 'CBZ', 'Resale', 'Referentie van partner', 230000, 0.015,
    true, 6000, thijs_id, 0, 0, false, 0, 0, 6000, 'Torrevieja');

  -- Deal 2: Valencia, Invest, WeVLC (min fee toegepast: 319500 * 3% = 9585 > 6000, maar spec zegt min fee ja)
  INSERT INTO deals (datum_passering, regio, type_deal, bron, aankoopprijs, commissie_pct,
    min_fee_toegepast, bruto_commissie, makelaar_id, makelaar_pct, makelaar_commissie,
    partner_deal, partner_pct, partner_commissie, netto_commissie_cs, notities)
  VALUES ('2026-03-10', 'Valencia', 'Invest', 'Referentie van partner', 319500, 0.03,
    true, 6000, thijs_id, 0, 0, false, 0, 0, 6000, 'WeVLC');

  -- Deal 3: CBN, Resale, Benidorm (min fee: 395000 * 1.5% = 5925 < 6000)
  INSERT INTO deals (datum_passering, regio, type_deal, bron, aankoopprijs, commissie_pct,
    min_fee_toegepast, bruto_commissie, makelaar_id, makelaar_pct, makelaar_commissie,
    partner_deal, partner_pct, partner_commissie, netto_commissie_cs, notities)
  VALUES ('2026-03-10', 'CBN', 'Resale', 'Website CS', 395000, 0.015,
    true, 6000, thijs_id, 0, 0, false, 0, 0, 6000, 'Benidorm');

  -- Deal 4: Valencia, Renovatie (30000 * 5% = 1500 < 6000 → min fee NIET toegepast per spec)
  INSERT INTO deals (datum_passering, regio, type_deal, bron, aankoopprijs, commissie_pct,
    min_fee_toegepast, bruto_commissie, makelaar_id, makelaar_pct, makelaar_commissie,
    partner_deal, partner_pct, partner_commissie, netto_commissie_cs, notities)
  VALUES ('2026-01-04', 'Valencia', 'Renovatie', 'Website CSV', 30000, 0.05,
    false, 1500, thijs_id, 0, 0, false, 0, 0, 1500, 'Saman Reformas, Burjassot');

  -- Deal 5: CDS, Nieuwbouw, Sunny Golf (390000 * 6% = 23400, Ed 40% = 9360)
  INSERT INTO deals (datum_passering, regio, type_deal, bron, aankoopprijs, commissie_pct,
    min_fee_toegepast, bruto_commissie, makelaar_id, makelaar_pct, makelaar_commissie,
    partner_deal, partner_pct, partner_commissie, netto_commissie_cs, notities)
  VALUES ('2026-05-20', 'CDS', 'Nieuwbouw', 'Website CS', 390000, 0.06,
    false, 23400, ed_id, 0.40, 9360, false, 0, 0, 14040, 'Sunny Golf');
END $$;

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE makelaars ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosten_categorieen ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosten_posten ENABLE ROW LEVEL SECURITY;
ALTER TABLE maandkosten ENABLE ROW LEVEL SECURITY;
ALTER TABLE afspraken ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonnen ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissie_uitbetalingen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON settings             FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON makelaars            FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON deals                FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON kosten_categorieen   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON kosten_posten        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON maandkosten          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON afspraken            FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON bonnen               FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON commissie_uitbetalingen FOR ALL TO anon USING (true) WITH CHECK (true);
