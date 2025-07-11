import OpenAI from 'openai';
import { 
  AIAnalysisRequest, 
  AIAnalysisResponse, 
  AISuggestion, 
  UserAnalyticsSummary,
  AIAnalysisSession 
} from '@/types/ai-assistant';
import { createClient } from '@/lib/supabase/client';

class AIService {
  private openai: OpenAI;
  private supabase = createClient();

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeUserData(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const startTime = Date.now();
    
    try {
      // Get analytics summary from database
      const analyticsSummary = await this.getAnalyticsSummary(
        request.user_id, 
        request.landing_page_id
      );

      // Get existing suggestions to avoid duplicates
      const existingSuggestions = await this.getExistingSuggestions(
        request.user_id,
        request.landing_page_id
      );

      // Generate AI analysis and suggestions
      const aiResponse = await this.generateSuggestions(
        analyticsSummary,
        existingSuggestions,
        request.analysis_type
      );

      // Save analysis session
      const sessionId = await this.saveAnalysisSession({
        user_id: request.user_id,
        landing_page_id: request.landing_page_id,
        analysis_type: request.analysis_type,
        trigger_event: request.trigger_event,
        analytics_snapshot: analyticsSummary.analytics,
        suggestions_generated: aiResponse.suggestions.length,
        ai_model: 'gpt-4',
        processing_time_ms: Date.now() - startTime,
        tokens_used: aiResponse.tokensUsed,
      });

      // Save suggestions to database
      const savedSuggestions = await this.saveSuggestions(
        aiResponse.suggestions.map(s => ({
          ...s,
          user_id: request.user_id,
          landing_page_id: request.landing_page_id,
          analytics_context: analyticsSummary.analytics,
        }))
      );

      return {
        session_id: sessionId,
        suggestions: savedSuggestions,
        analytics_summary: analyticsSummary,
        processing_time_ms: Date.now() - startTime,
        tokens_used: aiResponse.tokensUsed,
      };

    } catch (error) {
      console.error('AI analysis error:', error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getAnalyticsSummary(userId: string, landingPageId: string): Promise<UserAnalyticsSummary> {
    const { data, error } = await this.supabase
      .rpc('get_user_analytics_summary', {
        p_user_id: userId,
        p_landing_page_id: landingPageId
      });

    if (error) {
      throw new Error(`Failed to get analytics summary: ${error.message}`);
    }

    return data as UserAnalyticsSummary;
  }

  private async getExistingSuggestions(userId: string, landingPageId: string): Promise<AISuggestion[]> {
    const { data, error } = await this.supabase
      .from('ai_suggestions')
      .select('*')
      .eq('user_id', userId)
      .eq('landing_page_id', landingPageId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get existing suggestions: ${error.message}`);
    }

    return data || [];
  }

  private async generateSuggestions(
    analyticsSummary: UserAnalyticsSummary,
    existingSuggestions: AISuggestion[],
    analysisType: string
  ): Promise<{ suggestions: Partial<AISuggestion>[], tokensUsed: number }> {
    
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(analyticsSummary, existingSuggestions, analysisType);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    try {
      const parsed = JSON.parse(response);
      return {
        suggestions: parsed.suggestions || [],
        tokensUsed: completion.usage?.total_tokens || 0
      };
    } catch (error) {
      throw new Error('Failed to parse AI response');
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert marketing analyst and conversion optimization specialist. Your job is to analyze landing page performance data and provide actionable, specific suggestions to improve conversions and user engagement.

ANALYSIS FRAMEWORK:
1. Performance Issues: Low conversion rates, high bounce rates, drop-off points
2. Content Optimization: Headlines, copy, value propositions, call-to-actions
3. User Experience: Navigation, layout, mobile experience
4. Conversion Optimization: CTA placement, forms, social proof
5. SEO & Discovery: Meta tags, content structure, keywords

SUGGESTION CRITERIA:
- Be specific and actionable (avoid generic advice)
- Prioritize based on potential impact vs effort
- Consider the user's specific analytics data
- Provide clear reasoning backed by data
- Suggest concrete copy or content improvements
- Consider the user's industry and target audience

RESPONSE FORMAT:
Return a JSON object with this structure:
{
  "suggestions": [
    {
      "suggestion_type": "performance|content|conversion|engagement|seo",
      "title": "Clear, actionable title",
      "description": "Detailed description of what to do",
      "reasoning": "Why this suggestion will help, backed by their data",
      "priority": "high|medium|low",
      "target_section": "bio|services|highlights|testimonials|cta|header",
      "suggested_content": "Specific copy or content suggestions if applicable",
      "confidence_score": 0.8
    }
  ]
}

IMPORTANT:
- Only suggest improvements that are actually needed based on the data
- Don't suggest changes to sections that are already performing well
- Focus on the biggest opportunities for improvement
- Be specific about what content to change and how`;
  }

  private buildUserPrompt(
    analyticsSummary: UserAnalyticsSummary,
    existingSuggestions: AISuggestion[],
    analysisType: string
  ): string {
    const { analytics, content, recent_activity } = analyticsSummary;

    // Calculate key metrics and insights
    const conversionRate = analytics.conversion_rate;
    const hasLowTraffic = analytics.total_page_views < 100;
    const hasLowConversion = conversionRate < 2;
    const hasNoClicks = analytics.total_cta_clicks === 0;
    const recentActivity = recent_activity.content_changes_last_7_days > 0;

    const existingTitles = existingSuggestions.map(s => s.title).join(', ');

    return `Please analyze this landing page and provide 3-5 specific, actionable suggestions for improvement.

USER'S LANDING PAGE DATA:
Name: ${content.name}
Bio: ${content.bio}
Bio Length: ${content.bio_word_count} words
Services: ${content.services_count} listed
Highlights: ${content.highlights_count} listed  
Testimonials: ${content.testimonials_count} listed

ANALYTICS PERFORMANCE:
- Total Page Views: ${analytics.total_page_views}
- Unique Visitors: ${analytics.unique_visitors}
- Total CTA Clicks: ${analytics.total_cta_clicks}
- Conversion Rate: ${conversionRate}%
- Average Session Duration: ${analytics.avg_session_duration} seconds
- Recent Page Views (7 days): ${analytics.recent_page_views}
- Recent CTA Clicks (7 days): ${analytics.recent_cta_clicks}

RECENT ACTIVITY:
- Content changes in last 7 days: ${recent_activity.content_changes_last_7_days}
- Last content change: ${recent_activity.last_content_change || 'None'}

ANALYSIS TYPE: ${analysisType}

EXISTING SUGGESTIONS (don't duplicate):
${existingTitles || 'None'}

KEY ISSUES TO ADDRESS:
${hasLowTraffic ? '- Low traffic volume needs attention' : ''}
${hasLowConversion ? '- Low conversion rate needs optimization' : ''}
${hasNoClicks ? '- No CTA clicks detected - critical issue' : ''}
${content.bio_word_count > 100 ? '- Bio may be too long' : ''}
${content.bio_word_count < 20 ? '- Bio may be too short' : ''}
${content.services_count === 0 ? '- No services listed' : ''}

ONBOARDING DATA CONTEXT:
${content.onboarding_data ? JSON.stringify(content.onboarding_data, null, 2) : 'No onboarding data available'}

Focus on the most impactful suggestions that will directly improve their conversion rate and user engagement. Be specific about what to change and why.`;
  }

  private async saveAnalysisSession(session: Omit<AIAnalysisSession, 'id' | 'created_at'>): Promise<string> {
    const { data, error } = await this.supabase
      .from('ai_analysis_sessions')
      .insert(session)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save analysis session: ${error.message}`);
    }

    return data.id;
  }

  private async saveSuggestions(suggestions: Omit<AISuggestion, 'id' | 'created_at' | 'updated_at'>[]): Promise<AISuggestion[]> {
    if (suggestions.length === 0) return [];

    const { data, error } = await this.supabase
      .from('ai_suggestions')
      .insert(suggestions.map(s => ({
        ...s,
        ai_model: 'gpt-4',
        ai_prompt_version: 'v1.0',
        status: 'pending'
      })))
      .select('*');

    if (error) {
      throw new Error(`Failed to save suggestions: ${error.message}`);
    }

    return data;
  }

  async implementSuggestion(
    suggestionId: string,
    implementationContent: string,
    implementationNotes?: string,
    partialImplementation?: boolean
  ): Promise<void> {
    try {
      // Get the suggestion
      const { data: suggestion, error: suggestionError } = await this.supabase
        .from('ai_suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();

      if (suggestionError || !suggestion) {
        throw new Error('Suggestion not found');
      }

      // Get before analytics
      const beforeAnalytics = await this.getAnalyticsSummary(
        suggestion.user_id,
        suggestion.landing_page_id
      );

      // Update suggestion status
      const { error: updateError } = await this.supabase
        .from('ai_suggestions')
        .update({
          status: 'implemented',
          implemented_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      if (updateError) {
        throw new Error(`Failed to update suggestion: ${updateError.message}`);
      }

      // Create implementation record
      const { error: implementError } = await this.supabase
        .from('suggestion_implementations')
        .insert({
          suggestion_id: suggestionId,
          user_id: suggestion.user_id,
          implemented_content: implementationContent,
          implementation_notes: implementationNotes,
          partial_implementation: partialImplementation || false,
          before_analytics: beforeAnalytics.analytics
        });

      if (implementError) {
        throw new Error(`Failed to create implementation record: ${implementError.message}`);
      }

    } catch (error) {
      console.error('Implementation error:', error);
      throw error;
    }
  }

  async dismissSuggestion(suggestionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('ai_suggestions')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (error) {
      throw new Error(`Failed to dismiss suggestion: ${error.message}`);
    }
  }

  async provideFeedback(
    suggestionId: string,
    userId: string,
    rating?: number,
    feedbackText?: string,
    isHelpful?: boolean
  ): Promise<void> {
    const { error } = await this.supabase
      .from('suggestion_feedback')
      .insert({
        suggestion_id: suggestionId,
        user_id: userId,
        rating,
        feedback_text: feedbackText,
        is_helpful: isHelpful
      });

    if (error) {
      throw new Error(`Failed to save feedback: ${error.message}`);
    }
  }

  async getSuggestions(userId: string, landingPageId: string, status?: string): Promise<AISuggestion[]> {
    let query = this.supabase
      .from('ai_suggestions')
      .select('*')
      .eq('user_id', userId)
      .eq('landing_page_id', landingPageId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get suggestions: ${error.message}`);
    }

    return data || [];
  }

  async measureImpact(implementationId: string): Promise<void> {
    try {
      // Get implementation details
      const { data: implementation, error: implError } = await this.supabase
        .from('suggestion_implementations')
        .select(`
          *,
          ai_suggestions!inner(user_id, landing_page_id)
        `)
        .eq('id', implementationId)
        .single();

      if (implError || !implementation) {
        throw new Error('Implementation not found');
      }

      // Get current analytics (after implementation)
      const afterAnalytics = await this.getAnalyticsSummary(
        implementation.ai_suggestions.user_id,
        implementation.ai_suggestions.landing_page_id
      );

      // Update implementation with after analytics
      const { error: updateError } = await this.supabase
        .from('suggestion_implementations')
        .update({
          after_analytics: afterAnalytics.analytics,
          impact_measured_at: new Date().toISOString()
        })
        .eq('id', implementationId);

      if (updateError) {
        throw new Error(`Failed to update impact measurement: ${updateError.message}`);
      }

    } catch (error) {
      console.error('Impact measurement error:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();