-- Fix RLS Policies for AI Service
-- This migration fixes RLS policies to allow proper server-side AI service operations

-- Update RLS policies for ai_analysis_sessions to allow server-side operations
DROP POLICY IF EXISTS "Users can insert their own analysis sessions" ON public.ai_analysis_sessions;
DROP POLICY IF EXISTS "Users can view their own analysis sessions" ON public.ai_analysis_sessions;

-- More flexible policies that work with server-side operations
CREATE POLICY "Users can view their own analysis sessions" ON public.ai_analysis_sessions
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (current_setting('role') = 'service_role')
    );

CREATE POLICY "Users can insert their own analysis sessions" ON public.ai_analysis_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        (current_setting('role') = 'service_role')
    );

-- Update RLS policies for ai_suggestions to allow server-side operations
DROP POLICY IF EXISTS "Users can insert their own suggestions" ON public.ai_suggestions;
DROP POLICY IF EXISTS "Users can view their own suggestions" ON public.ai_suggestions;
DROP POLICY IF EXISTS "Users can update their own suggestions" ON public.ai_suggestions;
DROP POLICY IF EXISTS "Users can delete their own suggestions" ON public.ai_suggestions;

CREATE POLICY "Users can view their own suggestions" ON public.ai_suggestions
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (current_setting('role') = 'service_role')
    );

CREATE POLICY "Users can insert their own suggestions" ON public.ai_suggestions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        (current_setting('role') = 'service_role')
    );

CREATE POLICY "Users can update their own suggestions" ON public.ai_suggestions
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        (current_setting('role') = 'service_role')
    );

CREATE POLICY "Users can delete their own suggestions" ON public.ai_suggestions
    FOR DELETE USING (
        auth.uid() = user_id OR 
        (current_setting('role') = 'service_role')
    );

-- Update RLS policies for suggestion_implementations to allow server-side operations
DROP POLICY IF EXISTS "Users can insert their own implementations" ON public.suggestion_implementations;
DROP POLICY IF EXISTS "Users can view their own implementations" ON public.suggestion_implementations;
DROP POLICY IF EXISTS "Users can update their own implementations" ON public.suggestion_implementations;

CREATE POLICY "Users can view their own implementations" ON public.suggestion_implementations
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (current_setting('role') = 'service_role')
    );

CREATE POLICY "Users can insert their own implementations" ON public.suggestion_implementations
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        (current_setting('role') = 'service_role')
    );

CREATE POLICY "Users can update their own implementations" ON public.suggestion_implementations
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        (current_setting('role') = 'service_role')
    );

-- Update RLS policies for suggestion_feedback to allow server-side operations
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.suggestion_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.suggestion_feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON public.suggestion_feedback;

CREATE POLICY "Users can view their own feedback" ON public.suggestion_feedback
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (current_setting('role') = 'service_role')
    );

CREATE POLICY "Users can insert their own feedback" ON public.suggestion_feedback
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        (current_setting('role') = 'service_role')
    );

CREATE POLICY "Users can update their own feedback" ON public.suggestion_feedback
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        (current_setting('role') = 'service_role')
    );