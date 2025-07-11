-- =============================================
-- Proper Analytics Schema Inspection and Fix
-- =============================================

-- Check if unique_visitors is a materialized view and drop it if needed
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Check if unique_visitors exists as a materialized view
    SELECT INTO rec
        schemaname, matviewname
    FROM pg_matviews 
    WHERE schemaname = 'analytics' AND matviewname = 'unique_visitors';
    
    IF FOUND THEN
        RAISE NOTICE 'Found unique_visitors as materialized view, dropping it';
        DROP MATERIALIZED VIEW IF EXISTS analytics.unique_visitors CASCADE;
    END IF;
END $$;

-- Create proper base tables

-- 1. Create page_views table with all needed columns
CREATE TABLE IF NOT EXISTS analytics.page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id TEXT NOT NULL,
    viewer_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    referrer TEXT,
    user_agent TEXT,
    url TEXT,
    session_id UUID
);

-- 2. Create proper unique_visitors TABLE (not materialized view)
CREATE TABLE IF NOT EXISTS analytics.unique_visitors (
    landing_page_id TEXT NOT NULL,
    unique_visitors UUID NOT NULL,
    first_visit TIMESTAMPTZ DEFAULT NOW(),
    last_visit TIMESTAMPTZ DEFAULT NOW(),
    referrer TEXT,
    user_agent TEXT,
    visit_count INTEGER DEFAULT 1,
    PRIMARY KEY (landing_page_id, unique_visitors)
);

-- 3. Create cta_clicks table
CREATE TABLE IF NOT EXISTS analytics.cta_clicks (
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

-- 4. Create page_sessions table
CREATE TABLE IF NOT EXISTS analytics.page_sessions (
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

-- Add missing columns to existing tables if they exist

-- Add columns to page_views if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_views' 
                   AND column_name = 'referrer') THEN
        ALTER TABLE analytics.page_views ADD COLUMN referrer TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_views' 
                   AND column_name = 'user_agent') THEN
        ALTER TABLE analytics.page_views ADD COLUMN user_agent TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_views' 
                   AND column_name = 'url') THEN
        ALTER TABLE analytics.page_views ADD COLUMN url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_views' 
                   AND column_name = 'session_id') THEN
        ALTER TABLE analytics.page_views ADD COLUMN session_id UUID;
    END IF;
END $$;

-- Add columns to cta_clicks if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'cta_clicks' 
                   AND column_name = 'cta_text') THEN
        ALTER TABLE analytics.cta_clicks ADD COLUMN cta_text TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'cta_clicks' 
                   AND column_name = 'cta_position') THEN
        ALTER TABLE analytics.cta_clicks ADD COLUMN cta_position TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'cta_clicks' 
                   AND column_name = 'referrer') THEN
        ALTER TABLE analytics.cta_clicks ADD COLUMN referrer TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'cta_clicks' 
                   AND column_name = 'user_agent') THEN
        ALTER TABLE analytics.cta_clicks ADD COLUMN user_agent TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'cta_clicks' 
                   AND column_name = 'url') THEN
        ALTER TABLE analytics.cta_clicks ADD COLUMN url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'cta_clicks' 
                   AND column_name = 'session_id') THEN
        ALTER TABLE analytics.cta_clicks ADD COLUMN session_id UUID;
    END IF;
END $$;

-- Add columns to page_sessions if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_sessions' 
                   AND column_name = 'session_end') THEN
        ALTER TABLE analytics.page_sessions ADD COLUMN session_end TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_sessions' 
                   AND column_name = 'duration_seconds') THEN
        ALTER TABLE analytics.page_sessions ADD COLUMN duration_seconds INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_sessions' 
                   AND column_name = 'referrer') THEN
        ALTER TABLE analytics.page_sessions ADD COLUMN referrer TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_sessions' 
                   AND column_name = 'user_agent') THEN
        ALTER TABLE analytics.page_sessions ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_page_views_landing_page_id ON analytics.page_views(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_page_views_viewer_id ON analytics.page_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON analytics.page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON analytics.page_views(session_id);

CREATE INDEX IF NOT EXISTS idx_unique_visitors_landing_page_id ON analytics.unique_visitors(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_unique_visitors_unique_visitors ON analytics.unique_visitors(unique_visitors);
CREATE INDEX IF NOT EXISTS idx_unique_visitors_last_visit ON analytics.unique_visitors(last_visit DESC);

CREATE INDEX IF NOT EXISTS idx_cta_clicks_landing_page_id ON analytics.cta_clicks(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_cta_clicks_created_at ON analytics.cta_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cta_clicks_session_id ON analytics.cta_clicks(session_id);

CREATE INDEX IF NOT EXISTS idx_page_sessions_landing_page_id ON analytics.page_sessions(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_page_sessions_visitor_id ON analytics.page_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_sessions_session_id ON analytics.page_sessions(session_id);

-- Enable RLS and create policies
ALTER TABLE analytics.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.unique_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.cta_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.page_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Analytics read access for authenticated users" ON analytics.page_views;
DROP POLICY IF EXISTS "Analytics insert access for all" ON analytics.page_views;
DROP POLICY IF EXISTS "Unique visitors read access for authenticated users" ON analytics.unique_visitors;
DROP POLICY IF EXISTS "Unique visitors insert/update access for all" ON analytics.unique_visitors;
DROP POLICY IF EXISTS "CTA clicks read access for authenticated users" ON analytics.cta_clicks;
DROP POLICY IF EXISTS "CTA clicks insert access for all" ON analytics.cta_clicks;
DROP POLICY IF EXISTS "Page sessions read access for authenticated users" ON analytics.page_sessions;
DROP POLICY IF EXISTS "Page sessions insert access for all" ON analytics.page_sessions;

-- Create RLS policies
CREATE POLICY "page_views_read_authenticated" ON analytics.page_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "page_views_insert_all" ON analytics.page_views FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "unique_visitors_read_authenticated" ON analytics.unique_visitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "unique_visitors_all_access" ON analytics.unique_visitors FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "cta_clicks_read_authenticated" ON analytics.cta_clicks FOR SELECT TO authenticated USING (true);
CREATE POLICY "cta_clicks_insert_all" ON analytics.cta_clicks FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "page_sessions_read_authenticated" ON analytics.page_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "page_sessions_insert_all" ON analytics.page_sessions FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Grant permissions
GRANT USAGE ON SCHEMA analytics TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO authenticated;
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA analytics TO authenticated, anon;