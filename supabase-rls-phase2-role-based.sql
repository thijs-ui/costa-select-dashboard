-- =============================================================================
-- RLS PHASE 2 — ROLE- EN OWNERSHIP-BASED POLICIES
-- =============================================================================
--
-- Vervangt de `authenticated_full_access` / `authenticated_all` / `authenticated_partners`
-- policies (die iedere ingelogde user álles laten zien) door:
--
--   GROEP A — admin-only     (16 tabellen)
--   GROEP B — user-owned     (5 tabellen, admin kan alles)
--   GROEP C — user_roles tightening (self-read only)
--
-- Patroon voor admin-only, consistent met `todos.admins_full_access` dat al bestond:
--
--   USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
--
-- Patroon voor user-owned (eigenaar OF admin):
--
--   USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
--
-- Alle DROPs zijn idempotent (IF EXISTS). Veilig meerdere keren draaien.
-- =============================================================================


-- ============================================================================
-- GROEP A — ADMIN-ONLY TABELLEN
-- ============================================================================

-- ─── afspraken ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all"         ON afspraken;
DROP POLICY IF EXISTS "authenticated_full_access" ON afspraken;
CREATE POLICY "admin_full_access" ON afspraken
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── agencies ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_full_access" ON agencies;
CREATE POLICY "admin_full_access" ON agencies
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── bonnen ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all"         ON bonnen;
DROP POLICY IF EXISTS "authenticated_full_access" ON bonnen;
CREATE POLICY "admin_full_access" ON bonnen
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── commissie_uitbetalingen ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all" ON commissie_uitbetalingen;
CREATE POLICY "admin_full_access" ON commissie_uitbetalingen
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── deals ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all"         ON deals;
DROP POLICY IF EXISTS "authenticated_full_access" ON deals;
CREATE POLICY "admin_full_access" ON deals
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── kosten_categorieen ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all"         ON kosten_categorieen;
DROP POLICY IF EXISTS "authenticated_full_access" ON kosten_categorieen;
CREATE POLICY "admin_full_access" ON kosten_categorieen
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── kosten_posten ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all"         ON kosten_posten;
DROP POLICY IF EXISTS "authenticated_full_access" ON kosten_posten;
CREATE POLICY "admin_full_access" ON kosten_posten
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── maandkosten ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all" ON maandkosten;
CREATE POLICY "admin_full_access" ON maandkosten
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── makelaars ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all"         ON makelaars;
DROP POLICY IF EXISTS "authenticated_full_access" ON makelaars;
CREATE POLICY "admin_full_access" ON makelaars
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── marketing_content ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_full_access" ON marketing_content;
CREATE POLICY "admin_full_access" ON marketing_content
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── partners ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_partners" ON partners;
CREATE POLICY "admin_full_access" ON partners
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── projects ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_full_access" ON projects;
CREATE POLICY "admin_full_access" ON projects
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── project_phases ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_full_access" ON project_phases;
CREATE POLICY "admin_full_access" ON project_phases
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── regional_settings ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_full_access" ON regional_settings;
CREATE POLICY "admin_full_access" ON regional_settings
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── settings ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all"         ON settings;
DROP POLICY IF EXISTS "authenticated_full_access" ON settings;
CREATE POLICY "admin_full_access" ON settings
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));


-- ============================================================================
-- GROEP B — USER-OWNED TABELLEN (eigenaar of admin)
-- ============================================================================

-- ─── dossier_history ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_full_access" ON dossier_history;
CREATE POLICY "owner_or_admin" ON dossier_history
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ─── shortlists ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_full_access" ON shortlists;
CREATE POLICY "owner_or_admin" ON shortlists
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ─── shortlist_items (owned via shortlists.created_by) ───────────────────────
DROP POLICY IF EXISTS "authenticated_full_access" ON shortlist_items;
CREATE POLICY "owner_or_admin" ON shortlist_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shortlists
      WHERE shortlists.id = shortlist_items.shortlist_id
        AND shortlists.created_by = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shortlists
      WHERE shortlists.id = shortlist_items.shortlist_id
        AND shortlists.created_by = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ─── viewing_trips ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_full_access" ON viewing_trips;
CREATE POLICY "owner_or_admin" ON viewing_trips
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ─── viewing_stops (owned via viewing_trips.created_by) ──────────────────────
DROP POLICY IF EXISTS "authenticated_full_access" ON viewing_stops;
CREATE POLICY "owner_or_admin" ON viewing_stops
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM viewing_trips
      WHERE viewing_trips.id = viewing_stops.trip_id
        AND viewing_trips.created_by = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM viewing_trips
      WHERE viewing_trips.id = viewing_stops.trip_id
        AND viewing_trips.created_by = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );


-- ============================================================================
-- GROEP C — USER_ROLES TIGHTENING
-- ============================================================================
-- Was: authenticated_read met qual=true (iedereen zag álle rollen).
-- Nu: user leest alleen eigen rol. Admin-lookups van andere users gaan
-- voortaan via service-client in API-routes (bypasst RLS).

DROP POLICY IF EXISTS "authenticated_read" ON user_roles;
CREATE POLICY "read_own_role" ON user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());


-- =============================================================================
-- VERIFICATIE (run ná bovenstaande)
-- =============================================================================
--
-- 1. Zoek naar policies die iedereen alles geven (zou 0 rijen moeten zijn):
--
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND qual = 'true'
--   AND tablename NOT IN ('kb_chunks');   -- kb_chunks mag open-read zijn
--
-- 2. Controleer dat elke admin-tabel een admin_full_access policy heeft:
--
-- SELECT tablename FROM pg_policies
-- WHERE schemaname = 'public' AND policyname = 'admin_full_access'
-- ORDER BY tablename;
--
-- Verwacht: 16 rijen (afspraken, agencies, bonnen, commissie_uitbetalingen,
-- deals, kosten_categorieen, kosten_posten, maandkosten, makelaars,
-- marketing_content, partners, project_phases, projects, regional_settings,
-- settings).  Let op: dit is 15 namen + todos? Todos heeft z'n eigen
-- `admins_full_access` (let op onderstreepje). Die blijft.
-- =============================================================================
