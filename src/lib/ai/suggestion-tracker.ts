import { createClient } from '@/lib/supabase/client';
import { 
  AISuggestion, 
  SuggestionImplementation, 
  SuggestionFeedback,
  AnalyticsSnapshot 
} from '@/types/ai-assistant';

export class SuggestionTracker {
  private supabase = createClient();

  /**
   * Track when a user views a suggestion
   */
  async trackSuggestionView(suggestionId: string, userId: string): Promise<void> {
    try {
      // Could track views in a separate table for analytics
      // For now, we'll just update the suggestion's updated_at
      await this.supabase
        .from('ai_suggestions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', suggestionId)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Failed to track suggestion view:', error);
    }
  }

  /**
   * Get suggestion history for a user
   */
  async getSuggestionHistory(
    userId: string, 
    landingPageId?: string,
    limit: number = 50
  ): Promise<{
    suggestions: AISuggestion[];
    implementations: SuggestionImplementation[];
    totalCount: number;
  }> {
    let query = this.supabase
      .from('ai_suggestions')
      .select(`
        *,
        suggestion_implementations(*),
        suggestion_feedback(*)
      `)
      .eq('user_id', userId);

    if (landingPageId) {
      query = query.eq('landing_page_id', landingPageId);
    }

    const { data: suggestions, error, count } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get suggestion history: ${error.message}`);
    }

    // Get all implementations for these suggestions
    const suggestionIds = suggestions?.map(s => s.id) || [];
    const { data: implementations } = await this.supabase
      .from('suggestion_implementations')
      .select('*')
      .in('suggestion_id', suggestionIds)
      .order('created_at', { ascending: false });

    return {
      suggestions: suggestions || [],
      implementations: implementations || [],
      totalCount: count || 0
    };
  }

  /**
   * Get implementation timeline for a user
   */
  async getImplementationTimeline(
    userId: string,
    landingPageId?: string,
    days: number = 30
  ): Promise<{
    timeline: {
      date: string;
      implementations: SuggestionImplementation[];
      analytics?: AnalyticsSnapshot;
    }[];
    totalImplementations: number;
    averageTimeToImplement: number;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let query = this.supabase
      .from('suggestion_implementations')
      .select(`
        *,
        ai_suggestions!inner(
          id,
          title,
          suggestion_type,
          priority,
          landing_page_id,
          created_at
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (landingPageId) {
      query = query.eq('ai_suggestions.landing_page_id', landingPageId);
    }

    const { data: implementations, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get implementation timeline: ${error.message}`);
    }

    // Group implementations by date
    const timelineMap = new Map<string, SuggestionImplementation[]>();
    let totalTimeToImplement = 0;
    let countWithTime = 0;

    (implementations || []).forEach(impl => {
      const date = new Date(impl.created_at).toISOString().split('T')[0];
      const existing = timelineMap.get(date) || [];
      existing.push(impl);
      timelineMap.set(date, existing);

      // Calculate time to implement
      if (impl.ai_suggestions?.created_at) {
        const suggestionTime = new Date(impl.ai_suggestions.created_at).getTime();
        const implementTime = new Date(impl.created_at).getTime();
        const timeDiff = (implementTime - suggestionTime) / (1000 * 60 * 60 * 24); // days
        
        totalTimeToImplement += timeDiff;
        countWithTime++;
      }
    });

    const timeline = Array.from(timelineMap.entries())
      .map(([date, impls]) => ({
        date,
        implementations: impls,
        analytics: undefined // Could fetch daily analytics here
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const averageTimeToImplement = countWithTime > 0 ? totalTimeToImplement / countWithTime : 0;

    return {
      timeline,
      totalImplementations: implementations?.length || 0,
      averageTimeToImplement
    };
  }

  /**
   * Get suggestion effectiveness metrics
   */
  async getSuggestionEffectiveness(userId: string, landingPageId?: string): Promise<{
    byType: Record<string, {
      total: number;
      implemented: number;
      dismissed: number;
      avgRating: number;
      successRate: number;
    }>;
    byPriority: Record<string, {
      total: number;
      implemented: number;
      avgTimeToImplement: number;
    }>;
    overallMetrics: {
      totalSuggestions: number;
      implementationRate: number;
      avgUserRating: number;
      mostEffectiveType: string;
    };
  }> {
    let query = this.supabase
      .from('ai_suggestions')
      .select(`
        *,
        suggestion_implementations(created_at),
        suggestion_feedback(rating, is_helpful)
      `)
      .eq('user_id', userId);

    if (landingPageId) {
      query = query.eq('landing_page_id', landingPageId);
    }

    const { data: suggestions, error } = await query;

    if (error) {
      throw new Error(`Failed to get suggestion effectiveness: ${error.message}`);
    }

    const byType: Record<string, any> = {};
    const byPriority: Record<string, any> = {};
    let totalRatings = 0;
    let ratingSum = 0;
    let totalImplemented = 0;

    (suggestions || []).forEach(suggestion => {
      const type = suggestion.suggestion_type;
      const priority = suggestion.priority;
      const isImplemented = suggestion.status === 'implemented';
      const isDismissed = suggestion.status === 'dismissed';

      // By type
      if (!byType[type]) {
        byType[type] = { total: 0, implemented: 0, dismissed: 0, avgRating: 0, successRate: 0 };
      }
      byType[type].total++;
      if (isImplemented) byType[type].implemented++;
      if (isDismissed) byType[type].dismissed++;

      // By priority  
      if (!byPriority[priority]) {
        byPriority[priority] = { total: 0, implemented: 0, avgTimeToImplement: 0 };
      }
      byPriority[priority].total++;
      if (isImplemented) {
        byPriority[priority].implemented++;
        totalImplemented++;

        // Calculate time to implement
        if (suggestion.suggestion_implementations?.[0]) {
          const suggestionTime = new Date(suggestion.created_at).getTime();
          const implementTime = new Date(suggestion.suggestion_implementations[0].created_at).getTime();
          const timeDiff = (implementTime - suggestionTime) / (1000 * 60 * 60 * 24);
          byPriority[priority].avgTimeToImplement += timeDiff;
        }
      }

      // Ratings
      if (suggestion.suggestion_feedback?.[0]?.rating) {
        ratingSum += suggestion.suggestion_feedback[0].rating;
        totalRatings++;
      }
    });

    // Calculate success rates and averages
    Object.keys(byType).forEach(type => {
      const typeData = byType[type];
      typeData.successRate = typeData.total > 0 ? (typeData.implemented / typeData.total) * 100 : 0;
    });

    Object.keys(byPriority).forEach(priority => {
      const priorityData = byPriority[priority];
      priorityData.avgTimeToImplement = priorityData.implemented > 0 
        ? priorityData.avgTimeToImplement / priorityData.implemented 
        : 0;
    });

    // Overall metrics
    const totalSuggestions = suggestions?.length || 0;
    const implementationRate = totalSuggestions > 0 ? (totalImplemented / totalSuggestions) * 100 : 0;
    const avgUserRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
    
    const mostEffectiveType = Object.entries(byType)
      .sort(([,a], [,b]) => b.successRate - a.successRate)[0]?.[0] || 'none';

    return {
      byType,
      byPriority,
      overallMetrics: {
        totalSuggestions,
        implementationRate,
        avgUserRating,
        mostEffectiveType
      }
    };
  }

  /**
   * Track user engagement with suggestions
   */
  async trackEngagement(
    suggestionId: string,
    userId: string,
    action: 'view' | 'expand' | 'copy_content' | 'share',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Could create a separate engagement tracking table
      // For now, we'll update the suggestion with engagement metadata
      const { data: existing } = await this.supabase
        .from('ai_suggestions')
        .select('analytics_context')
        .eq('id', suggestionId)
        .single();

      const engagementData = existing?.analytics_context || {};
      const engagementHistory = engagementData.engagement_history || [];
      
      engagementHistory.push({
        action,
        timestamp: new Date().toISOString(),
        metadata
      });

      await this.supabase
        .from('ai_suggestions')
        .update({
          analytics_context: {
            ...engagementData,
            engagement_history: engagementHistory.slice(-10) // Keep last 10 actions
          }
        })
        .eq('id', suggestionId)
        .eq('user_id', userId);

    } catch (error) {
      console.error('Failed to track engagement:', error);
    }
  }

  /**
   * Get suggestions that need follow-up
   */
  async getSuggestionsNeedingFollowUp(userId: string, landingPageId?: string): Promise<{
    needingMeasurement: AISuggestion[];
    oldPending: AISuggestion[];
    needingFeedback: AISuggestion[];
  }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let query = this.supabase
      .from('ai_suggestions')
      .select(`
        *,
        suggestion_implementations(*),
        suggestion_feedback(*)
      `)
      .eq('user_id', userId);

    if (landingPageId) {
      query = query.eq('landing_page_id', landingPageId);
    }

    const { data: suggestions, error } = await query;

    if (error) {
      throw new Error(`Failed to get suggestions needing follow-up: ${error.message}`);
    }

    const needingMeasurement: AISuggestion[] = [];
    const oldPending: AISuggestion[] = [];
    const needingFeedback: AISuggestion[] = [];

    (suggestions || []).forEach(suggestion => {
      const createdAt = new Date(suggestion.created_at);
      const hasImplementation = suggestion.suggestion_implementations?.length > 0;
      const hasFeedback = suggestion.suggestion_feedback?.length > 0;
      const implementedAt = suggestion.implemented_at ? new Date(suggestion.implemented_at) : null;

      // Implemented suggestions that need impact measurement
      if (suggestion.status === 'implemented' && hasImplementation && implementedAt) {
        const daysSinceImplementation = (Date.now() - implementedAt.getTime()) / (1000 * 60 * 60 * 24);
        
        // Check if impact has been measured
        const implementation = suggestion.suggestion_implementations[0];
        if (daysSinceImplementation >= 7 && !implementation.impact_measured_at) {
          needingMeasurement.push(suggestion);
        }
      }

      // Old pending suggestions
      if (suggestion.status === 'pending' && createdAt < sevenDaysAgo) {
        oldPending.push(suggestion);
      }

      // Implemented suggestions without feedback
      if (suggestion.status === 'implemented' && !hasFeedback && implementedAt && implementedAt < thirtyDaysAgo) {
        needingFeedback.push(suggestion);
      }
    });

    return {
      needingMeasurement,
      oldPending,
      needingFeedback
    };
  }

  /**
   * Archive old suggestions to keep the system clean
   */
  async archiveOldSuggestions(userId: string, daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    // For now, we'll just mark them as archived in analytics_context
    // In a real system, you might move them to an archive table
    const { data: oldSuggestions, error } = await this.supabase
      .from('ai_suggestions')
      .select('id, analytics_context')
      .eq('user_id', userId)
      .lt('created_at', cutoffDate.toISOString())
      .in('status', ['dismissed', 'implemented']);

    if (error) {
      throw new Error(`Failed to find old suggestions: ${error.message}`);
    }

    let archivedCount = 0;

    for (const suggestion of oldSuggestions || []) {
      try {
        await this.supabase
          .from('ai_suggestions')
          .update({
            analytics_context: {
              ...suggestion.analytics_context,
              archived: true,
              archived_at: new Date().toISOString()
            }
          })
          .eq('id', suggestion.id);
        
        archivedCount++;
      } catch (error) {
        console.error(`Failed to archive suggestion ${suggestion.id}:`, error);
      }
    }

    return archivedCount;
  }
}

export const suggestionTracker = new SuggestionTracker();