-- Fix Analytics Function to Match Existing Schema
-- This corrects the get_user_analytics_summary function to use actual column names

-- Fix the get_user_analytics_summary function to match existing analytics tables
CREATE OR REPLACE FUNCTION get_user_analytics_summary(p_user_id UUID, p_landing_page_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH analytics_data AS (
        SELECT 
            -- Page views and visitors (using correct column names)
            COALESCE(COUNT(pv.id), 0) as total_page_views,
            COALESCE(COUNT(DISTINCT pv.viewer_id), 0) as unique_visitors,
            
            -- CTA performance (cta_clicks doesn't have visitor_id, so we count by landing_page_id)
            COALESCE((SELECT COUNT(*) FROM analytics.cta_clicks WHERE landing_page_id = p_landing_page_id::text), 0) as total_cta_clicks,
            
            -- Session data (using duration_seconds from page_sessions)
            COALESCE(AVG(COALESCE(ps.duration_seconds, 0)), 0) as avg_session_duration,
            
            -- Recent performance (last 7 days)
            COALESCE(COUNT(CASE WHEN pv.created_at >= NOW() - INTERVAL '7 days' THEN 1 END), 0) as recent_page_views,
            COALESCE((SELECT COUNT(*) FROM analytics.cta_clicks WHERE landing_page_id = p_landing_page_id::text AND created_at >= NOW() - INTERVAL '7 days'), 0) as recent_cta_clicks
            
        FROM analytics.page_views pv
        LEFT JOIN analytics.page_sessions ps ON ps.landing_page_id = pv.landing_page_id 
            AND ps.visitor_id = pv.viewer_id
        WHERE pv.landing_page_id = p_landing_page_id::text
    ),
    content_data AS (
        SELECT 
            COALESCE(lp.name, 'Unnamed Page') as name,
            COALESCE(lp.bio, '') as bio,
            lp.onboarding_data,
            COALESCE(array_length(string_to_array(COALESCE(lp.bio, ''), ' '), 1), 0) as bio_word_count,
            COALESCE((SELECT COUNT(*) FROM services WHERE landing_page_id = p_landing_page_id), 0) as services_count,
            COALESCE((SELECT COUNT(*) FROM highlights WHERE landing_page_id = p_landing_page_id), 0) as highlights_count,
            COALESCE((SELECT COUNT(*) FROM testimonials WHERE landing_page_id = p_landing_page_id), 0) as testimonials_count
        FROM landing_pages lp
        WHERE lp.id = p_landing_page_id AND lp.user_id = p_user_id
    ),
    recent_changes AS (
        SELECT 
            0 as content_changes_last_7_days,
            NULL::timestamptz as last_content_change
        -- Note: content_changes table structure is not clear from migrations, so defaulting to 0
    )
    
    SELECT jsonb_build_object(
        'analytics', jsonb_build_object(
            'total_page_views', COALESCE(ad.total_page_views, 0),
            'unique_visitors', COALESCE(ad.unique_visitors, 0),
            'total_cta_clicks', COALESCE(ad.total_cta_clicks, 0),
            'avg_session_duration', ROUND(COALESCE(ad.avg_session_duration, 0), 2),
            'recent_page_views', COALESCE(ad.recent_page_views, 0),
            'recent_cta_clicks', COALESCE(ad.recent_cta_clicks, 0),
            'conversion_rate', CASE 
                WHEN COALESCE(ad.total_page_views, 0) > 0 
                THEN ROUND((COALESCE(ad.total_cta_clicks, 0)::decimal / COALESCE(ad.total_page_views, 1)::decimal) * 100, 2)
                ELSE 0 
            END
        ),
        'content', jsonb_build_object(
            'name', COALESCE(cd.name, 'Unnamed Page'),
            'bio', COALESCE(cd.bio, ''),
            'bio_word_count', COALESCE(cd.bio_word_count, 0),
            'services_count', COALESCE(cd.services_count, 0),
            'highlights_count', COALESCE(cd.highlights_count, 0),
            'testimonials_count', COALESCE(cd.testimonials_count, 0),
            'onboarding_data', cd.onboarding_data
        ),
        'recent_activity', jsonb_build_object(
            'content_changes_last_7_days', COALESCE(rc.content_changes_last_7_days, 0),
            'last_content_change', rc.last_content_change
        ),
        'generated_at', NOW()
    ) INTO result
    FROM analytics_data ad, content_data cd, recent_changes rc;
    
    -- If no result, return default values
    IF result IS NULL THEN
        result := jsonb_build_object(
            'analytics', jsonb_build_object(
                'total_page_views', 0,
                'unique_visitors', 0,
                'total_cta_clicks', 0,
                'avg_session_duration', 0,
                'recent_page_views', 0,
                'recent_cta_clicks', 0,
                'conversion_rate', 0
            ),
            'content', jsonb_build_object(
                'name', 'Unnamed Page',
                'bio', '',
                'bio_word_count', 0,
                'services_count', 0,
                'highlights_count', 0,
                'testimonials_count', 0,
                'onboarding_data', null
            ),
            'recent_activity', jsonb_build_object(
                'content_changes_last_7_days', 0,
                'last_content_change', null
            ),
            'generated_at', NOW()
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the materialized view in the public schema (not analytics)
DROP MATERIALIZED VIEW IF EXISTS suggestion_performance_mv;
DROP MATERIALIZED VIEW IF EXISTS analytics.suggestion_performance_mv;

CREATE MATERIALIZED VIEW suggestion_performance_mv AS
SELECT 
    s.id as suggestion_id,
    s.user_id,
    s.landing_page_id,
    s.suggestion_type,
    s.priority,
    s.status,
    s.created_at,
    s.implemented_at,
    
    -- Implementation metrics
    CASE WHEN si.id IS NOT NULL THEN TRUE ELSE FALSE END as was_implemented,
    COALESCE(si.partial_implementation, false) as partial_implementation,
    
    -- Time to implementation
    CASE 
        WHEN s.implemented_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (s.implemented_at - s.created_at))/86400 
        ELSE NULL 
    END as days_to_implement,
    
    -- Feedback metrics
    sf.rating as user_rating,
    sf.is_helpful,
    
    -- Analytics impact (if measured)
    si.before_analytics->>'page_views' as before_page_views,
    si.after_analytics->>'page_views' as after_page_views,
    si.before_analytics->>'cta_clicks' as before_cta_clicks,
    si.after_analytics->>'cta_clicks' as after_cta_clicks
    
FROM public.ai_suggestions s
LEFT JOIN public.suggestion_implementations si ON s.id = si.suggestion_id
LEFT JOIN public.suggestion_feedback sf ON s.id = sf.suggestion_id;

-- Grant permissions
GRANT SELECT ON suggestion_performance_mv TO authenticated;