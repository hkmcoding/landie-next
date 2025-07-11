-- =============================================
-- Debug and Rebuild Analytics Schema Migration
-- =============================================

-- This migration will inspect what exists and rebuild everything properly

-- First, let's see what we're working with
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== ANALYTICS SCHEMA INSPECTION ===';
    
    -- Check if analytics schema exists
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'analytics') THEN
        RAISE NOTICE 'Analytics schema EXISTS';
    ELSE
        RAISE NOTICE 'Analytics schema DOES NOT EXIST';
    END IF;
    
    -- List all tables in analytics schema
    RAISE NOTICE 'Tables in analytics schema:';
    FOR rec IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'analytics') LOOP
        RAISE NOTICE '  - Table: %', rec.table_name;
    END LOOP;
    
    -- List all materialized views in analytics schema
    RAISE NOTICE 'Materialized views in analytics schema:';
    FOR rec IN (SELECT matviewname FROM pg_matviews WHERE schemaname = 'analytics') LOOP
        RAISE NOTICE '  - Materialized View: %', rec.matviewname;
    END LOOP;
END $$;

-- Now let's create the analytics schema properly
CREATE SCHEMA IF NOT EXISTS analytics;

-- Drop and recreate all analytics objects to ensure clean state
DROP TABLE IF EXISTS analytics.page_sessions CASCADE;
DROP TABLE IF EXISTS analytics.cta_clicks CASCADE;
DROP TABLE IF EXISTS analytics.page_views CASCADE;

-- Handle unique_visitors (might be materialized view)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'analytics' AND matviewname = 'unique_visitors') THEN
        DROP MATERIALIZED VIEW analytics.unique_visitors CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'unique_visitors') THEN
        DROP TABLE analytics.unique_visitors CASCADE;
    END IF;
END $$;

-- Create all tables with complete structure from scratch
CREATE TABLE analytics.page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id TEXT NOT NULL,
    viewer_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    referrer TEXT,
    user_agent TEXT,
    url TEXT,
    session_id UUID
);

CREATE TABLE analytics.unique_visitors (
    landing_page_id TEXT NOT NULL,
    unique_visitors UUID NOT NULL,
    first_visit TIMESTAMPTZ DEFAULT NOW(),
    last_visit TIMESTAMPTZ DEFAULT NOW(),
    referrer TEXT,
    user_agent TEXT,
    visit_count INTEGER DEFAULT 1,
    PRIMARY KEY (landing_page_id, unique_visitors)
);

CREATE TABLE analytics.cta_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cta_text TEXT,
    cta_position TEXT,
    referrer TEXT,
    user_agent TEXT,
    url TEXT,
    session_id UUID
);

CREATE TABLE analytics.page_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id TEXT NOT NULL,
    visitor_id UUID NOT NULL,
    session_id UUID NOT NULL,
    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    duration_seconds INTEGER,
    referrer TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_page_views_landing_page_id ON analytics.page_views(landing_page_id);
CREATE INDEX idx_page_views_viewer_id ON analytics.page_views(viewer_id);
CREATE INDEX idx_page_views_created_at ON analytics.page_views(created_at DESC);

CREATE INDEX idx_unique_visitors_landing_page_id ON analytics.unique_visitors(landing_page_id);
CREATE INDEX idx_unique_visitors_unique_visitors ON analytics.unique_visitors(unique_visitors);

CREATE INDEX idx_cta_clicks_landing_page_id ON analytics.cta_clicks(landing_page_id);
CREATE INDEX idx_cta_clicks_created_at ON analytics.cta_clicks(created_at DESC);

CREATE INDEX idx_page_sessions_landing_page_id ON analytics.page_sessions(landing_page_id);
CREATE INDEX idx_page_sessions_visitor_id ON analytics.page_sessions(visitor_id);
CREATE INDEX idx_page_sessions_session_id ON analytics.page_sessions(session_id);

-- Enable RLS on all tables
ALTER TABLE analytics.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.unique_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.cta_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.page_sessions ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies
CREATE POLICY "page_views_anon_insert" ON analytics.page_views FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "page_views_auth_all" ON analytics.page_views FOR ALL TO authenticated USING (true);

CREATE POLICY "unique_visitors_anon_all" ON analytics.unique_visitors FOR ALL TO anon USING (true);
CREATE POLICY "unique_visitors_auth_all" ON analytics.unique_visitors FOR ALL TO authenticated USING (true);

CREATE POLICY "cta_clicks_anon_insert" ON analytics.cta_clicks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "cta_clicks_auth_all" ON analytics.cta_clicks FOR ALL TO authenticated USING (true);

CREATE POLICY "page_sessions_anon_insert" ON analytics.page_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "page_sessions_auth_all" ON analytics.page_sessions FOR ALL TO authenticated USING (true);

-- Grant schema usage
GRANT USAGE ON SCHEMA analytics TO anon, authenticated;

-- Grant table permissions
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO authenticated;
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA analytics TO anon, authenticated;