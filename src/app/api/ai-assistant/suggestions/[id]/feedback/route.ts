import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiService } from '@/lib/ai/ai-service';
import { APIResponse } from '@/types/ai-assistant';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const suggestionId = params.id;
    if (!suggestionId) {
      return NextResponse.json(
        { success: false, error: 'Suggestion ID is required' } as APIResponse,
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { rating, feedback_text, is_helpful } = body;

    // Validate rating if provided
    if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json(
        { success: false, error: 'Rating must be a number between 1 and 5' } as APIResponse,
        { status: 400 }
      );
    }

    // Verify user owns the suggestion
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

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('suggestion_feedback')
      .select('id')
      .eq('suggestion_id', suggestionId)
      .eq('user_id', user.id)
      .single();

    if (existingFeedback) {
      // Update existing feedback
      const { error: updateError } = await supabase
        .from('suggestion_feedback')
        .update({
          rating,
          feedback_text,
          is_helpful
        })
        .eq('id', existingFeedback.id);

      if (updateError) {
        throw new Error(`Failed to update feedback: ${updateError.message}`);
      }
    } else {
      // Create new feedback
      await aiService.provideFeedback(
        suggestionId,
        user.id,
        rating,
        feedback_text,
        is_helpful
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback saved successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save feedback' 
      } as APIResponse,
      { status: 500 }
    );
  }
}