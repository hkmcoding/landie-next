-- =============================================
-- Direct Column Addition Migration
-- =============================================

-- This migration directly adds missing columns to existing tables
-- It handles the case where tables exist but are missing columns

-- Add missing columns to page_views
ALTER TABLE analytics.page_views 
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS session_id UUID;

-- Handle unique_visitors - check if it's a materialized view first
DO $$
BEGIN
    -- If unique_visitors is a materialized view, we need to drop and recreate as table
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'analytics' AND matviewname = 'unique_visitors') THEN
        -- Drop the materialized view
        DROP MATERIALIZED VIEW analytics.unique_visitors CASCADE;
        
        -- Create as a proper table
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
    ELSE
        -- If it's already a table, just add missing columns
        ALTER TABLE analytics.unique_visitors 
        ADD COLUMN IF NOT EXISTS referrer TEXT,
        ADD COLUMN IF NOT EXISTS user_agent TEXT,
        ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 1;
    END IF;
END $$;

-- Add missing columns to cta_clicks
ALTER TABLE analytics.cta_clicks 
ADD COLUMN IF NOT EXISTS cta_text TEXT,
ADD COLUMN IF NOT EXISTS cta_position TEXT,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS session_id UUID;

-- Add missing columns to page_sessions (create table if it doesn't exist)
CREATE TABLE IF NOT EXISTS analytics.page_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id TEXT NOT NULL,
    visitor_id UUID NOT NULL,
    session_id UUID NOT NULL,
    session_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to page_sessions
ALTER TABLE analytics.page_sessions 
ADD COLUMN IF NOT EXISTS session_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_page_views_landing_page_id ON analytics.page_views(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON analytics.page_views(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cta_clicks_landing_page_id ON analytics.cta_clicks(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_cta_clicks_session_id ON analytics.cta_clicks(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unique_visitors_landing_page_id ON analytics.unique_visitors(landing_page_id);

-- Enable RLS (if not already enabled)
ALTER TABLE analytics.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.unique_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.cta_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.page_sessions ENABLE ROW LEVEL SECURITY;

-- Create simple policies (drop existing first to avoid errors)
DO $$
BEGIN
    -- Drop policies if they exist (ignore errors)
    BEGIN
        DROP POLICY "page_views_select_authenticated" ON analytics.page_views;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY "page_views_insert_all" ON analytics.page_views;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;
    
    -- Create new policies
    CREATE POLICY "page_views_select_authenticated" ON analytics.page_views FOR SELECT TO authenticated USING (true);
    CREATE POLICY "page_views_insert_all" ON analytics.page_views FOR INSERT TO authenticated, anon WITH CHECK (true);
    
    -- Similar for other tables
    BEGIN
        DROP POLICY "unique_visitors_all" ON analytics.unique_visitors;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;
    CREATE POLICY "unique_visitors_all" ON analytics.unique_visitors FOR ALL TO authenticated, anon USING (true);
    
    BEGIN
        DROP POLICY "cta_clicks_select_authenticated" ON analytics.cta_clicks;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;
    BEGIN
        DROP POLICY "cta_clicks_insert_all" ON analytics.cta_clicks;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;
    CREATE POLICY "cta_clicks_select_authenticated" ON analytics.cta_clicks FOR SELECT TO authenticated USING (true);
    CREATE POLICY "cta_clicks_insert_all" ON analytics.cta_clicks FOR INSERT TO authenticated, anon WITH CHECK (true);
    
    BEGIN
        DROP POLICY "page_sessions_select_authenticated" ON analytics.page_sessions;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;
    BEGIN
        DROP POLICY "page_sessions_insert_all" ON analytics.page_sessions;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;
    CREATE POLICY "page_sessions_select_authenticated" ON analytics.page_sessions FOR SELECT TO authenticated USING (true);
    CREATE POLICY "page_sessions_insert_all" ON analytics.page_sessions FOR INSERT TO authenticated, anon WITH CHECK (true);
END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA analytics TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO authenticated;
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA analytics TO authenticated, anon;