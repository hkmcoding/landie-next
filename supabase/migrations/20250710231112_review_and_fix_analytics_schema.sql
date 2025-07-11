-- =============================================
-- Analytics Schema Review and Fix Migration
-- =============================================

-- First, let's ensure the analytics schema exists
CREATE SCHEMA IF NOT EXISTS analytics;

-- Create or modify page_views table
CREATE TABLE IF NOT EXISTS analytics.page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id TEXT NOT NULL,
    viewer_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to page_views if they don't exist
DO $$ 
BEGIN
    -- Add referrer column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_views' 
                   AND column_name = 'referrer') THEN
        ALTER TABLE analytics.page_views ADD COLUMN referrer TEXT;
    END IF;
    
    -- Add user_agent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_views' 
                   AND column_name = 'user_agent') THEN
        ALTER TABLE analytics.page_views ADD COLUMN user_agent TEXT;
    END IF;
    
    -- Add url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_views' 
                   AND column_name = 'url') THEN
        ALTER TABLE analytics.page_views ADD COLUMN url TEXT;
    END IF;
    
    -- Add session_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_views' 
                   AND column_name = 'session_id') THEN
        ALTER TABLE analytics.page_views ADD COLUMN session_id UUID;
    END IF;
END $$;

-- Create or modify unique_visitors table
CREATE TABLE IF NOT EXISTS analytics.unique_visitors (
    landing_page_id TEXT NOT NULL,
    unique_visitors UUID NOT NULL,
    first_visit TIMESTAMPTZ DEFAULT NOW(),
    last_visit TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (landing_page_id, unique_visitors)
);

-- Add missing columns to unique_visitors
DO $$ 
BEGIN
    -- Add referrer column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'unique_visitors' 
                   AND column_name = 'referrer') THEN
        ALTER TABLE analytics.unique_visitors ADD COLUMN referrer TEXT;
    END IF;
    
    -- Add user_agent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'unique_visitors' 
                   AND column_name = 'user_agent') THEN
        ALTER TABLE analytics.unique_visitors ADD COLUMN user_agent TEXT;
    END IF;
    
    -- Add visit_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'unique_visitors' 
                   AND column_name = 'visit_count') THEN
        ALTER TABLE analytics.unique_visitors ADD COLUMN visit_count INTEGER DEFAULT 1;
    END IF;
END $$;

-- Create or modify cta_clicks table
CREATE TABLE IF NOT EXISTS analytics.cta_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to cta_clicks
DO $$ 
BEGIN
    -- Add cta_text column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'cta_clicks' 
                   AND column_name = 'cta_text') THEN
        ALTER TABLE analytics.cta_clicks ADD COLUMN cta_text TEXT;
    END IF;
    
    -- Add cta_position column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'cta_clicks' 
                   AND column_name = 'cta_position') THEN
        ALTER TABLE analytics.cta_clicks ADD COLUMN cta_position TEXT;
    END IF;
    
    -- Add referrer column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'cta_clicks' 
                   AND column_name = 'referrer') THEN
        ALTER TABLE analytics.cta_clicks ADD COLUMN referrer TEXT;
    END IF;
    
    -- Add user_agent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'cta_clicks' 
                   AND column_name = 'user_agent') THEN
        ALTER TABLE analytics.cta_clicks ADD COLUMN user_agent TEXT;
    END IF;
    
    -- Add url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'cta_clicks' 
                   AND column_name = 'url') THEN
        ALTER TABLE analytics.cta_clicks ADD COLUMN url TEXT;
    END IF;
    
    -- Add session_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'cta_clicks' 
                   AND column_name = 'session_id') THEN
        ALTER TABLE analytics.cta_clicks ADD COLUMN session_id UUID;
    END IF;
END $$;

-- Create or modify page_sessions table (for page time tracking)
CREATE TABLE IF NOT EXISTS analytics.page_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id TEXT NOT NULL,
    visitor_id UUID NOT NULL,
    session_id UUID NOT NULL,
    session_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to page_sessions
DO $$ 
BEGIN
    -- Add session_end column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_sessions' 
                   AND column_name = 'session_end') THEN
        ALTER TABLE analytics.page_sessions ADD COLUMN session_end TIMESTAMPTZ;
    END IF;
    
    -- Add duration_seconds column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_sessions' 
                   AND column_name = 'duration_seconds') THEN
        ALTER TABLE analytics.page_sessions ADD COLUMN duration_seconds INTEGER;
    END IF;
    
    -- Add referrer column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_sessions' 
                   AND column_name = 'referrer') THEN
        ALTER TABLE analytics.page_sessions ADD COLUMN referrer TEXT;
    END IF;
    
    -- Add user_agent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'page_sessions' 
                   AND column_name = 'user_agent') THEN
        ALTER TABLE analytics.page_sessions ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_page_views_landing_page_id ON analytics.page_views(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_page_views_viewer_id ON analytics.page_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON analytics.page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON analytics.page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_composite ON analytics.page_views(landing_page_id, created_at DESC);

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Analytics read access for authenticated users" ON analytics.page_views;
DROP POLICY IF EXISTS "Analytics insert access for all" ON analytics.page_views;
DROP POLICY IF EXISTS "Unique visitors read access for authenticated users" ON analytics.unique_visitors;
DROP POLICY IF EXISTS "Unique visitors insert/update access for all" ON analytics.unique_visitors;
DROP POLICY IF EXISTS "CTA clicks read access for authenticated users" ON analytics.cta_clicks;
DROP POLICY IF EXISTS "CTA clicks insert access for all" ON analytics.cta_clicks;
DROP POLICY IF EXISTS "Page sessions read access for authenticated users" ON analytics.page_sessions;
DROP POLICY IF EXISTS "Page sessions insert access for all" ON analytics.page_sessions;

-- Create RLS policies
CREATE POLICY "Analytics read access for authenticated users" 
ON analytics.page_views FOR SELECT TO authenticated USING (true);

CREATE POLICY "Analytics insert access for all" 
ON analytics.page_views FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Unique visitors read access for authenticated users" 
ON analytics.unique_visitors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Unique visitors insert/update access for all" 
ON analytics.unique_visitors FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "CTA clicks read access for authenticated users" 
ON analytics.cta_clicks FOR SELECT TO authenticated USING (true);

CREATE POLICY "CTA clicks insert access for all" 
ON analytics.cta_clicks FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Page sessions read access for authenticated users" 
ON analytics.page_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Page sessions insert access for all" 
ON analytics.page_sessions FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Grant permissions
GRANT USAGE ON SCHEMA analytics TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO authenticated;
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA analytics TO authenticated, anon;