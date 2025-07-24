-- Debug section dropoff data

-- 1. Check if we have any section view events
SELECT 'Section View Events Count' as check_type, COUNT(*) as count
FROM analytics.section_view_events;

-- 2. Show recent section view events
SELECT landing_page_id, section, index, session_id, created_at
FROM analytics.section_view_events
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check materialized view data
SELECT 'Section Dropoff MV Count' as check_type, COUNT(*) as count
FROM analytics.section_dropoff_mv;

-- 4. Show section dropoff calculation
SELECT landing_page_id, section_order, section_slug, views, dropoffs, dropoff_rate
FROM analytics.section_dropoff_mv
ORDER BY landing_page_id, section_order
LIMIT 10;

-- 5. Check if we have CTA clicks (which affects dropoff calculation)
SELECT 'CTA Clicks Count' as check_type, COUNT(*) as count
FROM analytics.cta_clicks;

-- 6. Show session patterns
SELECT 
    sve.landing_page_id,
    sve.session_id,
    array_agg(sve.section ORDER BY sve.index) as sections_viewed,
    COUNT(cc.id) as cta_clicks
FROM analytics.section_view_events sve
LEFT JOIN analytics.cta_clicks cc ON cc.session_id = sve.session_id 
    AND cc.landing_page_id = sve.landing_page_id
GROUP BY sve.landing_page_id, sve.session_id
ORDER BY sve.landing_page_id, sve.session_id
LIMIT 10;