-- Force deduplicate sections by using ROW_NUMBER to pick one entry per section per landing page

DROP MATERIALIZED VIEW IF EXISTS analytics.section_dropoff_mv CASCADE;

CREATE MATERIALIZED VIEW analytics.section_dropoff_mv AS
WITH deduplicated_sections AS (
  -- Force deduplication by picking only one row per section per landing page
  SELECT DISTINCT ON (landing_page_id, section)
    landing_page_id,
    section AS section_slug,
    index AS section_order
  FROM analytics.section_view_events
  ORDER BY landing_page_id, section, index  -- This will pick the one with the lowest index
),
section_views AS (
  -- Count distinct sessions for each unique section
  SELECT 
    ds.landing_page_id,
    ds.section_slug,
    ds.section_order,
    COUNT(DISTINCT sve.session_id) as views
  FROM deduplicated_sections ds
  JOIN analytics.section_view_events sve ON (
    sve.landing_page_id = ds.landing_page_id 
    AND sve.section = ds.section_slug
  )
  GROUP BY ds.landing_page_id, ds.section_slug, ds.section_order
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

-- Create indexes
CREATE INDEX idx_section_dropoff_mv_landing_page 
ON analytics.section_dropoff_mv USING btree (landing_page_id);

-- Grant permissions
GRANT SELECT ON TABLE analytics.section_dropoff_mv TO anon;
GRANT SELECT ON TABLE analytics.section_dropoff_mv TO authenticated;

-- Refresh with data
REFRESH MATERIALIZED VIEW analytics.section_dropoff_mv;

-- Show results to verify no duplicates
SELECT 'Final results - should have no duplicates' as check_type;
SELECT landing_page_id, section_order, section_slug, views, dropoffs, dropoff_rate
FROM analytics.section_dropoff_mv
ORDER BY landing_page_id, section_order;