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
    let landingPageId = searchParams.get('landing_page_id');
    const type = searchParams.get('type') || 'summary';
    const days = parseInt(searchParams.get('days') || '30');

    if (!landingPageId) {
      return NextResponse.json(
        { success: false, error: 'landing_page_id is required' } as APIResponse,
        { status: 400 }
      );
    }

    // Ensure landingPageId is a valid UUID string
    if (!/^[0-9a-fA-F-]{36}$/.test(landingPageId)) {
      return NextResponse.json(
        { success: false, error: 'landing_page_id must be a valid UUID' } as APIResponse,
        { status: 400 }
      );
    }

    // Verify user owns the landing page
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

    // Check for pro status (required for AI analytics access)
    const { data: proStatus } = await supabase
      .from('user_pro_status')
      .select('is_pro')
      .eq('user_id', user.id)
      .single();

    // Check if this is a dev route request
    const url = new URL(request.url);
    const referer = request.headers.get('referer');
    const isDevRoute = referer?.includes('/dev/') || url.pathname.startsWith('/dev/');
    
    // Only allow access for pro users or dev routes
    if (!proStatus?.is_pro && !isDevRoute) {
      return NextResponse.json(
        { success: false, error: 'Pro subscription required for AI analytics features' } as APIResponse,
        { status: 403 }
      );
    }

    let data: any = {};

    switch (type) {
      case 'trends':
        data = await analyticsProcessor.getAnalyticsTrends(user.id, landingPageId, days);
        break;
        
      case 'sections':
        data = await analyticsProcessor.getSectionPerformance(landingPageId);
        break;
        
      case 'summary':
      default:
        // Get analytics summary using the database function
        const { data: summary, error: summaryError } = await supabase
          .rpc('get_user_analytics_summary', {
            p_user_id: user.id,
            p_landing_page_id: landingPageId
          });

        if (summaryError) {
          throw new Error(`Failed to get analytics summary: ${summaryError.message}`);
        }
        
        data = summary;
        break;
    }

    return NextResponse.json({
      success: true,
      data
    } as APIResponse);

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get analytics' 
      } as APIResponse,
      { status: 500 }
    );
  }
}