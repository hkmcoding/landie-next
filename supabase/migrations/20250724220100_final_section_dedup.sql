-- Final aggressive deduplication - ensure only one row per section per landing page

DROP MATERIALIZED VIEW IF EXISTS analytics.section_dropoff_mv CASCADE;

CREATE MATERIALIZED VIEW analytics.section_dropoff_mv AS
WITH section_aggregates AS (
  -- Aggregate at the most granular level first
  SELECT 
    landing_page_id,
    section AS section_slug,
    MIN(index) AS section_order,  -- Take the minimum index for consistency
    COUNT(DISTINCT session_id) as views
  FROM analytics.section_view_events
  GROUP BY landing_page_id, section  -- Group only by landing_page_id and section - ignore index variations
),
section_continuations AS (
  -- Calculate continuations to next section
  SELECT 
    sa1.landing_page_id,
    sa1.section_order,
    sa1.section_slug,
    sa1.views,
    COALESCE(sa2.views, 0) as continued_to_next
  FROM section_aggregates sa1
  LEFT JOIN section_aggregates sa2 ON (
    sa1.landing_page_id = sa2.landing_page_id 
    AND sa2.section_order = sa1.section_order + 1
  )
)
SELECT DISTINCT  -- Extra safety net
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

-- Create a unique index to enforce the constraint at the database level
CREATE UNIQUE INDEX idx_section_dropoff_unique_constraint 
ON analytics.section_dropoff_mv (landing_page_id, section_slug);

-- Create performance indexes
CREATE INDEX idx_section_dropoff_mv_landing_page 
ON analytics.section_dropoff_mv USING btree (landing_page_id);

-- Grant permissions
GRANT SELECT ON TABLE analytics.section_dropoff_mv TO anon;
GRANT SELECT ON TABLE analytics.section_dropoff_mv TO authenticated;

-- Refresh with data
REFRESH MATERIALIZED VIEW analytics.section_dropoff_mv;

-- Verify results
SELECT 'Verification - should be exactly one row per section per landing page' as status;
SELECT 
  landing_page_id,
  COUNT(*) as section_count,
  array_agg(section_slug ORDER BY section_order) as sections
FROM analytics.section_dropoff_mv 
GROUP BY landing_page_id
ORDER BY landing_page_id;