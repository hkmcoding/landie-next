-- Check the raw section dropoff data for your landing page
SELECT * FROM analytics.section_dropoff_mv 
WHERE landing_page_id = 'c9f35a89-c585-4400-ab7e-f364f3311d74';

-- Check if there are any CTA clicks for this landing page
SELECT COUNT(*) as total_cta_clicks
FROM analytics.cta_clicks 
WHERE landing_page_id = 'c9f35a89-c585-4400-ab7e-f364f3311d74';

-- Check if there are section view events for this landing page
SELECT COUNT(*) as total_section_views
FROM analytics.section_view_events 
WHERE landing_page_id = 'c9f35a89-c585-4400-ab7e-f364f3311d74';

-- Check if session_ids match between section views and CTA clicks
SELECT 
  'section_views' as source,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(*) as total_events
FROM analytics.section_view_events 
WHERE landing_page_id = 'c9f35a89-c585-4400-ab7e-f364f3311d74'
  AND session_id IS NOT NULL

UNION ALL

SELECT 
  'cta_clicks' as source,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(*) as total_events
FROM analytics.cta_clicks 
WHERE landing_page_id = 'c9f35a89-c585-4400-ab7e-f364f3311d74'
  AND session_id IS NOT NULL; 