-- Debug the duplicate sections issue

-- 1. Check raw section view events data
SELECT 'Raw section_view_events' as debug_step;
SELECT landing_page_id, section, index, session_id, created_at
FROM analytics.section_view_events
ORDER BY landing_page_id, section, index, session_id;

-- 2. Check current materialized view content
SELECT 'Current section_dropoff_mv' as debug_step;
SELECT landing_page_id, section_order, section_slug, views, dropoffs, dropoff_rate
FROM analytics.section_dropoff_mv
ORDER BY landing_page_id, section_order, section_slug;

-- 3. Check if there are multiple entries per section
SELECT 'Sections with counts' as debug_step;
SELECT section_slug, COUNT(*) as occurrences
FROM analytics.section_dropoff_mv
GROUP BY section_slug
HAVING COUNT(*) > 1;

-- 4. Manually refresh the materialized view
REFRESH MATERIALIZED VIEW analytics.section_dropoff_mv;

-- 5. Check again after refresh
SELECT 'After refresh' as debug_step;
SELECT landing_page_id, section_order, section_slug, views, dropoffs, dropoff_rate
FROM analytics.section_dropoff_mv
ORDER BY landing_page_id, section_order, section_slug;