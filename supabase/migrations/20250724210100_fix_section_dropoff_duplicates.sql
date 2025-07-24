-- Fix section dropoff duplicates by properly aggregating the data

-- Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS analytics.section_dropoff_mv;

-- Create corrected section dropoff materialized view without duplicates
CREATE MATERIALIZED VIEW analytics.section_dropoff_mv AS
WITH section_stats AS (
  -- Get unique sections and their view counts (distinct sessions)
  SELECT 
    sve.landing_page_id,
    sve.section AS section_slug,
    sve.index AS section_order,
    COUNT(DISTINCT sve.session_id) as views
  FROM analytics.section_view_events sve
  GROUP BY sve.landing_page_id, sve.section, sve.index
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
CREATE INDEX IF NOT EXISTS idx_section_dropoff_mv_landing_page_fixed 
ON analytics.section_dropoff_mv USING btree (landing_page_id);

-- Grant permissions
GRANT SELECT ON TABLE analytics.section_dropoff_mv TO anon;
GRANT SELECT ON TABLE analytics.section_dropoff_mv TO authenticated;