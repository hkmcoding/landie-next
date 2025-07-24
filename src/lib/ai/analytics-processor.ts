import { 
  AnalyticsSnapshot, 
  SuggestionPerformance, 
  UserAnalyticsSummary 
} from '@/types/ai-assistant';
import { createClient } from '@/lib/supabase/client';

export class AnalyticsProcessor {
  private supabase = createClient();

  /**
   * Calculate improvement percentage between before and after analytics
   */
  calculateImprovement(before: AnalyticsSnapshot, after: AnalyticsSnapshot): {
    pageViewsImprovement: number;
    ctaClicksImprovement: number;
    conversionRateImprovement: number;
    sessionDurationImprovement: number;
    overallImprovement: number;
  } {
    const pageViewsImprovement = this.calculatePercentageChange(
      before.page_views, 
      after.page_views
    );
    
    const ctaClicksImprovement = this.calculatePercentageChange(
      before.cta_clicks, 
      after.cta_clicks
    );
    
    const conversionRateImprovement = this.calculatePercentageChange(
      before.conversion_rate, 
      after.conversion_rate
    );
    
    const sessionDurationImprovement = this.calculatePercentageChange(
      before.avg_session_duration, 
      after.avg_session_duration
    );

    // Calculate weighted overall improvement
    // Conversion rate and CTA clicks are most important
    const overallImprovement = (
      conversionRateImprovement * 0.4 +
      ctaClicksImprovement * 0.3 +
      pageViewsImprovement * 0.2 +
      sessionDurationImprovement * 0.1
    );

    return {
      pageViewsImprovement,
      ctaClicksImprovement,
      conversionRateImprovement,
      sessionDurationImprovement,
      overallImprovement
    };
  }

  /**
   * Calculate percentage change between two values
   */
  private calculatePercentageChange(before: number, after: number): number {
    if (before === 0) {
      return after > 0 ? 100 : 0;
    }
    return ((after - before) / before) * 100;
  }

  /**
   * Get performance insights for a suggestion implementation
   */
  async getSuggestionPerformance(suggestionId: string): Promise<{
    performance: SuggestionPerformance | null;
    insights: {
      impact: 'positive' | 'negative' | 'neutral';
      confidence: 'high' | 'medium' | 'low';
      keyMetrics: string[];
      recommendations: string[];
    };
  }> {
    // Get suggestion performance data
    const { data: performance, error } = await this.supabase
      .from('suggestion_performance_mv')
      .select('*')
      .eq('suggestion_id', suggestionId)
      .single();

    if (error || !performance) {
      return {
        performance: null,
        insights: {
          impact: 'neutral',
          confidence: 'low',
          keyMetrics: [],
          recommendations: ['Insufficient data for analysis']
        }
      };
    }

    // Calculate insights
    const insights = this.analyzePerformance(performance);

    return { performance, insights };
  }

