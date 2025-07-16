import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiService } from '@/lib/ai/ai-service';
import { SuggestionActionRequest, APIResponse } from '@/types/ai-assistant';

export async function PATCH(
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

    const suggestionId = (await params).id;
    if (!suggestionId) {
      return NextResponse.json(
        { success: false, error: 'Suggestion ID is required' } as APIResponse,
        { status: 400 }
      );
    }

    // Parse request body
    const body: SuggestionActionRequest = await request.json();
    const { action, implementation_content, implementation_notes, partial_implementation } = body;

    if (!action || !['implement', 'dismiss', 'test'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Valid action is required (implement, dismiss, test)' } as APIResponse,
        { status: 400 }
      );
    }

    // Verify user owns the suggestion
    const { data: suggestion, error: suggestionError } = await supabase
      .from('ai_suggestions')
      .select('id, user_id, status')
      .eq('id', suggestionId)
      .eq('user_id', user.id)
      .single();

    if (suggestionError || !suggestion) {
      return NextResponse.json(
        { success: false, error: 'Suggestion not found or access denied' } as APIResponse,
        { status: 403 }
      );
    }

    if (suggestion.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot ${action} suggestion with status: ${suggestion.status}` } as APIResponse,
        { status: 400 }
      );
    }

    let result: any = {};

    // Handle different actions
    switch (action) {
      case 'implement':
        if (!implementation_content) {
          return NextResponse.json(
            { success: false, error: 'implementation_content is required for implement action' } as APIResponse,
            { status: 400 }
          );
        }
        
        await aiService.implementSuggestion(
          suggestionId,
          implementation_content,
          implementation_notes,
          partial_implementation,
          supabase
        );
        
        result.message = 'Suggestion implemented successfully';
        break;

      case 'dismiss':
        await aiService.dismissSuggestion(suggestionId, supabase);
        result.message = 'Suggestion dismissed successfully';
        break;

      case 'test':
        // Update status to testing
        const { error: updateError } = await supabase
          .from('ai_suggestions')
          .update({ status: 'testing' })
          .eq('id', suggestionId);

        if (updateError) {
          throw new Error(`Failed to update suggestion status: ${updateError.message}`);
        }
        
        result.message = 'Suggestion marked for testing';
        break;
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message
    } as APIResponse);

  } catch (error) {
    console.error('Suggestion action error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Action failed' 
      } as APIResponse,
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const suggestionId = (await params).id;

    // Delete suggestion (this will cascade to related tables)
    const { error: deleteError } = await supabase
      .from('ai_suggestions')
      .delete()
      .eq('id', suggestionId)
      .eq('user_id', user.id);

    if (deleteError) {
      throw new Error(`Failed to delete suggestion: ${deleteError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Suggestion deleted successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Delete suggestion error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Delete failed' 
      } as APIResponse,
      { status: 500 }
    );
  }
}