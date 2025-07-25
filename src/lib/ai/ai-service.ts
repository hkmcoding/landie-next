import { 
  AIAnalysisRequest, 
  AIAnalysisResponse, 
  AISuggestion, 
  UserAnalyticsSummary,
  AIAnalysisSession 
} from '@/types/ai-assistant';

class AIService {
  private async getOpenAIClient() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    
    // Dynamic import to avoid bundling OpenAI on client-side
    const { default: OpenAI } = await import('openai');
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeUserData(request: AIAnalysisRequest, supabase: any): Promise<AIAnalysisResponse> {
    const startTime = Date.now();
    
    try {
      // Get analytics summary from database
      const analyticsSummary = await this.getAnalyticsSummary(
        request.user_id, 
        request.landing_page_id,
        supabase
      );

      // Get existing suggestions to avoid duplicates
      const existingSuggestions = await this.getExistingSuggestions(
        request.user_id,
        request.landing_page_id,
        supabase
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
        ai_model: 'gpt-4o-mini',
        processing_time_ms: Date.now() - startTime,
        tokens_used: aiResponse.tokensUsed,
      }, supabase);

      // Save suggestions to database
      const savedSuggestions = await this.saveSuggestions(
        aiResponse.suggestions.map(s => ({
          ...s,
          user_id: request.user_id,
          landing_page_id: request.landing_page_id,
          analytics_context: analyticsSummary.analytics,
        })),
        supabase
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

  private async getAnalyticsSummary(userId: string, landingPageId: string, supabase: any): Promise<UserAnalyticsSummary> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_analytics_summary', {
          p_user_id: userId,
          p_landing_page_id: landingPageId
        });

      if (error) {
        console.error('Analytics summary error:', error);
        // Return default data structure instead of throwing
        return {
          analytics: {
            total_page_views: 0,
            unique_visitors: 0,
            total_cta_clicks: 0,
            avg_session_duration: 0,
            recent_page_views: 0,
            recent_cta_clicks: 0,
            conversion_rate: 0
          },
          content: {
            name: 'Unnamed Page',
            bio: '',
            bio_word_count: 0,
            services_count: 0,
            highlights_count: 0,
            testimonials_count: 0,
            onboarding_data: null
          },
          recent_activity: {
            content_changes_last_7_days: 0,
            last_content_change: null
          }
        } as UserAnalyticsSummary;
      }

