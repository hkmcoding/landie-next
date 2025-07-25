import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiService } from '@/lib/ai/ai-service';
import { AIAnalysisRequest, APIResponse } from '@/types/ai-assistant';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as APIResponse,
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { landing_page_id, analysis_type = 'full', trigger_event, force_refresh } = body;

    if (!landing_page_id) {
      return NextResponse.json(
        { success: false, error: 'landing_page_id is required' } as APIResponse,
        { status: 400 }
      );
    }

    // Verify user owns the landing page
    const { data: landingPage, error: pageError } = await supabase
      .from('landing_pages')
      .select('id, user_id')
      .eq('id', landing_page_id)
      .eq('user_id', user.id)
      .single();

    if (pageError || !landingPage) {
      return NextResponse.json(
        { success: false, error: 'Landing page not found or access denied' } as APIResponse,
        { status: 403 }
      );
    }

    // Get user pro status
    const { data: proStatus, error: proError } = await supabase
      .from('user_pro_status')
      .select('is_pro')
      .eq('user_id', user.id)
      .single();

    console.log('🔍 DEBUG AI Analysis - User ID:', user.id);
    console.log('🔍 DEBUG AI Analysis - Pro Status:', proStatus);
    console.log('🔍 DEBUG AI Analysis - Pro Error:', proError);

    // Check if this is a dev route request
    const referer = request.headers.get('referer');
    const isDevRoute = referer?.includes('/dev/');
    
    console.log('🔍 DEBUG AI Analysis - Referer:', referer);
    console.log('🔍 DEBUG AI Analysis - Is Dev Route:', isDevRoute);
    console.log('🔍 DEBUG AI Analysis - Is Pro:', proStatus?.is_pro);
    
    // Only allow access for pro users or dev routes
    if (!proStatus?.is_pro && !isDevRoute) {
      console.log('🔍 DEBUG AI Analysis - BLOCKED: Not pro and not dev route');
      return NextResponse.json(
        { success: false, error: 'Pro subscription required for AI analysis features' } as APIResponse,
        { status: 403 }
      );
    }

    // Check for recent analysis (unless force_refresh is true)
    if (!force_refresh) {
      const { data: recentAnalysis } = await supabase
        .from('ai_analysis_sessions')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('landing_page_id', landing_page_id)
        .eq('analysis_type', analysis_type)
        .gte('created_at', new Date(Date.now() - 1000 * 60 * 60).toISOString()) // Last hour
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentAnalysis) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Analysis was performed recently. Use force_refresh=true to override.',
            data: { last_analysis: recentAnalysis.created_at }
          } as APIResponse,
          { status: 429 }
        );
      }
    }

    // Perform AI analysis
    const analysisRequest: AIAnalysisRequest = {
      user_id: user.id,
      landing_page_id,
      analysis_type,
      trigger_event,
      force_refresh
    };

    const result = await aiService.analyzeUserData(analysisRequest, supabase);

    // Update AI usage count (skipped in dev mode)
    // if (proStatus) {
    //   await supabase
    //     .from('user_pro_status')
    //     .update({ ai_uses_remaining: Math.max(0, proStatus.ai_uses_remaining - 1) })
    //     .eq('user_id', user.id);
    // }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Analysis completed successfully'
    } as APIResponse);

  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Analysis failed' 
      } as APIResponse,
      { status: 500 }
    );
  }
}