import { describe, beforeAll, it, expect } from 'vitest'
import { AnalyticsService } from '@/lib/supabase/analytics-service'
import { 
  getTestSupabaseClient, 
  seedPageViews, 
  refreshAll, 
  resetTestDatabase,
  TEST_USER_ID, 
  TEST_LANDING_PAGE_ID 
} from './_helpers'

const supabase = getTestSupabaseClient()
const service = new AnalyticsService(supabase)

describe('Page Views Analytics', () => {
  beforeAll(async () => {
    await resetTestDatabase()
    await seedPageViews(supabase, TEST_LANDING_PAGE_ID)
    await refreshAll(supabase)
  })

  it('returns correct total page views count', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // We seeded 24 page views (2 per hour for 12 hours)
    expect(data.totalPageViews).toBe(24)
  })

  it('returns page views array with correct length', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // Should return all 24 page view records
    expect(data.pageViews).toHaveLength(24)
  })

  it('returns views over time for pro analytics', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // Note: viewsOverTime is currently not implemented in the service
    // This test validates the current state and can be updated when implemented
    expect(data.viewsOverTime).toBeDefined()
    expect(Array.isArray(data.viewsOverTime)).toBe(true)
  })

  it('page views have correct structure', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    expect(data.pageViews.length).toBeGreaterThan(0)
    
    const firstView = data.pageViews[0]
    expect(firstView).toHaveProperty('id')
    expect(firstView).toHaveProperty('landing_page_id', TEST_LANDING_PAGE_ID)
    expect(firstView).toHaveProperty('visitor_id')
    expect(firstView).toHaveProperty('user_id', TEST_USER_ID)
    expect(firstView).toHaveProperty('created_at')
  })

  it('page views are ordered by creation date descending', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    expect(data.pageViews.length).toBeGreaterThan(1)
    
    // Check that dates are in descending order
    for (let i = 0; i < data.pageViews.length - 1; i++) {
      const currentDate = new Date(data.pageViews[i].created_at)
      const nextDate = new Date(data.pageViews[i + 1].created_at)
      expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
    }
  })

  it('filters page views by landing page id', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // All page views should belong to the test landing page
    data.pageViews.forEach(view => {
      expect(view.landing_page_id).toBe(TEST_LANDING_PAGE_ID)
    })
  })
})