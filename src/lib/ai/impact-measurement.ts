import { createClient } from '@/lib/supabase/client';
import { analyticsProcessor } from './analytics-processor';
import { 
  AnalyticsSnapshot, 
  SuggestionImplementation,
  AISuggestion 
} from '@/types/ai-assistant';

export class ImpactMeasurement {
  private supabase = createClient();

  /**
   * Automatically measure impact for implementations that are ready
   */
  async measurePendingImpacts(userId: string, landingPageId?: string): Promise<{
    measured: number;
    failed: number;
    details: { implementationId: string; success: boolean; error?: string }[];
  }> {
    try {
      // Find implementations that need impact measurement
      let query = this.supabase
        .from('suggestion_implementations')
        .select(`
          *,
          ai_suggestions!inner(
            id,
            title,
            user_id,
            landing_page_id,
            implemented_at
          )
        `)
        .eq('user_id', userId)
        .is('impact_measured_at', null)
        .not('before_analytics', 'is', null);

      if (landingPageId) {
        query = query.eq('ai_suggestions.landing_page_id', landingPageId);
      }

      // Only measure implementations that are at least 7 days old
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      query = query.lt('created_at', sevenDaysAgo.toISOString());

      const { data: implementations, error } = await query;

      if (error) {
        throw new Error(`Failed to find pending implementations: ${error.message}`);
      }

      const results = {
        measured: 0,
        failed: 0,
        details: [] as { implementationId: string; success: boolean; error?: string }[]
      };

      // Process each implementation
      for (const implementation of implementations || []) {
        try {
          await this.measureImplementationImpact(implementation.id);
          results.measured++;
          results.details.push({
            implementationId: implementation.id,
            success: true
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            implementationId: implementation.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Failed to measure pending impacts:', error);
      throw error;
    }
  }

  /**
   * Measure impact for a specific implementation
   */
  async measureImplementationImpact(implementationId: string): Promise<{
    improvement: {
      pageViewsImprovement: number;
      ctaClicksImprovement: number;
      conversionRateImprovement: number;
      sessionDurationImprovement: number;
      overallImprovement: number;
    };
    confidence: 'high' | 'medium' | 'low';
    insights: string[];
  }> {
    try {
      // Get implementation details
      const { data: implementation, error: implError } = await this.supabase
        .from('suggestion_implementations')
        .select(`
          *,
          ai_suggestions!inner(
            id,
            user_id,
            landing_page_id,
            title,
            suggestion_type,
            implemented_at
          )
        `)
        .eq('id', implementationId)
        .single();

      if (implError || !implementation) {
        throw new Error('Implementation not found');
      }

      // Get current analytics (after implementation)
      const afterAnalytics = await this.getCurrentAnalytics(
        implementation.ai_suggestions.user_id,
        implementation.ai_suggestions.landing_page_id
      );

      // Calculate improvement
      const beforeAnalytics = implementation.before_analytics as AnalyticsSnapshot;
      const improvement = analyticsProcessor.calculateImprovement(beforeAnalytics, afterAnalytics);

      // Determine confidence level
      const confidence = this.calculateConfidenceLevel(beforeAnalytics, afterAnalytics, implementation);

      // Generate insights
      const insights = this.generateInsights(improvement, implementation);

      // Update implementation with results
      await this.supabase
        .from('suggestion_implementations')
        .update({
          after_analytics: afterAnalytics,
          impact_measured_at: new Date().toISOString()
        })
        .eq('id', implementationId);

      return { improvement, confidence, insights };

    } catch (error) {
      console.error(`Failed to measure impact for implementation ${implementationId}:`, error);
      throw error;
    }
  }

  /**
   * Get current analytics snapshot
   */
  private async getCurrentAnalytics(userId: string, landingPageId: string): Promise<AnalyticsSnapshot> {
    const { data, error } = await this.supabase
      .rpc('get_user_analytics_summary', {
        p_user_id: userId,
        p_landing_page_id: landingPageId
      });

    if (error) {
      throw new Error(`Failed to get current analytics: ${error.message}`);
    }

    return {
      page_views: data.analytics.total_page_views || 0,
      unique_visitors: data.analytics.unique_visitors || 0,
      cta_clicks: data.analytics.total_cta_clicks || 0,
      conversion_rate: data.analytics.conversion_rate || 0,
      avg_session_duration: data.analytics.avg_session_duration || 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate confidence level based on data quality and volume
   */
  private calculateConfidenceLevel(
    before: AnalyticsSnapshot,
    after: AnalyticsSnapshot,
    implementation: SuggestionImplementation
  ): 'high' | 'medium' | 'low' {
    let confidenceScore = 0;

    // Data volume factor
    const minPageViews = Math.min(before.page_views, after.page_views);
    if (minPageViews >= 1000) confidenceScore += 3;
    else if (minPageViews >= 100) confidenceScore += 2;
    else if (minPageViews >= 10) confidenceScore += 1;

    // Time since implementation
    const daysSinceImpl = implementation.created_at 
      ? (Date.now() - new Date(implementation.created_at).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    if (daysSinceImpl >= 30) confidenceScore += 2;
    else if (daysSinceImpl >= 14) confidenceScore += 1;

    // Consistency of change direction
    const improvements = analyticsProcessor.calculateImprovement(before, after);
    const positiveMetrics = [
      improvements.pageViewsImprovement > 0,
      improvements.ctaClicksImprovement > 0,
      improvements.conversionRateImprovement > 0,
      improvements.sessionDurationImprovement > 0
    ].filter(Boolean).length;

    if (positiveMetrics >= 3) confidenceScore += 2;
    else if (positiveMetrics >= 2) confidenceScore += 1;

    // Return confidence level
    if (confidenceScore >= 6) return 'high';
    if (confidenceScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Generate human-readable insights from improvement data
   */
  private generateInsights(
    improvement: any,
    implementation: SuggestionImplementation
  ): string[] {
    const insights: string[] = [];
    const suggestion = implementation.ai_suggestions as any;

    // Overall impact
    if (improvement.overallImprovement > 10) {
      insights.push(`Strong positive impact with ${improvement.overallImprovement.toFixed(1)}% overall improvement`);
    } else if (improvement.overallImprovement > 0) {
      insights.push(`Modest positive impact with ${improvement.overallImprovement.toFixed(1)}% overall improvement`);
    } else if (improvement.overallImprovement < -10) {
      insights.push(`Negative impact detected: ${Math.abs(improvement.overallImprovement).toFixed(1)}% decline`);
    } else {
      insights.push('Minimal impact observed from this change');
    }

    // Specific metric insights
    if (improvement.conversionRateImprovement > 5) {
      insights.push(`Conversion rate improved significantly by ${improvement.conversionRateImprovement.toFixed(1)}%`);
    } else if (improvement.conversionRateImprovement < -5) {
      insights.push(`Conversion rate decreased by ${Math.abs(improvement.conversionRateImprovement).toFixed(1)}%`);
    }

    if (improvement.pageViewsImprovement > 20) {
      insights.push(`Page views increased substantially by ${improvement.pageViewsImprovement.toFixed(1)}%`);
    } else if (improvement.pageViewsImprovement < -20) {
      insights.push(`Page views declined by ${Math.abs(improvement.pageViewsImprovement).toFixed(1)}%`);
    }

    if (improvement.ctaClicksImprovement > 15) {
      insights.push(`CTA clicks improved by ${improvement.ctaClicksImprovement.toFixed(1)}%`);
    } else if (improvement.ctaClicksImprovement < -15) {
      insights.push(`CTA clicks decreased by ${Math.abs(improvement.ctaClicksImprovement).toFixed(1)}%`);
    }

    // Contextual insights based on suggestion type
    if (suggestion?.suggestion_type === 'conversion' && improvement.conversionRateImprovement > 0) {
      insights.push('This conversion optimization successfully improved user engagement');
    } else if (suggestion?.suggestion_type === 'content' && improvement.sessionDurationImprovement > 0) {
      insights.push('Content improvements led to longer user engagement');
    } else if (suggestion?.suggestion_type === 'performance' && improvement.pageViewsImprovement > 0) {
      insights.push('Performance optimizations attracted more visitors');
    }

    // Implementation quality insights
    if (implementation.partial_implementation) {
      insights.push('Results are from partial implementation - full implementation may yield greater impact');
    }

    return insights;
  }

  /**
   * Compare implementations across suggestions
   */
  async compareImplementations(
    userId: string,
    landingPageId: string,
    timeframe: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<{
    bestPerforming: {
      implementation: SuggestionImplementation;
      improvement: number;
      category: string;
    }[];
    worstPerforming: {
      implementation: SuggestionImplementation;
      improvement: number;
      category: string;
    }[];
    insights: string[];
  }> {
    const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data: implementations, error } = await this.supabase
      .from('suggestion_implementations')
      .select(`
        *,
        ai_suggestions!inner(
          id,
          title,
          suggestion_type,
          priority
        )
      `)
      .eq('user_id', userId)
      .eq('ai_suggestions.landing_page_id', landingPageId)
      .gte('created_at', startDate.toISOString())
      .not('impact_measured_at', 'is', null)
      .not('before_analytics', 'is', null)
      .not('after_analytics', 'is', null);

    if (error) {
      throw new Error(`Failed to get implementations for comparison: ${error.message}`);
    }

    const performanceData = (implementations || []).map(impl => {
      const before = impl.before_analytics as AnalyticsSnapshot;
      const after = impl.after_analytics as AnalyticsSnapshot;
      const improvement = analyticsProcessor.calculateImprovement(before, after);
      
      return {
        implementation: impl,
        improvement: improvement.overallImprovement,
        category: impl.ai_suggestions.suggestion_type
      };
    });

    // Sort by performance
    const sorted = performanceData.sort((a, b) => b.improvement - a.improvement);
    
    const bestPerforming = sorted.slice(0, 3);
    const worstPerforming = sorted.slice(-3).reverse();

    // Generate comparative insights
    const insights: string[] = [];
    
    if (performanceData.length > 0) {
      const avgImprovement = performanceData.reduce((sum, p) => sum + p.improvement, 0) / performanceData.length;
      insights.push(`Average improvement across all implementations: ${avgImprovement.toFixed(1)}%`);

      // Best category
      const categoryPerformance = performanceData.reduce((acc, p) => {
        if (!acc[p.category]) acc[p.category] = [];
        acc[p.category].push(p.improvement);
        return acc;
      }, {} as Record<string, number[]>);

      const categoryAvgs = Object.entries(categoryPerformance).map(([category, improvements]) => ({
        category,
        avgImprovement: improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length
      }));

      const bestCategory = categoryAvgs.sort((a, b) => b.avgImprovement - a.avgImprovement)[0];
      if (bestCategory) {
        insights.push(`${bestCategory.category} suggestions perform best with ${bestCategory.avgImprovement.toFixed(1)}% average improvement`);
      }

      // Performance trends
      const positiveImpacts = performanceData.filter(p => p.improvement > 0).length;
      const successRate = (positiveImpacts / performanceData.length) * 100;
      insights.push(`${successRate.toFixed(0)}% of implementations had positive impact`);
    }

    return {
      bestPerforming,
      worstPerforming,
      insights
    };
  }

  /**
   * Schedule automatic impact measurement
   */
  async scheduleImpactMeasurement(implementationId: string, measureAfterDays: number = 7): Promise<void> {
    // In a real application, this would schedule a background job
    // For now, we'll just add metadata to track when measurement should happen
    
    const measurementDate = new Date(Date.now() + measureAfterDays * 24 * 60 * 60 * 1000);
    
    try {
      await this.supabase
        .from('suggestion_implementations')
        .update({
          implementation_notes: `Auto-measurement scheduled for ${measurementDate.toLocaleDateString()}`
        })
        .eq('id', implementationId);
    } catch (error) {
      console.error('Failed to schedule impact measurement:', error);
    }
  }

  /**
   * Get impact summary for dashboard
   */
  async getImpactSummary(userId: string, landingPageId: string): Promise<{
    totalMeasuredImplementations: number;
    averageImprovement: number;
    bestImprovement: number;
    worstImprovement: number;
    successRate: number;
    pendingMeasurements: number;
    insights: string[];
  }> {
    // Get all implementations with impact measurements
    const { data: implementations, error } = await this.supabase
      .from('suggestion_implementations')
      .select(`
        *,
        ai_suggestions!inner(landing_page_id)
      `)
      .eq('user_id', userId)
      .eq('ai_suggestions.landing_page_id', landingPageId)
      .not('impact_measured_at', 'is', null)
      .not('before_analytics', 'is', null)
      .not('after_analytics', 'is', null);

    if (error) {
      throw new Error(`Failed to get impact summary: ${error.message}`);
    }

    // Get pending measurements
    const { data: pending } = await this.supabase
      .from('suggestion_implementations')
      .select('id')
      .eq('user_id', userId)
      .is('impact_measured_at', null)
      .not('before_analytics', 'is', null);

    const improvements = (implementations || []).map(impl => {
      const before = impl.before_analytics as AnalyticsSnapshot;
      const after = impl.after_analytics as AnalyticsSnapshot;
      return analyticsProcessor.calculateImprovement(before, after).overallImprovement;
    });

    const totalMeasuredImplementations = improvements.length;
    const averageImprovement = improvements.length > 0 
      ? improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length 
      : 0;
    const bestImprovement = improvements.length > 0 ? Math.max(...improvements) : 0;
    const worstImprovement = improvements.length > 0 ? Math.min(...improvements) : 0;
    const positiveImpacts = improvements.filter(imp => imp > 0).length;
    const successRate = improvements.length > 0 ? (positiveImpacts / improvements.length) * 100 : 0;
    const pendingMeasurements = pending?.length || 0;

    const insights: string[] = [];
    
    if (totalMeasuredImplementations > 0) {
      if (averageImprovement > 5) {
        insights.push('Your implementations are driving strong positive results');
      } else if (averageImprovement > 0) {
        insights.push('Your implementations show modest positive impact');
      } else {
        insights.push('Recent implementations may need optimization');
      }

      if (successRate > 75) {
        insights.push('High success rate - keep implementing similar suggestions');
      } else if (successRate < 50) {
        insights.push('Consider being more selective with which suggestions to implement');
      }
    }

    if (pendingMeasurements > 0) {
      insights.push(`${pendingMeasurements} implementations ready for impact measurement`);
    }

    return {
      totalMeasuredImplementations,
      averageImprovement,
      bestImprovement,
      worstImprovement,
      successRate,
      pendingMeasurements,
      insights
    };
  }
}

export const impactMeasurement = new ImpactMeasurement();