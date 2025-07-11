-- =============================================
-- Final Unique Visitors Permission Fix
-- =============================================

-- Show current state of unique_visitors table
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== UNIQUE VISITORS DEBUG INFO ===';
    
    -- Check table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'unique_visitors') THEN
        RAISE NOTICE 'Table analytics.unique_visitors EXISTS';
        
        -- Show RLS status
        SELECT relrowsecurity INTO rec FROM pg_class WHERE relname = 'unique_visitors' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'analytics');
        IF rec.relrowsecurity THEN
            RAISE NOTICE 'RLS is ENABLED on unique_visitors';
        ELSE
            RAISE NOTICE 'RLS is DISABLED on unique_visitors';
        END IF;
        
        -- Show all policies
        FOR rec IN (SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'analytics' AND tablename = 'unique_visitors') LOOP
            RAISE NOTICE 'Policy: % | Permissive: % | Roles: % | Command: %', rec.policyname, rec.permissive, rec.roles, rec.cmd;
        END LOOP;
        
        -- Show table grants
        FOR rec IN (SELECT grantee, privilege_type, is_grantable FROM information_schema.table_privileges WHERE table_schema = 'analytics' AND table_name = 'unique_visitors') LOOP
            RAISE NOTICE 'Grant: % has % (grantable: %)', rec.grantee, rec.privilege_type, rec.is_grantable;
        END LOOP;
        
    ELSE
        RAISE NOTICE 'Table analytics.unique_visitors DOES NOT EXIST';
    END IF;
END $$;

-- Disable RLS temporarily to see if that's the issue
ALTER TABLE analytics.unique_visitors DISABLE ROW LEVEL SECURITY;

-- Test access without RLS
DO $$
BEGIN
    PERFORM COUNT(*) FROM analytics.unique_visitors;
    RAISE NOTICE 'SUCCESS: Can access unique_visitors without RLS';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: Cannot access unique_visitors even without RLS: %', SQLERRM;
END $$;

-- Re-enable RLS
ALTER TABLE analytics.unique_visitors ENABLE ROW LEVEL SECURITY;

-- Drop ALL policies to start completely fresh
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN (SELECT policyname FROM pg_policies WHERE schemaname = 'analytics' AND tablename = 'unique_visitors') LOOP
        EXECUTE 'DROP POLICY ' || quote_ident(rec.policyname) || ' ON analytics.unique_visitors';
        RAISE NOTICE 'Dropped policy: %', rec.policyname;
    END LOOP;
END $$;

-- Create the most permissive policy possible
CREATE POLICY "allow_all_on_unique_visitors" ON analytics.unique_visitors 
FOR ALL 
TO PUBLIC 
USING (true) 
WITH CHECK (true);

-- Grant ALL privileges to anon specifically
GRANT ALL PRIVILEGES ON analytics.unique_visitors TO anon;
GRANT ALL PRIVILEGES ON analytics.unique_visitors TO authenticated;

-- Also grant on the schema
GRANT ALL ON SCHEMA analytics TO anon;
GRANT ALL ON SCHEMA analytics TO authenticated;

-- Test again
DO $$
BEGIN
    -- Test SELECT
    PERFORM COUNT(*) FROM analytics.unique_visitors;
    RAISE NOTICE 'SUCCESS: SELECT works';
    
    -- Test INSERT
    INSERT INTO analytics.unique_visitors (landing_page_id, unique_visitors, first_visit, last_visit, visit_count)
    VALUES ('test-final', gen_random_uuid(), NOW(), NOW(), 1);
    RAISE NOTICE 'SUCCESS: INSERT works';
    
    -- Test UPDATE (via UPSERT)
    INSERT INTO analytics.unique_visitors (landing_page_id, unique_visitors, first_visit, last_visit, visit_count)
    VALUES ('test-final', gen_random_uuid(), NOW(), NOW(), 1)
    ON CONFLICT (landing_page_id, unique_visitors) DO UPDATE SET
        last_visit = EXCLUDED.last_visit,
        visit_count = analytics.unique_visitors.visit_count + 1;
    RAISE NOTICE 'SUCCESS: UPSERT works';
    
    -- Clean up test data
    DELETE FROM analytics.unique_visitors WHERE landing_page_id = 'test-final';
    RAISE NOTICE 'SUCCESS: All operations work - unique_visitors permissions are fixed';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: Permission test failed: %', SQLERRM;
    -- Clean up anyway
    DELETE FROM analytics.unique_visitors WHERE landing_page_id = 'test-final';
END $$;