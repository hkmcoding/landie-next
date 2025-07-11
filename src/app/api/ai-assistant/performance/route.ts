import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyticsProcessor } from '@/lib/ai/analytics-processor';
import { APIResponse } from '@/types/ai-assistant';

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const suggestionId = searchParams.get('suggestion_id');
    const landingPageId = searchParams.get('landing_page_id');

    if (suggestionId) {
      // Get performance for a specific suggestion
      const { data: suggestion, error: suggestionError } = await supabase
        .from('ai_suggestions')
        .select('id, user_id')
        .eq('id', suggestionId)
        .eq('user_id', user.id)
        .single();

      if (suggestionError || !suggestion) {
        return NextResponse.json(
          { success: false, error: 'Suggestion not found or access denied' } as APIResponse,
          { status: 403 }
        );
      }

      const performance = await analyticsProcessor.getSuggestionPerformance(suggestionId);
      
      return NextResponse.json({
        success: true,
        data: performance
      } as APIResponse);
      
    } else if (landingPageId) {
      // Get overall performance dashboard for landing page
      const { data: landingPage, error: pageError } = await supabase
        .from('landing_pages')
        .select('id')
        .eq('id', landingPageId)
        .eq('user_id', user.id)
        .single();

      if (pageError || !landingPage) {
        return NextResponse.json(
          { success: false, error: 'Landing page not found or access denied' } as APIResponse,
          { status: 403 }
        );
      }

      // Get performance overview for the landing page
      const { data: performanceData, error: perfError } = await supabase
        .from('suggestion_performance_mv')
        .select('*')
        .eq('user_id', user.id)
        .eq('landing_page_id', landingPageId);

      if (perfError) {
        throw new Error(`Failed to get performance data: ${perfError.message}`);
      }

      // Calculate overall metrics
      const totalSuggestions = performanceData?.length || 0;
      const implementedSuggestions = performanceData?.filter(p => p.was_implemented).length || 0;
      const dismissedSuggestions = performanceData?.filter(p => p.status === 'dismissed').length || 0;
      
      const implementationTimes = performanceData?.filter(p => p.days_to_implement).map(p => p.days_to_implement) || [];
      const avgImplementationTime = implementationTimes.length > 0 
        ? implementationTimes.reduce((sum, time) => sum + time, 0) / implementationTimes.length 
        : 0;

      // Calculate improvement rate based on implementations with before/after data
      const implementationsWithData = performanceData?.filter(p => 
        p.was_implemented && p.before_page_views && p.after_page_views
      ) || [];
      
      const improvements = implementationsWithData.map(p => {
        const beforeConversion = p.before_page_views > 0 ? (p.before_cta_clicks / p.before_page_views) * 100 : 0;
        const afterConversion = p.after_page_views > 0 ? (p.after_cta_clicks / p.after_page_views) * 100 : 0;
        return afterConversion - beforeConversion;
      });
      
      const positiveImprovements = improvements.filter(imp => imp > 0).length;
      const overallImprovementRate = implementationsWithData.length > 0 
        ? (positiveImprovements / implementationsWithData.length) * 100 
        : 0;

      const dashboard = {
        performance_overview: {
          total_suggestions: totalSuggestions,
          implemented_suggestions: implementedSuggestions,
          dismissed_suggestions: dismissedSuggestions,
          avg_implementation_time_days: Math.round(avgImplementationTime * 10) / 10,
          overall_improvement_rate: Math.round(overallImprovementRate * 10) / 10
        },
        recent_implementations: performanceData?.filter(p => p.was_implemented)
          .sort((a, b) => new Date(b.implemented_at || '').getTime() - new Date(a.implemented_at || '').getTime())
          .slice(0, 5) || [],
        top_performing_suggestions: performanceData?.filter(p => p.user_rating && p.user_rating >= 4)
          .sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0))
          .slice(0, 5) || []
      };

      return NextResponse.json({
        success: true,
        data: dashboard
      } as APIResponse);
      
    } else {
      return NextResponse.json(
        { success: false, error: 'Either suggestion_id or landing_page_id is required' } as APIResponse,
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Performance error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get performance data' 
      } as APIResponse,
      { status: 500 }
    );
  }
}

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
    const { implementation_id } = body;

    if (!implementation_id) {
      return NextResponse.json(
        { success: false, error: 'implementation_id is required' } as APIResponse,
        { status: 400 }
      );
    }

    // Verify user owns the implementation
    const { data: implementation, error: implError } = await supabase
      .from('suggestion_implementations')
      .select('id, user_id')
      .eq('id', implementation_id)
      .eq('user_id', user.id)
      .single();

    if (implError || !implementation) {
      return NextResponse.json(
        { success: false, error: 'Implementation not found or access denied' } as APIResponse,
        { status: 403 }
      );
    }

    // Measure impact
    await analyticsProcessor.measureImpact(implementation_id);

    return NextResponse.json({
      success: true,
      message: 'Impact measurement completed'
    } as APIResponse);

  } catch (error) {
    console.error('Impact measurement error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to measure impact' 
      } as APIResponse,
      { status: 500 }
    );
  }
}