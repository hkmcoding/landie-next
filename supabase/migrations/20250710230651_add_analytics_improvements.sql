-- =============================================
-- Analytics Database Improvements Migration
-- =============================================

-- Add referrer and user_agent columns to analytics tables
ALTER TABLE analytics.page_views 
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS session_id UUID;

ALTER TABLE analytics.unique_visitors 
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 1;

ALTER TABLE analytics.cta_clicks 
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS session_id UUID;

-- Add indexes for performance optimization
-- Page views indexes
CREATE INDEX IF NOT EXISTS idx_page_views_landing_page_id ON analytics.page_views(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_page_views_viewer_id ON analytics.page_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON analytics.page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON analytics.page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_composite ON analytics.page_views(landing_page_id, created_at DESC);

-- Unique visitors indexes
CREATE INDEX IF NOT EXISTS idx_unique_visitors_landing_page_id ON analytics.unique_visitors(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_unique_visitors_unique_visitors ON analytics.unique_visitors(unique_visitors);
CREATE INDEX IF NOT EXISTS idx_unique_visitors_last_visit ON analytics.unique_visitors(last_visit DESC);

-- CTA clicks indexes
CREATE INDEX IF NOT EXISTS idx_cta_clicks_landing_page_id ON analytics.cta_clicks(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_cta_clicks_id ON analytics.cta_clicks(id);
CREATE INDEX IF NOT EXISTS idx_cta_clicks_created_at ON analytics.cta_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cta_clicks_session_id ON analytics.cta_clicks(session_id);

-- Add constraints for data integrity
ALTER TABLE analytics.page_views 
ADD CONSTRAINT IF NOT EXISTS chk_page_views_landing_page_id_not_empty 
CHECK (landing_page_id IS NOT NULL AND length(landing_page_id) > 0);

ALTER TABLE analytics.unique_visitors 
ADD CONSTRAINT IF NOT EXISTS chk_unique_visitors_landing_page_id_not_empty 
CHECK (landing_page_id IS NOT NULL AND length(landing_page_id) > 0),
ADD CONSTRAINT IF NOT EXISTS chk_unique_visitors_visit_count_positive 
CHECK (visit_count > 0);

ALTER TABLE analytics.cta_clicks 
ADD CONSTRAINT IF NOT EXISTS chk_cta_clicks_landing_page_id_not_empty 
CHECK (landing_page_id IS NOT NULL AND length(landing_page_id) > 0);

-- Create function to update last_visit for unique visitors
CREATE OR REPLACE FUNCTION analytics.update_unique_visitor()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO analytics.unique_visitors (landing_page_id, unique_visitors, first_visit, last_visit, visit_count, referrer, user_agent)
  VALUES (NEW.landing_page_id, NEW.viewer_id, NEW.created_at, NEW.created_at, 1, NEW.referrer, NEW.user_agent)
  ON CONFLICT (landing_page_id, unique_visitors)
  DO UPDATE SET 
    last_visit = NEW.created_at,
    visit_count = analytics.unique_visitors.visit_count + 1,
    referrer = COALESCE(analytics.unique_visitors.referrer, NEW.referrer),
    user_agent = COALESCE(analytics.unique_visitors.user_agent, NEW.user_agent);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update unique visitors on page view
DROP TRIGGER IF EXISTS trg_update_unique_visitor ON analytics.page_views;
CREATE TRIGGER trg_update_unique_visitor
  AFTER INSERT ON analytics.page_views
  FOR EACH ROW
  EXECUTE FUNCTION analytics.update_unique_visitor();

-- Create materialized view for daily analytics summary
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.daily_summary AS
SELECT 
  landing_page_id,
  DATE(created_at) as date,
  COUNT(*) as page_views,
  COUNT(DISTINCT viewer_id) as unique_visitors,
  COUNT(CASE WHEN referrer IS NOT NULL AND referrer != '' THEN 1 END) as referred_visits,
  COUNT(CASE WHEN referrer IS NULL OR referrer = '' THEN 1 END) as direct_visits
FROM analytics.page_views
GROUP BY landing_page_id, DATE(created_at)
ORDER BY landing_page_id, date DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_summary_unique 
ON analytics.daily_summary(landing_page_id, date);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION analytics.refresh_daily_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.daily_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for analytics aggregations
CREATE OR REPLACE FUNCTION analytics.get_landing_page_stats(page_id UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_page_views BIGINT,
  unique_visitors BIGINT,
  cta_clicks BIGINT,
  avg_session_duration NUMERIC,
  bounce_rate NUMERIC,
  top_referrers JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(pv.id) as page_views,
      COUNT(DISTINCT pv.viewer_id) as visitors,
      COUNT(cc.id) as clicks,
      AVG(EXTRACT(EPOCH FROM (pv.created_at - LAG(pv.created_at) OVER (PARTITION BY pv.viewer_id ORDER BY pv.created_at)))) as avg_duration
    FROM analytics.page_views pv
    LEFT JOIN analytics.cta_clicks cc ON cc.landing_page_id = pv.landing_page_id AND cc.session_id = pv.session_id
    WHERE pv.landing_page_id = page_id::TEXT
      AND pv.created_at >= NOW() - INTERVAL '1 day' * days_back
  ),
  referrers AS (
    SELECT jsonb_agg(jsonb_build_object(
      'referrer', COALESCE(NULLIF(referrer, ''), 'Direct'),
      'count', count
    ) ORDER BY count DESC) as top_refs
    FROM (
      SELECT 
        COALESCE(NULLIF(referrer, ''), 'Direct') as referrer,
        COUNT(*) as count
      FROM analytics.page_views
      WHERE landing_page_id = page_id::TEXT
        AND created_at >= NOW() - INTERVAL '1 day' * days_back
      GROUP BY COALESCE(NULLIF(referrer, ''), 'Direct')
      ORDER BY COUNT(*) DESC
      LIMIT 10
    ) r
  ),
  bounce AS (
    SELECT 
      COUNT(CASE WHEN page_count = 1 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100 as bounce_pct
    FROM (
      SELECT 
        viewer_id,
        COUNT(*) as page_count
      FROM analytics.page_views
      WHERE landing_page_id = page_id::TEXT
        AND created_at >= NOW() - INTERVAL '1 day' * days_back
      GROUP BY viewer_id
    ) visitor_pages
  )
  SELECT 
    stats.page_views,
    stats.visitors,
    stats.clicks,
    ROUND(stats.avg_duration, 2),
    ROUND(bounce.bounce_pct, 2),
    referrers.top_refs
  FROM stats, referrers, bounce;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security (RLS) for analytics tables
ALTER TABLE analytics.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.unique_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.cta_clicks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now, can be restricted later)
-- Note: In production, you'd want more restrictive policies based on user ownership
CREATE POLICY IF NOT EXISTS "Analytics data is accessible to all authenticated users" 
ON analytics.page_views FOR ALL TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Unique visitors data is accessible to all authenticated users" 
ON analytics.unique_visitors FOR ALL TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "CTA clicks data is accessible to all authenticated users" 
ON analytics.cta_clicks FOR ALL TO authenticated USING (true);

-- Allow anonymous inserts for tracking (but not reads)
CREATE POLICY IF NOT EXISTS "Allow anonymous analytics tracking" 
ON analytics.page_views FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow anonymous unique visitor tracking" 
ON analytics.unique_visitors FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow anonymous CTA click tracking" 
ON analytics.cta_clicks FOR INSERT TO anon WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE analytics.page_views IS 'Tracks individual page views with visitor and session information';
COMMENT ON TABLE analytics.unique_visitors IS 'Tracks unique visitors per landing page with visit counts';
COMMENT ON TABLE analytics.cta_clicks IS 'Tracks call-to-action button clicks';
COMMENT ON MATERIALIZED VIEW analytics.daily_summary IS 'Daily aggregated analytics data for performance';
COMMENT ON FUNCTION analytics.get_landing_page_stats IS 'Comprehensive analytics function for landing page performance';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA analytics TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA analytics TO authenticated;
GRANT INSERT ON ALL TABLES IN SCHEMA analytics TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA analytics TO authenticated, anon;