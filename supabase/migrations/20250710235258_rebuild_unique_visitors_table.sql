-- =============================================
-- Rebuild Unique Visitors Table From Scratch
-- =============================================

-- Drop the problematic unique_visitors table completely
DROP TABLE IF EXISTS analytics.unique_visitors CASCADE;

-- Create a new, simplified unique_visitors table
CREATE TABLE analytics.unique_visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id TEXT NOT NULL,
    visitor_id UUID NOT NULL,
    first_visit TIMESTAMPTZ DEFAULT NOW(),
    last_visit TIMESTAMPTZ DEFAULT NOW(),
    visit_count INTEGER DEFAULT 1,
    referrer TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Create unique constraint on landing_page_id + visitor_id
    UNIQUE(landing_page_id, visitor_id)
);

-- Create indexes for performance
CREATE INDEX idx_unique_visitors_landing_page_id ON analytics.unique_visitors(landing_page_id);
CREATE INDEX idx_unique_visitors_visitor_id ON analytics.unique_visitors(visitor_id);
CREATE INDEX idx_unique_visitors_last_visit ON analytics.unique_visitors(last_visit DESC);

-- Enable RLS
ALTER TABLE analytics.unique_visitors ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policy
CREATE POLICY "unique_visitors_full_access" 
ON analytics.unique_visitors 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Grant explicit permissions
GRANT ALL PRIVILEGES ON analytics.unique_visitors TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA analytics TO anon, authenticated;

-- Test the new table
DO $$
DECLARE
    test_visitor_id UUID;
    test_landing_page_id TEXT := 'test-rebuild';
BEGIN
    test_visitor_id := gen_random_uuid();
    
    -- Test INSERT
    INSERT INTO analytics.unique_visitors (landing_page_id, visitor_id, first_visit, last_visit, visit_count, referrer)
    VALUES (test_landing_page_id, test_visitor_id, NOW(), NOW(), 1, 'https://google.com');
    RAISE NOTICE 'SUCCESS: INSERT works';
    
    -- Test UPSERT (this is what the API will do)
    INSERT INTO analytics.unique_visitors (landing_page_id, visitor_id, first_visit, last_visit, visit_count, referrer)
    VALUES (test_landing_page_id, test_visitor_id, NOW(), NOW(), 1, 'https://google.com')
    ON CONFLICT (landing_page_id, visitor_id) 
    DO UPDATE SET 
        last_visit = EXCLUDED.last_visit,
        visit_count = analytics.unique_visitors.visit_count + 1,
        updated_at = NOW();
    RAISE NOTICE 'SUCCESS: UPSERT works';
    
    -- Test SELECT
    PERFORM COUNT(*) FROM analytics.unique_visitors WHERE landing_page_id = test_landing_page_id;
    RAISE NOTICE 'SUCCESS: SELECT works';
    
    -- Clean up
    DELETE FROM analytics.unique_visitors WHERE landing_page_id = test_landing_page_id;
    RAISE NOTICE 'SUCCESS: All operations work on new unique_visitors table';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: Test failed: %', SQLERRM;
    -- Clean up anyway
    DELETE FROM analytics.unique_visitors WHERE landing_page_id = test_landing_page_id;
END $$;