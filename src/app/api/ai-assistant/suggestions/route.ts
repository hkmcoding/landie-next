import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiService } from '@/lib/ai/ai-service';
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
    const landingPageId = searchParams.get('landing_page_id');
    const status = searchParams.get('status');

    if (!landingPageId) {
      return NextResponse.json(
        { success: false, error: 'landing_page_id is required' } as APIResponse,
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

    // Get suggestions
    const suggestions = await aiService.getSuggestions(user.id, landingPageId, status || undefined);

    return NextResponse.json({
      success: true,
      data: suggestions
    } as APIResponse);

  } catch (error) {
    console.error('Get suggestions error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get suggestions' 
      } as APIResponse,
      { status: 500 }
    );
  }
}