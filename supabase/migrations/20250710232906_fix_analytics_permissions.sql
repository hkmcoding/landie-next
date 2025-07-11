-- =============================================
-- Fix Analytics Permissions Migration
-- =============================================

-- Ensure analytics schema exists and has proper permissions
CREATE SCHEMA IF NOT EXISTS analytics;
GRANT USAGE ON SCHEMA analytics TO anon, authenticated;

-- Fix unique_visitors materialized view issue
DO $$
BEGIN
    -- Drop materialized view if it exists
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'analytics' AND matviewname = 'unique_visitors') THEN
        DROP MATERIALIZED VIEW analytics.unique_visitors CASCADE;
    END IF;
    
    -- Create as table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'unique_visitors') THEN
        CREATE TABLE analytics.unique_visitors (
            landing_page_id TEXT NOT NULL,
            unique_visitors UUID NOT NULL,
            first_visit TIMESTAMPTZ DEFAULT NOW(),
            last_visit TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (landing_page_id, unique_visitors)
        );
    END IF;
END $$;

-- Ensure basic tables exist
CREATE TABLE IF NOT EXISTS analytics.page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id TEXT NOT NULL,
    viewer_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics.cta_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE analytics.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.unique_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.cta_clicks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "page_views_anon_insert" ON analytics.page_views;
DROP POLICY IF EXISTS "page_views_auth_all" ON analytics.page_views;
DROP POLICY IF EXISTS "unique_visitors_anon_insert" ON analytics.unique_visitors;
DROP POLICY IF EXISTS "unique_visitors_anon_update" ON analytics.unique_visitors;
DROP POLICY IF EXISTS "unique_visitors_auth_all" ON analytics.unique_visitors;
DROP POLICY IF EXISTS "cta_clicks_anon_insert" ON analytics.cta_clicks;
DROP POLICY IF EXISTS "cta_clicks_auth_all" ON analytics.cta_clicks;

-- Create permissive policies
CREATE POLICY "page_views_anon_insert" ON analytics.page_views FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "page_views_auth_all" ON analytics.page_views FOR ALL TO authenticated USING (true);

CREATE POLICY "unique_visitors_anon_all" ON analytics.unique_visitors FOR ALL TO anon USING (true);
CREATE POLICY "unique_visitors_auth_all" ON analytics.unique_visitors FOR ALL TO authenticated USING (true);

CREATE POLICY "cta_clicks_anon_insert" ON analytics.cta_clicks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "cta_clicks_auth_all" ON analytics.cta_clicks FOR ALL TO authenticated USING (true);

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO authenticated;
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA analytics TO anon, authenticated;