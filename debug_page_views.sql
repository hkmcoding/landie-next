-- Top landing pages by total page views
SELECT landing_page_id, COUNT(*) AS total_views
FROM analytics.page_views
GROUP BY landing_page_id
ORDER BY total_views DESC
LIMIT 10;

-- Recent page views (last 7 days)
SELECT landing_page_id, COUNT(*) AS recent_views
FROM analytics.page_views
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY landing_page_id
ORDER BY recent_views DESC
LIMIT 10;

-- Check for duplicate page views (same landing_page_id, visitor_id, created_at)
SELECT landing_page_id, visitor_id, created_at, COUNT(*) AS dup_count
FROM analytics.page_views
GROUP BY landing_page_id, visitor_id, created_at
HAVING COUNT(*) > 1
ORDER BY dup_count DESC
LIMIT 10;

-- Distribution of page views per day for the most viewed landing page
WITH top_lp AS (
  SELECT landing_page_id
  FROM analytics.page_views
  GROUP BY landing_page_id
  ORDER BY COUNT(*) DESC
  LIMIT 1
)
SELECT DATE(created_at) AS day, COUNT(*) AS views
FROM analytics.page_views
WHERE landing_page_id = (SELECT landing_page_id FROM top_lp)
GROUP BY day
ORDER BY day DESC; 