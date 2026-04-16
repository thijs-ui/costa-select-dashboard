-- =============================================================================
-- RLS PHASE 1 — DROP ANON-POLICIES
-- =============================================================================
--
-- Doel: stop dat de publieke anon-key lees/schrijf-toegang geeft tot
-- interne tabellen. Na deze migratie kan niemand zonder login nog data
-- ophalen of muteren.
--
-- Wat deze migratie NIET doet:
--   - `authenticated_full_access` aanpakken (= Fase 2: role/ownership-based)
--   - Application code wijzigen
--
-- Uitvoer: plak in Supabase → SQL Editor → Run.
-- Alle DROPs zijn idempotent (IF EXISTS) — veilig meerdere keren draaien.
--
-- Rollback: als iets breekt, voer het omgekeerde `CREATE POLICY ... anon_full
-- FOR ALL TO anon USING (true) WITH CHECK (true);` uit op de betreffende tabel.
-- Maar doe dat alleen als je écht zeker weet dat een feature anon nodig heeft.
-- =============================================================================


-- ─── STAP 1: CRITICAL — user_roles ────────────────────────────────────────────
-- Anon kon letterlijk rijen hier schrijven/updaten = iedereen admin maken.
-- Eerst en zelfstandig, zodat dit nooit vergeten wordt.
DROP POLICY IF EXISTS "anon_full" ON user_roles;


-- ─── STAP 2: Financiële tabellen ──────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_delete" ON deals;
DROP POLICY IF EXISTS "anon_read"   ON deals;
DROP POLICY IF EXISTS "anon_update" ON deals;
DROP POLICY IF EXISTS "anon_write"  ON deals;

DROP POLICY IF EXISTS "anon_full"   ON bonnen;

DROP POLICY IF EXISTS "anon_all"    ON commissie_uitbetalingen;
DROP POLICY IF EXISTS "anon_all"    ON werving_bonussen;
DROP POLICY IF EXISTS "anon_all"    ON maandkosten;

DROP POLICY IF EXISTS "anon_full"   ON kosten_categorieen;
DROP POLICY IF EXISTS "anon_full"   ON kosten_posten;


-- ─── STAP 3: Klant/deal operaties ─────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_delete" ON afspraken;
DROP POLICY IF EXISTS "anon_read"   ON afspraken;
DROP POLICY IF EXISTS "anon_update" ON afspraken;
DROP POLICY IF EXISTS "anon_write"  ON afspraken;

DROP POLICY IF EXISTS "anon_full"   ON dossier_history;
DROP POLICY IF EXISTS "anon_full"   ON shortlists;
DROP POLICY IF EXISTS "anon_full"   ON shortlist_items;


-- ─── STAP 4: Organisatie-tabellen ─────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_full"       ON makelaars;
DROP POLICY IF EXISTS "anon_partners"   ON partners;
DROP POLICY IF EXISTS "anon_full"       ON projects;
DROP POLICY IF EXISTS "anon_full"       ON project_phases;
DROP POLICY IF EXISTS "anon_full"       ON marketing_content;


-- ─── STAP 5: Config tabellen ──────────────────────────────────────────────────
-- `settings` had zelfs drie losse publieke policies.
DROP POLICY IF EXISTS "anon_full"               ON settings;
DROP POLICY IF EXISTS "public read settings"    ON settings;
DROP POLICY IF EXISTS "public update settings"  ON settings;
DROP POLICY IF EXISTS "public write settings"   ON settings;


-- ─── STAP 6: Kennisbank ───────────────────────────────────────────────────────
-- kb_chunks heeft al een `authenticated_read` policy, dus anon droppen is veilig.
DROP POLICY IF EXISTS "anon_full" ON kb_chunks;


-- ─── STAP 7: web_chats — drop anon + HERBEVESTIG user-owned policies ─────────
-- web_chats heeft (mogelijk) al user-owned policies uit supabase-web-chats-rls.sql.
-- Om idempotent te zijn droppen we ze eerst en zetten ze daarna opnieuw.
DROP POLICY IF EXISTS "anon_full" ON web_chats;

DROP POLICY IF EXISTS "Users can read own chats"   ON web_chats;
DROP POLICY IF EXISTS "Users can insert own chats" ON web_chats;
DROP POLICY IF EXISTS "Users can update own chats" ON web_chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON web_chats;

CREATE POLICY "Users can read own chats"
  ON web_chats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats"
  ON web_chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats"
  ON web_chats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats"
  ON web_chats FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- =============================================================================
-- VERIFICATIE — run deze query NA bovenstaande om te bevestigen
-- =============================================================================
--
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (policyname LIKE '%anon%' OR policyname LIKE 'public %')
-- ORDER BY tablename;
--
-- Verwacht: 0 rijen (geen enkele anon-policy meer).
-- =============================================================================
