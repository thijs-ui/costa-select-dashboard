-- Dossier geschiedenis tabel
-- Voer dit uit in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS dossier_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  adres TEXT NOT NULL,
  regio TEXT,
  type TEXT,
  vraagprijs DECIMAL,
  url TEXT,
  dossier_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_dossier_history_created_at ON dossier_history(created_at DESC);
