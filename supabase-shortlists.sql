-- Shortlists (woninglijsten) tabellen
-- Voer dit uit in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS shortlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  klant_naam TEXT NOT NULL,
  notities TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shortlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shortlist_id UUID NOT NULL REFERENCES shortlists(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  url TEXT DEFAULT '',
  price DECIMAL,
  location TEXT DEFAULT '',
  bedrooms INT,
  bathrooms INT,
  size_m2 INT,
  thumbnail TEXT,
  source TEXT DEFAULT '',
  notities TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shortlists_created_by ON shortlists(created_by);
CREATE INDEX IF NOT EXISTS idx_shortlists_updated_at ON shortlists(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_shortlist_items_shortlist_id ON shortlist_items(shortlist_id);
