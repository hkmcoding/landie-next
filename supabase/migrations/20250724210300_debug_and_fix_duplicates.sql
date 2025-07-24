-- Debug and fix the duplicate sections issue

-- First, let's see what duplicates exist in the source data
SELECT 
  landing_page_id, 
  section, 
  index,
  COUNT(*) as occurrences,
  array_agg(DISTINCT session_id) as sessions
FROM analytics.section_view_events
GROUP BY landing_page_id, section, index
HAVING COUNT(*) > 1
ORDER BY landing_page_id, section, index;

-- Check if same section has different indexes (this would cause duplicates)
SELECT 
  landing_page_id,
  section,
  array_agg(DISTINCT index ORDER BY index) as different_indexes,
  COUNT(DISTINCT index) as index_count
FROM analytics.section_view_events
GROUP BY landing_page_id, section
HAVING COUNT(DISTINCT index) > 1
ORDER BY landing_page_id, section;