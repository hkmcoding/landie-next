import { describe, beforeAll, it, expect } from 'vitest'
import { AnalyticsService } from '@/lib/supabase/analytics-service'
import { 
  getTestSupabaseClient, 
  seedPageSessions, 
  refreshAll, 
  resetTestDatabase,
  TEST_USER_ID, 
  TEST_LANDING_PAGE_ID 
} from './_helpers'

const supabase = getTestSupabaseClient()
const service = new AnalyticsService(supabase)

describe('Average Session Duration Analytics', () => {
  beforeAll(async () => {
    await resetTestDatabase()
    await seedPageSessions(supabase, TEST_LANDING_PAGE_ID)
    await refreshAll(supabase)
  })

  it('calculates correct average session duration', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // We seeded 5 sessions with durations: 60, 120, 180, 240, 300 seconds
    // Average = (60 + 120 + 180 + 240 + 300) / 5 = 900 / 5 = 180 seconds
    expect(data.averagePageSession).not.toBeNull()
    expect(data.averagePageSession!.avg_session_duration).toBe(180)
  })

  it('returns correct total sessions count', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // We seeded 5 sessions
    expect(data.averagePageSession).not.toBeNull()
    expect(data.averagePageSession!.total_sessions).toBe(5)
  })

  it('returns average session data with correct structure', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    expect(data.averagePageSession).not.toBeNull()
    
    const avgSession = data.averagePageSession!
    expect(avgSession).toHaveProperty('user_id', TEST_USER_ID)
    expect(avgSession).toHaveProperty('landing_page_id', TEST_LANDING_PAGE_ID)
    expect(avgSession).toHaveProperty('avg_session_duration')
    expect(avgSession).toHaveProperty('total_sessions')
    expect(avgSession).toHaveProperty('total_page_views')
    
    // Values should be positive numbers
    expect(avgSession.avg_session_duration).toBeGreaterThan(0)
    expect(avgSession.total_sessions).toBeGreaterThan(0)
    expect(avgSession.total_page_views).toBeGreaterThan(0)
  })

  it('handles sessions with various durations correctly', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    expect(data.averagePageSession).not.toBeNull()
    
    const avgSession = data.averagePageSession!
    
    // Average should be between the min (60) and max (300) durations
    expect(avgSession.avg_session_duration).toBeGreaterThanOrEqual(60)
    expect(avgSession.avg_session_duration).toBeLessThanOrEqual(300)
    
    // Should be exactly 180 based on our seeded data
    expect(avgSession.avg_session_duration).toBe(180)
  })

  it('returns null when no sessions exist', async () => {
    // Test with a different landing page that has no sessions
    const emptyLandingPageId = '00000000-0000-4000-8000-000000000999'
    const data = await service.getAnalyticsData(TEST_USER_ID, emptyLandingPageId, true)
    
    expect(data.averagePageSession).toBeNull()
  })

  it('total page views approximation matches session count', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    expect(data.averagePageSession).not.toBeNull()
    
    // The service approximates total_page_views as the number of sessions
    // This is a reasonable approximation since each session has at least one page view
    expect(data.averagePageSession!.total_page_views).toBe(5)
    expect(data.averagePageSession!.total_page_views).toBe(data.averagePageSession!.total_sessions)
  })
})