-- Fase 3 — RLS cleanup na policy-scan (2026-04-18)
--
-- Scan resultaten:
--   * `afhandeling_data` had RLS UIT (volledig open) — nu dicht, admin-only
--   * `kb_chunks` had twee duplicate SELECT-policies — één gedropt
--
-- Achtergrond: zie memory/security_refactor_status.md.

-- ─── afhandeling_data ─────────────────────────────────────────────────
-- Pipedrive "afhandeling"-pipeline data. Alleen admin-pagina's
-- (/regios, /funnel) gebruiken deze tabel; admin-only is voldoende.
-- `admin_full_access` policy bestond al maar werd genegeerd omdat RLS
-- uit stond. Alleen RLS aanzetten volstaat.

ALTER TABLE afhandeling_data ENABLE ROW LEVEL SECURITY;

-- ─── kb_chunks dedupe ─────────────────────────────────────────────────
-- Twee identieke SELECT-policies bestonden. Houden: `authenticated_read`.
-- Droppen: `Authenticated users can read chunks` (duplicate).

DROP POLICY IF EXISTS "Authenticated users can read chunks" ON kb_chunks;
