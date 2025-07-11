-- AI Marketing Assistant Schema Extensions
-- This migration adds tables and functions to support the AI Marketing Assistant feature

-- Create ai_suggestions table for tracking AI-generated suggestions
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    landing_page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
    
    -- Suggestion details
    suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('performance', 'content', 'conversion', 'engagement', 'seo')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    
    -- Implementation tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'implemented', 'dismissed', 'testing')),
    implemented_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    
    -- Analytics context (snapshot of data when suggestion was made)
    analytics_context JSONB,
    target_section TEXT, -- which section this suggestion applies to
    original_content TEXT, -- content before suggestion
    suggested_content TEXT, -- AI-suggested content
    
    -- AI metadata
    ai_model TEXT DEFAULT 'gpt-4',
    ai_prompt_version TEXT DEFAULT 'v1.0',
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create suggestion_implementations table for tracking what was actually implemented
CREATE TABLE IF NOT EXISTS public.suggestion_implementations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    suggestion_id UUID NOT NULL REFERENCES public.ai_suggestions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Implementation details
    implemented_content TEXT NOT NULL,
    implementation_notes TEXT,
    partial_implementation BOOLEAN DEFAULT FALSE,
    
    -- Before/after tracking
    before_analytics JSONB,
    after_analytics JSONB,
    impact_measured_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_analysis_sessions table for tracking AI analysis runs
CREATE TABLE IF NOT EXISTS public.ai_analysis_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    landing_page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
    
    -- Analysis details
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('full', 'incremental', 'performance', 'content')),
    trigger_event TEXT, -- what triggered this analysis
    
    -- Analytics snapshot
    analytics_snapshot JSONB NOT NULL,
    suggestions_generated INTEGER DEFAULT 0,
    
    -- AI metadata
    ai_model TEXT DEFAULT 'gpt-4',
    processing_time_ms INTEGER,
    tokens_used INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create suggestion_feedback table for user feedback on suggestions
CREATE TABLE IF NOT EXISTS public.suggestion_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    suggestion_id UUID NOT NULL REFERENCES public.ai_suggestions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Feedback details
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    is_helpful BOOLEAN,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON public.ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_landing_page_id ON public.ai_suggestions(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON public.ai_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON public.ai_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_priority ON public.ai_suggestions(priority);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created_at ON public.ai_suggestions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suggestion_implementations_suggestion_id ON public.suggestion_implementations(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_implementations_user_id ON public.suggestion_implementations(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_sessions_user_id ON public.ai_analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_sessions_landing_page_id ON public.ai_analysis_sessions(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_sessions_created_at ON public.ai_analysis_sessions(created_at DESC);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_ai_suggestions_updated_at 
    BEFORE UPDATE ON public.ai_suggestions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for suggestion performance analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.suggestion_performance_mv AS
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
    si.partial_implementation,
    
    -- Time to implementation
    EXTRACT(EPOCH FROM (s.implemented_at - s.created_at))/86400 as days_to_implement,
    
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

-- Create function to refresh suggestion performance materialized view
CREATE OR REPLACE FUNCTION refresh_suggestion_performance_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW analytics.suggestion_performance_mv;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on all new tables
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_implementations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_suggestions
CREATE POLICY "Users can view their own suggestions" ON public.ai_suggestions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suggestions" ON public.ai_suggestions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions" ON public.ai_suggestions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suggestions" ON public.ai_suggestions
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for suggestion_implementations
CREATE POLICY "Users can view their own implementations" ON public.suggestion_implementations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own implementations" ON public.suggestion_implementations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own implementations" ON public.suggestion_implementations
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for ai_analysis_sessions
CREATE POLICY "Users can view their own analysis sessions" ON public.ai_analysis_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis sessions" ON public.ai_analysis_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for suggestion_feedback
CREATE POLICY "Users can view their own feedback" ON public.suggestion_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" ON public.suggestion_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON public.suggestion_feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to get user's analytics summary for AI analysis
CREATE OR REPLACE FUNCTION get_user_analytics_summary(p_user_id UUID, p_landing_page_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH analytics_data AS (
        SELECT 
            -- Page views and visitors
            COALESCE(SUM(pv.view_count), 0) as total_page_views,
            COUNT(DISTINCT pv.visitor_id) as unique_visitors,
            
            -- CTA performance
            COALESCE(SUM(cc.click_count), 0) as total_cta_clicks,
            
            -- Session data
            AVG(ps.duration_seconds) as avg_session_duration,
            
            -- Recent performance (last 7 days)
            COALESCE(SUM(CASE WHEN pv.created_at >= NOW() - INTERVAL '7 days' THEN pv.view_count ELSE 0 END), 0) as recent_page_views,
            COALESCE(SUM(CASE WHEN cc.created_at >= NOW() - INTERVAL '7 days' THEN cc.click_count ELSE 0 END), 0) as recent_cta_clicks
            
        FROM analytics.page_views pv
        LEFT JOIN analytics.cta_clicks cc ON cc.landing_page_id = pv.landing_page_id 
            AND cc.visitor_id = pv.visitor_id
        LEFT JOIN analytics.page_sessions ps ON ps.landing_page_id = pv.landing_page_id 
            AND ps.visitor_id = pv.visitor_id
        WHERE pv.landing_page_id = p_landing_page_id
    ),
    content_data AS (
        SELECT 
            lp.name,
            lp.bio,
            lp.onboarding_data,
            array_length(string_to_array(lp.bio, ' '), 1) as bio_word_count,
            (SELECT COUNT(*) FROM services WHERE landing_page_id = p_landing_page_id) as services_count,
            (SELECT COUNT(*) FROM highlights WHERE landing_page_id = p_landing_page_id) as highlights_count,
            (SELECT COUNT(*) FROM testimonials WHERE landing_page_id = p_landing_page_id) as testimonials_count
        FROM landing_pages lp
        WHERE lp.id = p_landing_page_id AND lp.user_id = p_user_id
    ),
    recent_changes AS (
        SELECT 
            COUNT(*) as content_changes_last_7_days,
            MAX(created_at) as last_content_change
        FROM analytics.content_changes 
        WHERE landing_page_id = p_landing_page_id 
        AND created_at >= NOW() - INTERVAL '7 days'
    )
    
    SELECT jsonb_build_object(
        'analytics', jsonb_build_object(
            'total_page_views', ad.total_page_views,
            'unique_visitors', ad.unique_visitors,
            'total_cta_clicks', ad.total_cta_clicks,
            'avg_session_duration', ROUND(COALESCE(ad.avg_session_duration, 0), 2),
            'recent_page_views', ad.recent_page_views,
            'recent_cta_clicks', ad.recent_cta_clicks,
            'conversion_rate', CASE 
                WHEN ad.total_page_views > 0 
                THEN ROUND((ad.total_cta_clicks::decimal / ad.total_page_views::decimal) * 100, 2)
                ELSE 0 
            END
        ),
        'content', jsonb_build_object(
            'name', cd.name,
            'bio', cd.bio,
            'bio_word_count', cd.bio_word_count,
            'services_count', cd.services_count,
            'highlights_count', cd.highlights_count,
            'testimonials_count', cd.testimonials_count,
            'onboarding_data', cd.onboarding_data
        ),
        'recent_activity', jsonb_build_object(
            'content_changes_last_7_days', rc.content_changes_last_7_days,
            'last_content_change', rc.last_content_change
        ),
        'generated_at', NOW()
    ) INTO result
    FROM analytics_data ad, content_data cd, recent_changes rc;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;