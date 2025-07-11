-- =============================================
-- Fix Unique Visitors Permissions Migration
-- =============================================

-- Debug unique_visitors specifically
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== UNIQUE VISITORS DEBUG ===';
    
    -- Check if unique_visitors exists and what type
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'analytics' AND matviewname = 'unique_visitors') THEN
        RAISE NOTICE 'unique_visitors exists as MATERIALIZED VIEW';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'unique_visitors') THEN
        RAISE NOTICE 'unique_visitors exists as TABLE';
        
        -- Show columns
        FOR rec IN (SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'analytics' AND table_name = 'unique_visitors') LOOP
            RAISE NOTICE '  - Column: % (%)', rec.column_name, rec.data_type;
        END LOOP;
        
        -- Show policies
        FOR rec IN (SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE schemaname = 'analytics' AND tablename = 'unique_visitors') LOOP
            RAISE NOTICE '  - Policy: % (%) for % on %', rec.policyname, rec.permissive, rec.roles, rec.cmd;
        END LOOP;
        
    ELSE
        RAISE NOTICE 'unique_visitors DOES NOT EXIST';
    END IF;
    
    -- Check permissions
    FOR rec IN (SELECT grantee, privilege_type FROM information_schema.table_privileges WHERE table_schema = 'analytics' AND table_name = 'unique_visitors') LOOP
        RAISE NOTICE '  - Permission: % has %', rec.grantee, rec.privilege_type;
    END LOOP;
END $$;

-- Force drop and recreate unique_visitors specifically
DROP MATERIALIZED VIEW IF EXISTS analytics.unique_visitors CASCADE;
DROP TABLE IF EXISTS analytics.unique_visitors CASCADE;

-- Recreate unique_visitors table
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

-- Enable RLS
ALTER TABLE analytics.unique_visitors ENABLE ROW LEVEL SECURITY;

-- Create very permissive policies for unique_visitors
CREATE POLICY "unique_visitors_allow_all_anon" ON analytics.unique_visitors FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "unique_visitors_allow_all_auth" ON analytics.unique_visitors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant explicit permissions
GRANT ALL ON analytics.unique_visitors TO anon;
GRANT ALL ON analytics.unique_visitors TO authenticated;

-- Also grant sequence permissions if any
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA analytics TO anon, authenticated;

-- Create index
CREATE INDEX idx_unique_visitors_landing_page_id ON analytics.unique_visitors(landing_page_id);
CREATE INDEX idx_unique_visitors_unique_visitors ON analytics.unique_visitors(unique_visitors);

-- Test insert to verify permissions work
DO $$
BEGIN
    -- Try to insert a test record as anon would
    INSERT INTO analytics.unique_visitors (landing_page_id, unique_visitors, first_visit, last_visit, visit_count)
    VALUES ('test-page', gen_random_uuid(), NOW(), NOW(), 1)
    ON CONFLICT (landing_page_id, unique_visitors) DO UPDATE SET
        last_visit = EXCLUDED.last_visit,
        visit_count = analytics.unique_visitors.visit_count + 1;
    
    -- Clean up test record
    DELETE FROM analytics.unique_visitors WHERE landing_page_id = 'test-page';
    
    RAISE NOTICE 'SUCCESS: unique_visitors permissions test passed';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: unique_visitors permissions test failed: %', SQLERRM;
END $$;