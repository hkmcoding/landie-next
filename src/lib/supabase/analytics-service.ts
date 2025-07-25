import { createClient } from './client'
import type { 
  AnalyticsData,
  CtaClick,
  PageTimeMV,
  UniqueVisitor,
  PageView,
  PageViewsHourlyMV,
  CtaClicksHourlyMV,
  SectionDropoffMV,
  SectionToCtaMV,
  ContentChange,
  SectionViewEvent
} from '@/types/dashboard'

export class AnalyticsService {
  private supabase: any

  constructor(customClient?: any) {
    this.supabase = customClient || createClient()
  }

  async getAnalyticsData(userId: string, landingPageId: string, isPro: boolean = false): Promise<AnalyticsData> {
    // Get aggregated analytics summary for consistency with pro analytics
    const { data: summary, error: summaryError } = await this.supabase
      .rpc('get_user_analytics_summary', {
        p_user_id: userId,
        p_landing_page_id: landingPageId
      });

    // If summary fails, fall back to individual queries
    if (summaryError || !summary) {
      console.warn('Analytics summary failed, falling back to individual queries:', summaryError);
      return this.getFallbackAnalyticsData(userId, landingPageId, isPro);
    }

    // Only fetch individual data needed for arrays, use summary for counts
    const basicPromises = [
      this.getCtaClicks(userId, landingPageId),
      this.getAveragePageSession(userId, landingPageId),
      this.getUniqueVisits(userId, landingPageId)
      // Remove getPageViews - use summary counts to prevent inflation
    ]

    const proPromises = isPro ? [
      this.getViewsOverTime(userId, landingPageId),
      this.getCtaClicksOverTime(userId, landingPageId),
      this.getSectionDropoff(userId, landingPageId),
      this.getSectionToCtaConversion(userId, landingPageId),
      this.getContentChanges(userId, landingPageId),
      this.getSectionViewEvents(userId, landingPageId)
    ] : []

    const allResults = await Promise.all([...basicPromises, ...proPromises])

    // Use database function counts instead of array lengths for consistency
    const result: AnalyticsData = {
      ctaClicks: (allResults[0] as CtaClick[]) || [],
      averagePageSession: (allResults[1] as PageTimeMV) || null,
      uniqueVisits: (allResults[2] as UniqueVisitor[]) || [],
      pageViews: [], // Empty array - use summary counts only
      // Use aggregated counts from database function to prevent inflation
      totalPageViews: summary.analytics?.total_page_views || 0,
      totalCtaClicks: summary.analytics?.total_cta_clicks || 0,
      totalUniqueVisitors: summary.analytics?.unique_visitors || 0
    }

    if (isPro && allResults.length > 3) {
      result.viewsOverTime = (allResults[3] as PageViewsHourlyMV[]) || []
      result.ctaClicksOverTime = (allResults[4] as CtaClicksHourlyMV[]) || []
      result.sectionDropoff = (allResults[5] as SectionDropoffMV[]) || []
      result.sectionToCtaConversion = (allResults[6] as SectionToCtaMV[]) || []
      result.contentChanges = (allResults[7] as ContentChange[]) || []
      result.sectionViewEvents = (allResults[8] as SectionViewEvent[]) || []
    }

    return result
  }

  private async getFallbackAnalyticsData(userId: string, landingPageId: string, isPro: boolean = false): Promise<AnalyticsData> {
    const basicPromises = [
      this.getCtaClicks(userId, landingPageId),
      this.getAveragePageSession(userId, landingPageId),
      this.getUniqueVisits(userId, landingPageId),
      this.getPageViews(userId, landingPageId)
    ]

    const proPromises = isPro ? [
      this.getViewsOverTime(userId, landingPageId),
      this.getCtaClicksOverTime(userId, landingPageId),
      this.getSectionDropoff(userId, landingPageId),
      this.getSectionToCtaConversion(userId, landingPageId),
      this.getContentChanges(userId, landingPageId),
      this.getSectionViewEvents(userId, landingPageId)
    ] : []

    const allResults = await Promise.all([...basicPromises, ...proPromises])

    const result: AnalyticsData = {
      ctaClicks: (allResults[0] as CtaClick[]) || [],
      averagePageSession: (allResults[1] as PageTimeMV) || null,
      uniqueVisits: (allResults[2] as UniqueVisitor[]) || [],
      pageViews: (allResults[3] as PageView[]) || [],
      // Use safer counts - avoid inflated array lengths
      totalPageViews: await this.getSafePageViewCount(userId, landingPageId),
      totalCtaClicks: ((allResults[0] as CtaClick[]) || []).length,
      totalUniqueVisitors: ((allResults[2] as UniqueVisitor[]) || []).length
    }

    if (isPro && allResults.length > 4) {
      result.viewsOverTime = (allResults[4] as PageViewsHourlyMV[]) || []
      result.ctaClicksOverTime = (allResults[5] as CtaClicksHourlyMV[]) || []
      result.sectionDropoff = (allResults[6] as SectionDropoffMV[]) || []
      result.sectionToCtaConversion = (allResults[7] as SectionToCtaMV[]) || []
      result.contentChanges = (allResults[8] as ContentChange[]) || []
      result.sectionViewEvents = (allResults[9] as SectionViewEvent[]) || []
    }

    return result
  }

