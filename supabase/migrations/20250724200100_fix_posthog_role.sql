-- Remove PostHog references since we're no longer using PostHog

-- Remove any grants to posthog_exporter (this will fail silently if role doesn't exist)
DO $$
BEGIN
    -- Revoke grants if the role exists
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'posthog_exporter') THEN
        REVOKE ALL ON SCHEMA "analytics" FROM "posthog_exporter";
        REVOKE ALL ON ALL TABLES IN SCHEMA "analytics" FROM "posthog_exporter";
        DROP ROLE "posthog_exporter";
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if role doesn't exist or has dependencies
        NULL;
END
$$;