      return data as UserAnalyticsSummary;
    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      // Return default data structure
      return {
        analytics: {
          total_page_views: 0,
          unique_visitors: 0,
          total_cta_clicks: 0,
          avg_session_duration: 0,
          recent_page_views: 0,
          recent_cta_clicks: 0,
          conversion_rate: 0
        },
        content: {
          name: 'Unnamed Page',
          bio: '',
          bio_word_count: 0,
          services_count: 0,
          highlights_count: 0,
          testimonials_count: 0,
          onboarding_data: null
        },
        recent_activity: {
          content_changes_last_7_days: 0,
          last_content_change: null
        }
      } as UserAnalyticsSummary;
    }
  }

  private async getExistingSuggestions(userId: string, landingPageId: string, supabase: any): Promise<AISuggestion[]> {
    const { data, error } = await supabase
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

    // Estimate input tokens (rough approximation: 1 token ≈ 4 characters)
    const estimatedInputTokens = (systemPrompt.length + userPrompt.length) / 4;
    
    console.log('AI Analysis - Estimated input tokens:', Math.round(estimatedInputTokens));
    
    // Prevent requests that are too large
    if (estimatedInputTokens > 8000) {
      throw new Error('Input too large. Please reduce content length.');
    }

    const openai = await this.getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Much cheaper than gpt-4, still very capable
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500, // Reduced from 2000
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    try {
      const parsed = JSON.parse(response);
      const rawSuggestions = parsed.suggestions || [];
      
      // Refine and consolidate suggestions to improve quality
      const refinedSuggestions = await this.refineSuggestions(rawSuggestions, analyticsSummary, existingSuggestions);
      
      return {
        suggestions: refinedSuggestions,
        tokensUsed: completion.usage?.total_tokens || 0
      };
    } catch (error) {
      throw new Error('Failed to parse AI response');
    }
  }

  private async refineSuggestions(
    rawSuggestions: Partial<AISuggestion>[],
    analyticsSummary: UserAnalyticsSummary,
    existingSuggestions: AISuggestion[]
  ): Promise<Partial<AISuggestion>[]> {
    // Step 1: Remove duplicates and similar suggestions
    const deduplicatedSuggestions = this.removeDuplicateSuggestions(rawSuggestions, existingSuggestions);
    
    // Step 2: Consolidate similar suggestions by target section
    const consolidatedSuggestions = this.consolidateSimilarSuggestions(deduplicatedSuggestions);
    
    // Step 3: Use AI to select the best 3 suggestions
    const bestSuggestions = await this.selectBestSuggestions(consolidatedSuggestions, analyticsSummary);
    
    return bestSuggestions;
  }

  private removeDuplicateSuggestions(
    rawSuggestions: Partial<AISuggestion>[],
    existingSuggestions: AISuggestion[]
  ): Partial<AISuggestion>[] {
    const existingTitles = existingSuggestions.map(s => s.title.toLowerCase());
    const existingTargets = existingSuggestions.map(s => s.target_section);
    
    return rawSuggestions.filter(suggestion => {
      const title = suggestion.title?.toLowerCase() || '';
      const target = suggestion.target_section;
      
      // Remove if title is too similar to existing
      const isSimilarTitle = existingTitles.some(existing => 
        this.calculateSimilarity(title, existing) > 0.7
      );
      
      // Remove if targeting same section with similar content
      const isDuplicateTarget = existingTargets.includes(target) && 
        existingSuggestions.some(existing => 
          existing.target_section === target && 
          this.calculateSimilarity(title, existing.title.toLowerCase()) > 0.5
        );
      
      return !isSimilarTitle && !isDuplicateTarget;
    });
  }

  private consolidateSimilarSuggestions(suggestions: Partial<AISuggestion>[]): Partial<AISuggestion>[] {
    const sectionGroups = new Map<string, Partial<AISuggestion>[]>();
    
    // Group by target section
    suggestions.forEach(suggestion => {
      const section = suggestion.target_section || 'general';
      if (!sectionGroups.has(section)) {
        sectionGroups.set(section, []);
      }
      sectionGroups.get(section)!.push(suggestion);
    });
    
    const consolidated: Partial<AISuggestion>[] = [];
    
    // For each section, consolidate similar suggestions
    sectionGroups.forEach((sectionSuggestions, section) => {
      if (sectionSuggestions.length === 1) {
        consolidated.push(sectionSuggestions[0]);
      } else {
        // If multiple suggestions for same section, pick the highest priority/confidence
        const best = sectionSuggestions.reduce((prev, current) => {
          const prevScore = this.getSuggestionScore(prev);
          const currentScore = this.getSuggestionScore(current);
          return currentScore > prevScore ? current : prev;
        });
        consolidated.push(best);
      }
    });
    
    return consolidated;
  }

  private async selectBestSuggestions(
    suggestions: Partial<AISuggestion>[],
    analyticsSummary: UserAnalyticsSummary
  ): Promise<Partial<AISuggestion>[]> {
    if (suggestions.length <= 3) {
      return suggestions;
    }
    
    // Use AI to select the best 3 suggestions
    const selectionPrompt = `Given these ${suggestions.length} optimization suggestions, select the 3 BEST ones that will have the highest conversion impact for this landing page.

Landing page data:
- Page views: ${analyticsSummary.analytics.total_page_views}
- CTA clicks: ${analyticsSummary.analytics.total_cta_clicks}
- Conversion rate: ${analyticsSummary.analytics.conversion_rate}%
- Content: ${analyticsSummary.content.services_count} services, ${analyticsSummary.content.testimonials_count} testimonials

Suggestions to choose from:
${suggestions.map((s, i) => `${i + 1}. ${s.title} (${s.priority} priority, ${s.target_section} section)`).join('\n')}

Return JSON with the indices (1-based) of the 3 best suggestions:
{"selected_indices": [1, 3, 5]}

Choose based on:
1. Highest potential conversion impact
2. Addressing the biggest problems first
3. Avoiding overlap between suggestions`;

    try {
      const openai = await this.getOpenAIClient();
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: selectionPrompt }],
        temperature: 0.3,
        max_tokens: 100,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        const parsed = JSON.parse(response);
        const indices = parsed.selected_indices || [];
        return indices.map((index: number) => suggestions[index - 1]).filter(Boolean);
      }
    } catch (error) {
      console.warn('AI selection failed, using fallback logic:', error);
    }
    
    // Fallback: sort by priority and confidence, take top 3
    return suggestions
      .sort((a, b) => this.getSuggestionScore(b) - this.getSuggestionScore(a))
      .slice(0, 3);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    return intersection.length / union.length;
  }

  private getSuggestionScore(suggestion: Partial<AISuggestion>): number {
    const priorityScore = suggestion.priority === 'high' ? 3 : suggestion.priority === 'medium' ? 2 : 1;
    const confidenceScore = suggestion.confidence_score || 0.5;
    return priorityScore * 2 + confidenceScore;
  }

  private buildSystemPrompt(): string {
    return `You are a conversion optimization expert. Analyze landing page data and provide 5-7 DIVERSE actionable suggestions.

IMPORTANT: Generate more suggestions than needed - they will be filtered down to the best 3.

STRICT CONSTRAINTS - ONLY suggest changes the user can edit directly:
✅ ALLOWED:
- Text changes (headlines, descriptions, CTA button text)
- Content reorganization (reorder sections, bullet points)
- Adding/editing testimonials, reviews, or social proof
- Bio/description improvements
- Service/product descriptions
- Call-to-action copy optimization

❌ FORBIDDEN - NEVER suggest:
- Page load speed improvements
- Website design changes
- Technical optimizations
- New features or functionality
- Analytics or tracking setup
- Mobile responsiveness
- SEO technical changes
- Hosting or server changes
- Development work of any kind

DIVERSITY REQUIREMENTS:
- Target DIFFERENT sections (bio, services, testimonials, cta, header)
- Focus on DIFFERENT aspects (copy, social proof, value proposition)
- Vary priority levels based on impact potential
- Avoid duplicate suggestions for the same section

Return JSON format:
{
  "suggestions": [
    {
      "suggestion_type": "content",
      "title": "Brief, clear action (must be copy/content only)",
      "description": "What text to change or content to add (max 100 words)",
      "reasoning": "Why this copy change helps conversion (max 50 words)",
      "priority": "high|medium|low",
      "target_section": "bio|services|highlights|testimonials|cta|header",
      "suggested_content": "Exact text or content to use",
      "confidence_score": 0.8
    }
  ]
}

VALID suggestion_type values (choose ONE per suggestion):
- "content": Text/copy improvements
- "conversion": CTA and conversion optimization
- "engagement": User engagement improvements
- "seo": SEO content optimization
- "performance": Content performance enhancements

REMEMBER: Generate diverse, high-quality suggestions - the best 3 will be automatically selected.`;
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

    // Truncate bio to max 200 characters to save tokens
    const bioPreview = content.bio && content.bio.length > 200 
      ? content.bio.substring(0, 200) + '...' 
      : content.bio || '';

    // Only include first 3 existing suggestion titles to save tokens
    const existingTitles = existingSuggestions.slice(0, 3).map(s => s.title).join(', ');

    // Extract only key onboarding insights instead of full data
    const onboardingInsights = content.onboarding_data ? 
      `Industry: ${content.onboarding_data.industry || 'Unknown'}, Target: ${content.onboarding_data.target_audience || 'General'}` :
      'No onboarding data';

    return `Analyze landing page data and provide 3-5 optimization suggestions.

PAGE: ${content.name}
BIO: ${bioPreview}
COUNTS: ${content.services_count} services, ${content.highlights_count} highlights, ${content.testimonials_count} testimonials

METRICS:
- Views: ${analytics.total_page_views} total, ${analytics.recent_page_views} recent
- Visitors: ${analytics.unique_visitors}
- CTA Clicks: ${analytics.total_cta_clicks} total, ${analytics.recent_cta_clicks} recent  
- Conversion: ${conversionRate}%
- Session: ${analytics.avg_session_duration}s avg

ISSUES:
${hasLowTraffic ? '- Low traffic' : ''}
${hasLowConversion ? '- Low conversion' : ''}
${hasNoClicks ? '- No CTA clicks' : ''}
${content.bio_word_count > 100 ? '- Bio too long' : ''}
${content.bio_word_count < 20 ? '- Bio too short' : ''}
${content.services_count === 0 ? '- No services' : ''}

CONTEXT: ${onboardingInsights}
EXISTING: ${existingTitles || 'None'}

Focus on highest impact optimizations.`;
  }

  private async saveAnalysisSession(session: Omit<AIAnalysisSession, 'id' | 'created_at'>, supabase: any): Promise<string> {
    const { data, error } = await supabase
      .from('ai_analysis_sessions')
      .insert(session)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save analysis session: ${error.message}`);
    }

    return data.id;
  }

  private async saveSuggestions(suggestions: Omit<AISuggestion, 'id' | 'created_at' | 'updated_at'>[], supabase: any): Promise<AISuggestion[]> {
    if (suggestions.length === 0) return [];

    // Validate and normalize suggestion_type values
    const validSuggestionTypes = ['performance', 'content', 'conversion', 'engagement', 'seo'];
    const normalizedSuggestions = suggestions.map(s => {
      let suggestionType = s.suggestion_type;
      
      // Handle pipe-separated values by taking the first valid one
      if (suggestionType && suggestionType.includes('|')) {
        const types = suggestionType.split('|');
        suggestionType = types.find(type => validSuggestionTypes.includes(type.trim())) || 'content';
      }
      
      // Ensure suggestion_type is valid, default to 'content' if not
      if (!validSuggestionTypes.includes(suggestionType)) {
        suggestionType = 'content';
      }
      
      return {
        ...s,
        suggestion_type: suggestionType,
        ai_model: 'gpt-4o-mini',
        ai_prompt_version: 'v1.0',
        status: 'pending'
      };
    });

    const { data, error } = await supabase
      .from('ai_suggestions')
      .insert(normalizedSuggestions)
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
    partialImplementation?: boolean,
    supabase: any
  ): Promise<void> {
    try {
      // Get the suggestion
      const { data: suggestion, error: suggestionError } = await supabase
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
        suggestion.landing_page_id,
        supabase
      );

      // Update suggestion status
      const { error: updateError } = await supabase
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
      const { error: implementError } = await supabase
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

  async dismissSuggestion(suggestionId: string, supabase: any): Promise<void> {
    const { error } = await supabase
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
    isHelpful?: boolean,
    supabase: any
  ): Promise<void> {
    const { error } = await supabase
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

  async getSuggestions(userId: string, landingPageId: string, status?: string, supabase: any): Promise<AISuggestion[]> {
    let query = supabase
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

  async measureImpact(implementationId: string, supabase: any): Promise<void> {
    try {
      // Get implementation details
      const { data: implementation, error: implError } = await supabase
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
        implementation.ai_suggestions.landing_page_id,
        supabase
      );

      // Update implementation with after analytics
      const { error: updateError } = await supabase
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