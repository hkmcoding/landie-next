-- Robust fix for section dropoff that handles data inconsistencies

-- Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS analytics.section_dropoff_mv CASCADE;

-- Create the materialized view with robust deduplication
-- This handles cases where the same section might have multiple indexes
CREATE MATERIALIZED VIEW analytics.section_dropoff_mv AS
WITH normalized_sections AS (
  -- Normalize sections by taking the most common (or minimum) index for each section name
  SELECT 
    landing_page_id,
    section AS section_slug,
    MIN(index) AS section_order  -- Use the minimum index if there are conflicts
  FROM analytics.section_view_events
  GROUP BY landing_page_id, section
),
section_views AS (
  -- Count distinct sessions for each normalized section
  SELECT 
    ns.landing_page_id,
    ns.section_slug,
    ns.section_order,
    COUNT(DISTINCT sve.session_id) as views
  FROM normalized_sections ns
  JOIN analytics.section_view_events sve ON (
    sve.landing_page_id = ns.landing_page_id 
    AND sve.section = ns.section_slug
  )
  GROUP BY ns.landing_page_id, ns.section_slug, ns.section_order
),
section_continuations AS (
  -- Calculate continuations to next section
  SELECT 
    sv1.landing_page_id,
    sv1.section_order,
    sv1.section_slug,
    sv1.views,
    COALESCE(sv2.views, 0) as continued_to_next
  FROM section_views sv1
  LEFT JOIN section_views sv2 ON (
    sv1.landing_page_id = sv2.landing_page_id 
    AND sv2.section_order = sv1.section_order + 1
  )
)
SELECT 
  landing_page_id,
  section_order,
  section_slug,
  views,
  GREATEST(0, views - continued_to_next) as dropoffs,
  CASE 
    WHEN views > 0 THEN ROUND(GREATEST(0, views - continued_to_next)::numeric / views::numeric, 3)
    ELSE 0
  END as dropoff_rate
FROM section_continuations
ORDER BY landing_page_id, section_order;

-- Create performance indexes (no unique constraint for now)
CREATE INDEX idx_section_dropoff_mv_landing_page 
ON analytics.section_dropoff_mv USING btree (landing_page_id);

CREATE INDEX idx_section_dropoff_mv_order 
ON analytics.section_dropoff_mv USING btree (landing_page_id, section_order);

-- Grant permissions
GRANT SELECT ON TABLE analytics.section_dropoff_mv TO anon;
GRANT SELECT ON TABLE analytics.section_dropoff_mv TO authenticated;

-- Refresh the view with data
REFRESH MATERIALIZED VIEW analytics.section_dropoff_mv;