  /**
   * Analyze performance data and generate insights
   */
  private analyzePerformance(performance: SuggestionPerformance): {
    impact: 'positive' | 'negative' | 'neutral';
    confidence: 'high' | 'medium' | 'low';
    keyMetrics: string[];
    recommendations: string[];
  } {
    const keyMetrics: string[] = [];
    const recommendations: string[] = [];
    let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
    let confidence: 'high' | 'medium' | 'low' = 'low';

    // Check if there's before/after data
    if (!performance.before_page_views || !performance.after_page_views) {
      return {
        impact: 'neutral',
        confidence: 'low',
        keyMetrics: ['No before/after data available'],
        recommendations: ['Wait for more data to measure impact']
      };
    }

    // Calculate metrics
    const pageViewChange = this.calculatePercentageChange(
      performance.before_page_views,
      performance.after_page_views
    );

    const ctaClickChange = this.calculatePercentageChange(
      performance.before_cta_clicks || 0,
      performance.after_cta_clicks || 0
    );

    const beforeConversion = performance.before_page_views > 0 
      ? ((performance.before_cta_clicks || 0) / performance.before_page_views) * 100 
      : 0;
    
    const afterConversion = performance.after_page_views > 0 
      ? ((performance.after_cta_clicks || 0) / performance.after_page_views) * 100 
      : 0;

    const conversionChange = this.calculatePercentageChange(beforeConversion, afterConversion);

    // Determine impact and confidence
    let positiveIndicators = 0;
    let negativeIndicators = 0;

    // Page views analysis
    if (pageViewChange > 10) {
      keyMetrics.push(`Page views increased by ${pageViewChange.toFixed(1)}%`);
      positiveIndicators++;
    } else if (pageViewChange < -10) {
      keyMetrics.push(`Page views decreased by ${Math.abs(pageViewChange).toFixed(1)}%`);
      negativeIndicators++;
    }

    // CTA clicks analysis
    if (ctaClickChange > 15) {
      keyMetrics.push(`CTA clicks increased by ${ctaClickChange.toFixed(1)}%`);
      positiveIndicators++;
    } else if (ctaClickChange < -15) {
      keyMetrics.push(`CTA clicks decreased by ${Math.abs(ctaClickChange).toFixed(1)}%`);
      negativeIndicators++;
    }

    // Conversion rate analysis (most important)
    if (conversionChange > 5) {
      keyMetrics.push(`Conversion rate improved by ${conversionChange.toFixed(1)}%`);
      positiveIndicators += 2; // Weight conversion rate more heavily
    } else if (conversionChange < -5) {
      keyMetrics.push(`Conversion rate decreased by ${Math.abs(conversionChange).toFixed(1)}%`);
      negativeIndicators += 2;
    }

    // Determine overall impact
    if (positiveIndicators > negativeIndicators) {
      impact = 'positive';
      confidence = positiveIndicators >= 3 ? 'high' : 'medium';
    } else if (negativeIndicators > positiveIndicators) {
      impact = 'negative';
      confidence = negativeIndicators >= 3 ? 'high' : 'medium';
    } else {
      impact = 'neutral';
      confidence = 'medium';
    }

    // Generate recommendations
    if (impact === 'positive') {
      recommendations.push('Consider applying similar changes to other sections');
      if (conversionChange > 10) {
        recommendations.push('This change significantly improved conversions');
      }
    } else if (impact === 'negative') {
      recommendations.push('Consider reverting this change');
      recommendations.push('Test alternative approaches to achieve the goal');
    } else {
      recommendations.push('Monitor for longer period to see clearer trends');
      recommendations.push('Consider A/B testing variations of this change');
    }

    // User feedback integration
    if (performance.user_rating) {
      if (performance.user_rating >= 4) {
        keyMetrics.push(`User rated this suggestion ${performance.user_rating}/5`);
        confidence = confidence === 'low' ? 'medium' : confidence;
      } else if (performance.user_rating <= 2) {
        keyMetrics.push(`User rated this suggestion ${performance.user_rating}/5`);
        if (impact === 'positive') {
          recommendations.push('Despite positive metrics, user feedback suggests issues');
        }
      }
    }

    return { impact, confidence, keyMetrics, recommendations };
  }

  /**
   * Get analytics trends for a user's landing page
   */
  async getAnalyticsTrends(userId: string, landingPageId: string, days: number = 30): Promise<{
    trends: {
      pageViews: { date: string; value: number }[];
      ctaClicks: { date: string; value: number }[];
      conversionRate: { date: string; value: number }[];
    };
    insights: {
      trendDirection: 'improving' | 'declining' | 'stable';
      keyChanges: string[];
      recommendations: string[];
    };
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get page views data
    const { data: pageViewsData, error: pageViewsError } = await this.supabase
      .schema('analytics')
      .from('page_views')
      .select('created_at')
      .eq('landing_page_id', landingPageId)
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (pageViewsError) {
      throw new Error(`Failed to get page views trends: ${pageViewsError.message}`);
    }

    // Get CTA clicks data
    const { data: ctaClicksData, error: ctaClicksError } = await this.supabase
      .schema('analytics')
      .from('cta_clicks')
      .select('created_at')
      .eq('landing_page_id', landingPageId)
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (ctaClicksError) {
      throw new Error(`Failed to get CTA clicks trends: ${ctaClicksError.message}`);
    }

    // Process data into daily trends
    const trends = this.processAnalyticsIntoTrends(pageViewsData || [], ctaClicksData || [], days);
    const insights = this.analyzeTrends(trends);

    return { trends, insights };
  }

