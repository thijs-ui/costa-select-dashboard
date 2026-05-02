-- News-pipeline routing-uitbreiding (fase 6).
-- Voeg slack_channel + audience_invest + impact_score toe aan news_items,
-- plus een view voor de top items van afgelopen week.
--
-- Run in Supabase Studio SQL editor van het DASHBOARD project (snbydgmpncboqyucpwni),
-- NIET het Bots-project.

ALTER TABLE public.news_items
  ADD COLUMN IF NOT EXISTS slack_channel TEXT
    CHECK (slack_channel IN (
      'algemeen', 'spanje', 'valencia',
      'costa_blanca_noord', 'costa_blanca_zuid',
      'costa_brava', 'costa_calida', 'costa_del_sol', 'costa_dorada',
      'invest', 'marketing_ideeen'
    )),
  ADD COLUMN IF NOT EXISTS audience_invest BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS impact_score NUMERIC;

CREATE INDEX IF NOT EXISTS idx_news_items_slack_channel
  ON public.news_items (slack_channel);

CREATE INDEX IF NOT EXISTS idx_news_items_audience_invest
  ON public.news_items (audience_invest)
  WHERE audience_invest = TRUE;

CREATE INDEX IF NOT EXISTS idx_news_items_impact_score
  ON public.news_items (impact_score DESC NULLS LAST);

DROP VIEW IF EXISTS public.v_top_items_week;
CREATE OR REPLACE VIEW public.v_top_items_week AS
SELECT
  id, source_name, title, url, category, region, slack_channel,
  urgency, impact_score, audience_invest,
  summary_nl, buyer_implication, published_at
FROM public.news_items
WHERE
  published_at >= NOW() - INTERVAL '7 days'
  AND status IN ('summarized', 'sent', 'archived')
  AND urgency IS NOT NULL
ORDER BY impact_score DESC NULLS LAST, urgency DESC;

NOTIFY pgrst, 'reload schema';
