-- =============================================
-- RLS AANSCHERPING: oudere tabellen
-- Strategie: blokkeer anon, authenticated krijgt toegang
-- Service_role bypast RLS automatisch (API routes)
-- =============================================

-- ─── DEALS ────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON deals;
DROP POLICY IF EXISTS "deals_all" ON deals;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON deals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── MAKELAARS ────────────────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON makelaars;
DROP POLICY IF EXISTS "makelaars_all" ON makelaars;
ALTER TABLE makelaars ENABLE ROW LEVEL SECURITY;
ALTER TABLE makelaars FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON makelaars FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── SETTINGS ─────────────────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON settings;
DROP POLICY IF EXISTS "settings_all" ON settings;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── KOSTEN_CATEGORIEEN ──────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON kosten_categorieen;
DROP POLICY IF EXISTS "kosten_categorieen_all" ON kosten_categorieen;
ALTER TABLE kosten_categorieen ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosten_categorieen FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON kosten_categorieen FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── KOSTEN_POSTEN ───────────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON kosten_posten;
DROP POLICY IF EXISTS "kosten_posten_all" ON kosten_posten;
ALTER TABLE kosten_posten ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosten_posten FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON kosten_posten FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── BONNEN ──────────────────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON bonnen;
DROP POLICY IF EXISTS "bonnen_all" ON bonnen;
ALTER TABLE bonnen ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonnen FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON bonnen FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── AFSPRAKEN ───────────────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON afspraken;
DROP POLICY IF EXISTS "afspraken_all" ON afspraken;
ALTER TABLE afspraken ENABLE ROW LEVEL SECURITY;
ALTER TABLE afspraken FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON afspraken FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── DOSSIER_HISTORY ─────────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON dossier_history;
DROP POLICY IF EXISTS "dossier_history_all" ON dossier_history;
ALTER TABLE dossier_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_history FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON dossier_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── SHORTLISTS ──────────────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON shortlists;
DROP POLICY IF EXISTS "shortlists_all" ON shortlists;
ALTER TABLE shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlists FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON shortlists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── SHORTLIST_ITEMS ─────────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON shortlist_items;
DROP POLICY IF EXISTS "shortlist_items_all" ON shortlist_items;
ALTER TABLE shortlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlist_items FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON shortlist_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── USER_ROLES ──────────────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON user_roles;
DROP POLICY IF EXISTS "user_roles_all" ON user_roles;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_own_update" ON user_roles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── WEB_CHATS ───────────────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON web_chats;
DROP POLICY IF EXISTS "web_chats_all" ON web_chats;
ALTER TABLE web_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_chats FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_own" ON web_chats FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── KB_CHUNKS ───────────────────────────────────────
DROP POLICY IF EXISTS "anon_all" ON kb_chunks;
DROP POLICY IF EXISTS "kb_chunks_all" ON kb_chunks;
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON kb_chunks FOR SELECT TO authenticated USING (true);

-- ─── REGIONAL_SETTINGS ──────────────────────────────
-- Herschrijf: blokkeer anon, alleen authenticated
DROP POLICY IF EXISTS "regional_settings_all" ON regional_settings;
ALTER TABLE regional_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON regional_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── VIEWING_TRIPS ──────────────────────────────────
DROP POLICY IF EXISTS "viewing_trips_all" ON viewing_trips;
ALTER TABLE viewing_trips FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON viewing_trips FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── VIEWING_STOPS ──────────────────────────────────
DROP POLICY IF EXISTS "viewing_stops_all" ON viewing_stops;
ALTER TABLE viewing_stops FORCE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON viewing_stops FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── TODOS ──────────────────────────────────────────
-- Todos heeft al goede policies (admins_full_access, consultants_select, etc.)
-- Alleen FORCE toevoegen zodat zelfs de tabel-owner gebonden is aan RLS
ALTER TABLE todos FORCE ROW LEVEL SECURITY;