  /**
   * Process separate analytics data into trend format
   */
  private processAnalyticsIntoTrends(
    pageViewsData: any[],
    ctaClicksData: any[],
    days: number
  ): {
    pageViews: { date: string; value: number }[];
    ctaClicks: { date: string; value: number }[];
    conversionRate: { date: string; value: number }[];
  } {
    const dailyStats = new Map<string, { pageViews: number; ctaClicks: number }>();

    // Process page views
    pageViewsData.forEach(record => {
      const date = new Date(record.created_at).toISOString().split('T')[0];
      const existing = dailyStats.get(date) || { pageViews: 0, ctaClicks: 0 };
      existing.pageViews += 1;
      dailyStats.set(date, existing);
    });

    // Process CTA clicks
    ctaClicksData.forEach(record => {
      const date = new Date(record.created_at).toISOString().split('T')[0];
      const existing = dailyStats.get(date) || { pageViews: 0, ctaClicks: 0 };
      existing.ctaClicks += 1;
      dailyStats.set(date, existing);
    });

    // Convert to arrays
    const pageViews: { date: string; value: number }[] = [];
    const ctaClicks: { date: string; value: number }[] = [];
    const conversionRate: { date: string; value: number }[] = [];

    Array.from(dailyStats.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, stats]) => {
        pageViews.push({ date, value: stats.pageViews });
        ctaClicks.push({ date, value: stats.ctaClicks });
        
        const rate = stats.pageViews > 0 ? (stats.ctaClicks / stats.pageViews) * 100 : 0;
        conversionRate.push({ date, value: rate });
      });

    return { pageViews, ctaClicks, conversionRate };
  }

  /**
   * Process raw analytics data into trend format (legacy method)
   */
  private processDataIntoTrends(data: any[]): {
    pageViews: { date: string; value: number }[];
    ctaClicks: { date: string; value: number }[];
    conversionRate: { date: string; value: number }[];
  } {
    const dailyStats = new Map<string, { pageViews: number; ctaClicks: number }>();

    // Aggregate data by date
    data.forEach(record => {
      const date = new Date(record.created_at).toISOString().split('T')[0];
      const existing = dailyStats.get(date) || { pageViews: 0, ctaClicks: 0 };
      
      existing.pageViews += record.page_views?.view_count || 0;
      existing.ctaClicks += record.cta_clicks?.click_count || 0;
      
      dailyStats.set(date, existing);
    });

    // Convert to arrays
    const pageViews: { date: string; value: number }[] = [];
    const ctaClicks: { date: string; value: number }[] = [];
    const conversionRate: { date: string; value: number }[] = [];

    Array.from(dailyStats.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, stats]) => {
        pageViews.push({ date, value: stats.pageViews });
        ctaClicks.push({ date, value: stats.ctaClicks });
        
        const rate = stats.pageViews > 0 ? (stats.ctaClicks / stats.pageViews) * 100 : 0;
        conversionRate.push({ date, value: rate });
      });

    return { pageViews, ctaClicks, conversionRate };
  }

  /**
   * Analyze trends and generate insights
   */
  private analyzeTrends(trends: {
    pageViews: { date: string; value: number }[];
    ctaClicks: { date: string; value: number }[];
    conversionRate: { date: string; value: number }[];
  }): {
    trendDirection: 'improving' | 'declining' | 'stable';
    keyChanges: string[];
    recommendations: string[];
  } {
    const keyChanges: string[] = [];
    const recommendations: string[] = [];

    // Calculate trend directions
    const pageViewTrend = this.calculateTrendDirection(trends.pageViews);
    const ctaClickTrend = this.calculateTrendDirection(trends.ctaClicks);
    const conversionTrend = this.calculateTrendDirection(trends.conversionRate);

    // Analyze page view trends
    if (pageViewTrend.direction === 'increasing') {
      keyChanges.push(`Page views trending up (+${pageViewTrend.change.toFixed(1)}%)`);
    } else if (pageViewTrend.direction === 'decreasing') {
      keyChanges.push(`Page views trending down (${pageViewTrend.change.toFixed(1)}%)`);
      recommendations.push('Consider improving SEO or increasing marketing efforts');
    }

    // Analyze CTA click trends
    if (ctaClickTrend.direction === 'increasing') {
      keyChanges.push(`CTA clicks trending up (+${ctaClickTrend.change.toFixed(1)}%)`);
    } else if (ctaClickTrend.direction === 'decreasing') {
      keyChanges.push(`CTA clicks trending down (${ctaClickTrend.change.toFixed(1)}%)`);
      recommendations.push('Review CTA placement and messaging');
    }

    // Analyze conversion rate trends (most important)
    if (conversionTrend.direction === 'increasing') {
      keyChanges.push(`Conversion rate improving (+${conversionTrend.change.toFixed(2)}%)`);
    } else if (conversionTrend.direction === 'decreasing') {
      keyChanges.push(`Conversion rate declining (${conversionTrend.change.toFixed(2)}%)`);
      recommendations.push('Focus on conversion optimization strategies');
    }

    // Determine overall trend
    let trendDirection: 'improving' | 'declining' | 'stable';
    
    if (conversionTrend.direction === 'increasing' || 
        (pageViewTrend.direction === 'increasing' && ctaClickTrend.direction === 'increasing')) {
      trendDirection = 'improving';
    } else if (conversionTrend.direction === 'decreasing' ||
               (pageViewTrend.direction === 'decreasing' && ctaClickTrend.direction === 'decreasing')) {
      trendDirection = 'declining';
    } else {
      trendDirection = 'stable';
    }

    // Add general recommendations based on overall trend
    if (trendDirection === 'improving') {
      recommendations.push('Continue current strategies that are working');
    } else if (trendDirection === 'declining') {
      recommendations.push('Consider running AI analysis for improvement suggestions');
    } else {
      recommendations.push('Look for opportunities to break out of plateau');
    }

    return { trendDirection, keyChanges, recommendations };
  }

  /**
   * Calculate trend direction for a data series
   */
  private calculateTrendDirection(data: { date: string; value: number }[]): {
    direction: 'increasing' | 'decreasing' | 'stable';
    change: number;
  } {
    if (data.length < 2) {
      return { direction: 'stable', change: 0 };
    }

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;

    const change = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    if (Math.abs(change) < 5) {
      return { direction: 'stable', change };
    } else if (change > 0) {
      return { direction: 'increasing', change };
    } else {
      return { direction: 'decreasing', change };
    }
  }

  /**
   * Get section-specific performance data
   */
  async getSectionPerformance(landingPageId: string): Promise<{
    sections: {
      name: string;
      viewTime: number;
      dropoffRate: number;
      engagement: 'high' | 'medium' | 'low';
    }[];
    recommendations: string[];
  }> {
    // This would integrate with the section_dropoff_mv materialized view
    // For now, return placeholder data structure
    
    const sections = [
      { name: 'header', viewTime: 0, dropoffRate: 0, engagement: 'medium' as const },
      { name: 'bio', viewTime: 0, dropoffRate: 0, engagement: 'medium' as const },
      { name: 'services', viewTime: 0, dropoffRate: 0, engagement: 'medium' as const },
      { name: 'testimonials', viewTime: 0, dropoffRate: 0, engagement: 'medium' as const },
      { name: 'cta', viewTime: 0, dropoffRate: 0, engagement: 'medium' as const },
    ];

    const recommendations = [
      'Section-specific analytics coming soon',
      'Focus on sections with high drop-off rates'
    ];

    return { sections, recommendations };
  }
}

export const analyticsProcessor = new AnalyticsProcessor();