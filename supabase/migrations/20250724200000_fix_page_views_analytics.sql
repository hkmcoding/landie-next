-- Fix the page views analytics function to correctly handle column naming

-- Drop and recreate the function with corrected column references
CREATE OR REPLACE FUNCTION "public"."get_user_analytics_summary"("p_user_id" "uuid", "p_landing_page_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result JSONB;
BEGIN
    WITH analytics_data AS (
        SELECT 
            COALESCE(COUNT(pv.id), 0) as total_page_views,
            COALESCE(COUNT(DISTINCT pv.viewer_id), 0) as unique_visitors,
            COALESCE((SELECT COUNT(*) FROM analytics.cta_clicks WHERE landing_page_id = p_landing_page_id), 0) as total_cta_clicks,
            COALESCE(AVG(COALESCE(ps.duration_seconds, 0)), 0) as avg_session_duration,
            COALESCE(COUNT(CASE WHEN pv.created_at >= NOW() - INTERVAL '7 days' THEN 1 END), 0) as recent_page_views,
            COALESCE((SELECT COUNT(*) FROM analytics.cta_clicks WHERE landing_page_id = p_landing_page_id AND created_at >= NOW() - INTERVAL '7 days'), 0) as recent_cta_clicks
        FROM analytics.page_views pv
        LEFT JOIN analytics.page_sessions ps ON ps.landing_page_id = pv.landing_page_id 
            AND ps.visitor_id = pv.viewer_id  -- Fixed: match viewer_id from page_views to visitor_id in page_sessions
            AND ps.session_id = pv.session_id -- Additional join condition for better accuracy
        WHERE pv.landing_page_id = p_landing_page_id
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
$$;