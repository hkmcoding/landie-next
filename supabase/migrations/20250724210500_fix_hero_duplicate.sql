-- Fix the remaining hero duplicate

-- First, let's see what's causing the hero duplicate specifically
SELECT 
  landing_page_id, 
  section, 
  index,
  COUNT(*) as occurrences,
  COUNT(DISTINCT session_id) as unique_sessions,
  array_agg(DISTINCT session_id ORDER BY session_id) as sessions
FROM analytics.section_view_events
WHERE section = 'hero'
GROUP BY landing_page_id, section, index
ORDER BY landing_page_id, index;

-- Check if there are multiple hero entries with different indexes
SELECT DISTINCT landing_page_id, section, index
FROM analytics.section_view_events 
WHERE section = 'hero'
ORDER BY landing_page_id, index;

-- Force refresh the materialized view to see current state
REFRESH MATERIALIZED VIEW analytics.section_dropoff_mv;

-- Show current hero entries in the materialized view
SELECT * FROM analytics.section_dropoff_mv 
WHERE section_slug = 'hero'
ORDER BY landing_page_id, section_order;