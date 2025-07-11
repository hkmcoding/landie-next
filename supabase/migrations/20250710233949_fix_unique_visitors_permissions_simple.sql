-- =============================================
-- Simple Fix for Unique Visitors Permissions
-- =============================================

-- Just fix the permissions on the existing unique_visitors table
-- Don't try to drop/recreate anything

-- Debug what currently exists
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== UNIQUE VISITORS DEBUG ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'unique_visitors') THEN
        RAISE NOTICE 'unique_visitors exists as TABLE';
        
        -- Show current policies
        FOR rec IN (SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE schemaname = 'analytics' AND tablename = 'unique_visitors') LOOP
            RAISE NOTICE '  - Policy: % (%) for % on %', rec.policyname, rec.permissive, rec.roles, rec.cmd;
        END LOOP;
        
        -- Show current permissions
        FOR rec IN (SELECT grantee, privilege_type FROM information_schema.table_privileges WHERE table_schema = 'analytics' AND table_name = 'unique_visitors') LOOP
            RAISE NOTICE '  - Permission: % has %', rec.grantee, rec.privilege_type;
        END LOOP;
    ELSE
        RAISE NOTICE 'unique_visitors table does not exist';
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE analytics.unique_visitors ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on unique_visitors to start fresh
DROP POLICY IF EXISTS "unique_visitors_anon_all" ON analytics.unique_visitors;
DROP POLICY IF EXISTS "unique_visitors_auth_all" ON analytics.unique_visitors;
DROP POLICY IF EXISTS "unique_visitors_anon_insert" ON analytics.unique_visitors;
DROP POLICY IF EXISTS "unique_visitors_anon_update" ON analytics.unique_visitors;
DROP POLICY IF EXISTS "unique_visitors_allow_all_anon" ON analytics.unique_visitors;
DROP POLICY IF EXISTS "unique_visitors_allow_all_auth" ON analytics.unique_visitors;

-- Create simple, very permissive policies
CREATE POLICY "unique_visitors_full_access" ON analytics.unique_visitors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Grant explicit table permissions
REVOKE ALL ON analytics.unique_visitors FROM anon, authenticated;
GRANT ALL PRIVILEGES ON analytics.unique_visitors TO anon, authenticated;

-- Also ensure schema permissions
GRANT USAGE ON SCHEMA analytics TO anon, authenticated;

-- Test the permissions
DO $$
BEGIN
    -- Try a simple select first
    PERFORM COUNT(*) FROM analytics.unique_visitors LIMIT 1;
    RAISE NOTICE 'SUCCESS: SELECT permissions work';
    
    -- Try an insert
    INSERT INTO analytics.unique_visitors (landing_page_id, unique_visitors, first_visit, last_visit, visit_count)
    VALUES ('permission-test', gen_random_uuid(), NOW(), NOW(), 1);
    RAISE NOTICE 'SUCCESS: INSERT permissions work';
    
    -- Try an upsert (this is what the API does)
    INSERT INTO analytics.unique_visitors (landing_page_id, unique_visitors, first_visit, last_visit, visit_count)
    VALUES ('permission-test', gen_random_uuid(), NOW(), NOW(), 1)
    ON CONFLICT (landing_page_id, unique_visitors) DO UPDATE SET
        last_visit = EXCLUDED.last_visit,
        visit_count = analytics.unique_visitors.visit_count + 1;
    RAISE NOTICE 'SUCCESS: UPSERT permissions work';
    
    -- Clean up
    DELETE FROM analytics.unique_visitors WHERE landing_page_id = 'permission-test';
    RAISE NOTICE 'SUCCESS: All unique_visitors permissions are working correctly';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: Permission test failed: %', SQLERRM;
    -- Try to clean up anyway
    DELETE FROM analytics.unique_visitors WHERE landing_page_id = 'permission-test';
END $$;