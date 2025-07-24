-- Fix section dropoff calculation logic
-- The current logic incorrectly measures "sessions without CTA clicks" instead of "sessions that don't continue to next section"

-- Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS analytics.section_dropoff_mv;

-- Create corrected section dropoff materialized view
CREATE MATERIALIZED VIEW analytics.section_dropoff_mv AS
WITH section_sessions AS (
  -- Get all sessions and the sections they viewed
  SELECT 
    sve.landing_page_id,
    sve.session_id,
    sve.section AS section_slug,
    sve.index AS section_order,
    COUNT(*) OVER (PARTITION BY sve.landing_page_id, sve.session_id) as total_sections_viewed
  FROM analytics.section_view_events sve
),
section_stats AS (
  -- Calculate views for each section
  SELECT 
    landing_page_id,
    section_order,
    section_slug,
    COUNT(DISTINCT session_id) as views
  FROM section_sessions
  GROUP BY landing_page_id, section_order, section_slug
),
section_continuations AS (
  -- Calculate how many sessions continued to the next section
  SELECT 
    s1.landing_page_id,
    s1.section_order,
    s1.section_slug,
    s1.views,
    COALESCE(s2.views, 0) as continued_to_next
  FROM section_stats s1
  LEFT JOIN section_stats s2 ON (
    s1.landing_page_id = s2.landing_page_id 
    AND s2.section_order = s1.section_order + 1
  )
)
SELECT 
  landing_page_id,
  section_order,
  section_slug,
  views,
  (views - continued_to_next) as dropoffs,
  CASE 
    WHEN views > 0 THEN ROUND((views - continued_to_next)::numeric / views::numeric, 3)
    ELSE 0
  END as dropoff_rate
FROM section_continuations
ORDER BY landing_page_id, section_order;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_section_dropoff_mv_landing_page_new 
ON analytics.section_dropoff_mv USING btree (landing_page_id);

CREATE INDEX IF NOT EXISTS section_dropoff_lp_idx_new 
ON analytics.section_dropoff_mv USING btree (landing_page_id);

-- Update the refresh functions to work with the new view
CREATE OR REPLACE FUNCTION analytics.refresh_section_dropoff_mv() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.section_dropoff_mv;
END;
$$;

CREATE OR REPLACE FUNCTION analytics.refresh_section_dropoff() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.section_dropoff_mv;
END $$;

-- Grant permissions
GRANT SELECT ON TABLE analytics.section_dropoff_mv TO anon;
GRANT SELECT ON TABLE analytics.section_dropoff_mv TO authenticated;