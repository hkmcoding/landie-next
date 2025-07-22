import { vi } from 'vitest'
import type { UserProStatus, DashboardData } from '@/types/dashboard'

// Mock pro user utilities for testing pro feature access control
export class ProUserTestUtils {
  // Mock Supabase client for testing
  private supabase = {
    from: () => ({
      upsert: () => Promise.resolve({ data: null, error: null })
    })
  }

  /**
   * Creates mock pro status data for testing
   */
  generateMockProStatus(isProUser: boolean = true): UserProStatus {
    return {
      user_id: 'test-user-id',
      is_pro: isProUser,
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Creates mock dashboard data with pro status
   */
  generateMockDashboardDataWithProStatus(isPro: boolean = true): DashboardData {
    return {
      landingPage: {
        id: 'test-landing-page-id',
        user_id: 'test-user-id',
        username: 'testuser',
        headline: 'Test Headline',
        subheadline: 'Test Subheadline',
        cta_text: 'Get Started',
        cta_url: 'https://example.com',
        bio: 'Test bio content',
        profile_image_url: 'https://example.com/profile.jpg',
        theme_side: 'left',
        name: 'Test User',
        instagram_url: null,
        youtube_url: null,
        tiktok_url: null,
        contact_email: 'test@example.com',
        show_contact_form: true,
        onboarding_data: {},
        ai_uses: 0,
        created_at: new Date().toISOString()
      },
      services: [],
      highlights: [],
      testimonials: [],
      userProStatus: this.generateMockProStatus(isPro)
    }
  }

  /**
   * Creates analytics data with pro features gated appropriately
   */
  generateMockAnalyticsData(isPro: boolean = true) {
    const baseData = {
      ctaClicks: [
        {
          id: 'click-1',
          user_id: 'test-user-id',
          landing_page_id: 'test-landing-page-id',
          button_text: 'Get Started',
          button_url: 'https://example.com',
          visitor_id: 'visitor-1',
          ip_address: null,
          referer: 'https://google.com',
          created_at: new Date().toISOString()
        }
      ],
      uniqueVisits: [
        {
          id: 'visit-1',
          user_id: 'test-user-id',
          landing_page_id: 'test-landing-page-id',
          visitor_id: 'visitor-1',
          first_visit: new Date().toISOString(),
          last_visit: new Date().toISOString(),
          total_visits: 1,
          total_page_views: 1,
          total_session_duration: 0,
          ip_address: null,
          user_agent: 'Mozilla/5.0...',
          referer: 'https://google.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      pageViews: [
        {
          id: 'view-1',
          user_id: 'test-user-id',
          landing_page_id: 'test-landing-page-id',
          visitor_id: 'visitor-1',
          ip_address: null,
          referer: 'https://google.com',
          created_at: new Date().toISOString()
        }
      ],
      averagePageSession: {
        user_id: 'test-user-id',
        landing_page_id: 'test-landing-page-id',
        avg_session_duration: 45.5,
        total_sessions: 1,
        total_page_views: 1
      },
      totalPageViews: 1,
      totalCtaClicks: 1,
      totalUniqueVisitors: 1
    }

    // Only include pro features if user is pro
    if (isPro) {
      return {
        ...baseData,
        viewsOverTime: [
          {
            user_id: 'test-user-id',
            landing_page_id: 'test-landing-page-id',
            hour_bucket: new Date().toISOString(),
            total_views: 5,
            unique_visitors: 3
          }
        ],
        ctaClicksOverTime: [
          {
            user_id: 'test-user-id',
            landing_page_id: 'test-landing-page-id',
            hour_bucket: new Date().toISOString(),
            total_clicks: 2,
            unique_clickers: 1
          }
        ],
        sectionDropoff: [
          {
            user_id: 'test-user-id',
            landing_page_id: 'test-landing-page-id',
            section_name: 'hero',
            total_views: 10,
            avg_view_duration: 15000,
            dropoff_rate: 0.2,
            conversion_rate: 0.8
          }
        ],
        sectionToCtaConversion: [
          {
            user_id: 'test-user-id',
            landing_page_id: 'test-landing-page-id',
            section_name: 'services',
            section_views: 8,
            cta_clicks: 2,
            conversion_rate: 0.25
          }
        ],
        contentChanges: [],
        sectionViewEvents: []
      }
    }

    return baseData
  }

  /**
   * Mocks the analytics service for testing pro gating
   */
  mockAnalyticsService(isPro: boolean = true) {
    const mockData = this.generateMockAnalyticsData(isPro)
    
    return {
      getAnalyticsData: vi.fn().mockResolvedValue(mockData)
    }
  }

  /**
   * Creates test props for AnalyticsSection with pro status
   */
  createAnalyticsSectionProps(isPro: boolean = true) {
    return {
      dashboardData: this.generateMockDashboardDataWithProStatus(isPro),
      userId: 'test-user-id'
    }
  }

  /**
   * Simulates upgrading user to pro status
   */
  async upgradeUserToPro(userId: string = 'test-user-id'): Promise<UserProStatus> {
    // This would normally call the actual Supabase service
    // For testing, we just return mock data
    const mockProStatus = this.generateMockProStatus(true)
    
    // In real implementation, this would be:
    // return this.supabase.from('user_pro_status').upsert({ user_id: userId, is_pro: true })
    
    return mockProStatus
  }

  /**
   * Simulates downgrading user from pro status
   */
  async downgradeUserFromPro(userId: string = 'test-user-id'): Promise<UserProStatus> {
    const mockFreeStatus = this.generateMockProStatus(false)
    return mockFreeStatus
  }

  /**
   * Validates pro feature access based on user status
   */
  validateProFeatureAccess(userProStatus: UserProStatus | null, featureName: string): boolean {
    if (!userProStatus) {
      console.warn(`Pro feature '${featureName}' denied: No pro status found`)
      return false
    }

    if (!userProStatus.is_pro) {
      console.warn(`Pro feature '${featureName}' denied: User is not pro`)
      return false
    }

    console.log(`Pro feature '${featureName}' granted: User has pro access`)
    return true
  }

  /**
   * Creates test scenarios for different subscription states
   */
  getTestScenarios() {
    return {
      freeUser: {
        name: 'Free User',
        dashboardData: this.generateMockDashboardDataWithProStatus(false),
        expectedFeatures: {
          basicAnalytics: true,
          proAnalytics: false,
          aiAssistant: false,
          advancedCharts: false
        }
      },
      proUser: {
        name: 'Pro User',
        dashboardData: this.generateMockDashboardDataWithProStatus(true),
        expectedFeatures: {
          basicAnalytics: true,
          proAnalytics: true,
          aiAssistant: true,
          advancedCharts: true
        }
      },
      userWithoutProStatus: {
        name: 'User Without Pro Status Record',
        dashboardData: {
          ...this.generateMockDashboardDataWithProStatus(false),
          userProStatus: null
        },
        expectedFeatures: {
          basicAnalytics: true,
          proAnalytics: false,
          aiAssistant: false,
          advancedCharts: false
        }
      }
    }
  }
}

export const proUserTestUtils = new ProUserTestUtils()