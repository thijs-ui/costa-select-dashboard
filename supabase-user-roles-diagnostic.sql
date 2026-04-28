-- =============================================================================
-- DIAGNOSTIC: user_roles browser-client query hangt 5s+
-- =============================================================================
-- Achtergrond: vanuit de browser-client hangt
--   supabase.from('user_roles').select('role,naam').eq('user_id', uid).single()
-- structureel >5 seconden (zie auth-context console-logs).
-- /api/users/me via service-key werkt wel (sub-100ms).
--
-- Run query 1 t/m 5 hieronder in Supabase Dashboard SQL Editor en
-- plak de resultaten zodat we de root-cause kunnen lokaliseren.
-- =============================================================================


-- 1. Alle policies op user_roles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_roles';


-- 2. Indexen op user_roles
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_roles';


-- 3. Hoeveel rijen heeft user_roles?
SELECT count(*) FROM user_roles;


-- 4. Plan + tijd voor de query die hangt
-- (run dit als ingelogde gebruiker via SQL Editor — pas user_id aan naar je eigen UUID)
EXPLAIN (ANALYZE, BUFFERS)
SELECT role, naam
FROM user_roles
WHERE user_id = '5c9bb82d-0563-430e-95c6-cd583f5ca0f3'
LIMIT 1;


-- 5. Zijn er actieve locks op user_roles?
SELECT pid, mode, granted, query
FROM pg_locks l
JOIN pg_stat_activity a USING (pid)
WHERE relation = 'user_roles'::regclass;


-- =============================================================================
-- WAARSCHIJNLIJKE FIXES (voer pas uit ná diagnose)
-- =============================================================================

-- A. Index ontbreekt? (fix als query 2 geen index op user_id liet zien)
-- CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles (user_id);

-- B. Policy doet recursive lookup? (fix met simpele self-check)
-- DROP POLICY IF EXISTS "read_own_role" ON user_roles;
-- CREATE POLICY "read_own_role" ON user_roles
--   FOR SELECT TO authenticated
--   USING (user_id = (SELECT auth.uid()));   -- subquery is sneller dan direct auth.uid() bij grote tabellen