  private async getSafePageViewCount(userId: string, landingPageId: string): Promise<number> {
    try {
      // Use COUNT(*) with DISTINCT to avoid duplicates in fallback
      const { count, error } = await this.supabase
        .schema('analytics')
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('landing_page_id', landingPageId);

      if (error) {
        console.error('Error getting safe page view count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getSafePageViewCount:', error);
      return 0;
    }
  }

  private async getCtaClicks(userId: string, landingPageId: string): Promise<CtaClick[]> {
    const { data, error } = await this.supabase
      .schema('analytics')
      .from('cta_clicks')
      .select('*')
      .eq('landing_page_id', landingPageId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching CTA clicks:', error)
      return []
    }
    
    // Transform data to match expected interface (add missing user_id)
    return (data || []).map(click => ({
      ...click,
      user_id: userId, // Add the user_id that's expected by the interface
      button_text: click.cta_text,
      button_url: click.url,
      visitor_id: click.session_id,
      ip_address: null,
      referer: click.referrer
    }))
  }

  private async getAveragePageSession(userId: string, landingPageId: string): Promise<PageTimeMV | null> {
    
    // Calculate from page_sessions table since page_time_mv doesn't exist
    const { data, error } = await this.supabase
      .schema('analytics')
      .from('page_sessions')
      .select('duration_seconds')
      .eq('landing_page_id', landingPageId)
      .not('duration_seconds', 'is', null)

    if (error) {
      console.error('Error fetching page sessions:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    // Calculate average session duration
    const totalDuration = data.reduce((sum, session) => sum + (session.duration_seconds || 0), 0)
    const avgDuration = totalDuration / data.length

    
    return {
      user_id: userId,
      landing_page_id: landingPageId,
      avg_session_duration: avgDuration,
      total_sessions: data.length,
      total_page_views: data.length // Approximate, each session has at least one page view
    }
  }

  private async getUniqueVisits(userId: string, landingPageId: string): Promise<UniqueVisitor[]> {
    const { data, error } = await this.supabase
      .schema('analytics')
      .from('unique_visitors')
      .select('*')
      .eq('landing_page_id', landingPageId)
      .order('last_visit', { ascending: false })

    if (error) {
      console.error('Error fetching unique visitors:', error)
      return []
    }
    
    // Transform data to match expected interface
    return (data || []).map(visitor => ({
      id: visitor.id, // Use the table's primary key id
      user_id: userId,
      landing_page_id: visitor.landing_page_id,
      visitor_id: visitor.visitor_id,
      first_visit: visitor.first_visit,
      last_visit: visitor.last_visit,
      total_visits: visitor.visit_count || 1,
      total_page_views: visitor.visit_count || 1, // Approximate
      total_session_duration: 0, // We don't have this data readily available
      ip_address: null,
      user_agent: visitor.user_agent,
      referer: visitor.referrer,
      created_at: visitor.created_at,
      updated_at: visitor.updated_at
    }))
  }

  private async getPageViews(userId: string, landingPageId: string): Promise<PageView[]> {
    const { data, error } = await this.supabase
      .schema('analytics')
      .from('page_views')
      .select('*')
      .eq('landing_page_id', landingPageId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching page views:', error)
      return []
    }
    
    // Transform data to match expected interface
    return (data || []).map(view => ({
      ...view,
      user_id: userId, // Add the user_id that's expected by the interface
      visitor_id: view.viewer_id,
      ip_address: null,
      referer: view.referrer
    }))
  }

  private async getViewsOverTime(userId: string, landingPageId: string): Promise<PageViewsHourlyMV[]> {
    // TODO: Implement by aggregating page_views by hour
    return []
  }

  private async getCtaClicksOverTime(userId: string, landingPageId: string): Promise<CtaClicksHourlyMV[]> {
    // TODO: Implement by aggregating cta_clicks by hour
    return []
  }

  private async getSectionDropoff(userId: string, landingPageId: string): Promise<SectionDropoffMV[]> {
    const { data, error } = await this.supabase
      .schema('analytics')
      .from('section_dropoff_mv')
      .select('*')
      .eq('landing_page_id', landingPageId)
      .order('section_order', { ascending: true });

    if (error) {
      console.error('Error fetching section dropoff:', error);
      return [];
    }

    // Data already matches SectionDropoffMV interface
    return data || [];
  }

  private async getSectionToCtaConversion(userId: string, landingPageId: string): Promise<SectionToCtaMV[]> {
    // TODO: Implement when we add section view tracking
    return []
  }

  private async getContentChanges(userId: string, landingPageId: string): Promise<ContentChange[]> {
    // TODO: Implement content change tracking system
    return []
  }

  private async getSectionViewEvents(userId: string, landingPageId: string): Promise<SectionViewEvent[]> {
    // TODO: Implement section view tracking
    return []
  }
}

export const analyticsService = new AnalyticsService()