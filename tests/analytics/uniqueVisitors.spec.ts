import { describe, beforeAll, it, expect } from 'vitest'
import { AnalyticsService } from '@/lib/supabase/analytics-service'
import { 
  getTestSupabaseClient, 
  seedUniqueVisitors, 
  refreshAll, 
  resetTestDatabase,
  TEST_USER_ID, 
  TEST_LANDING_PAGE_ID 
} from './_helpers'

const supabase = getTestSupabaseClient()
const service = new AnalyticsService(supabase)

describe('Unique Visitors Analytics', () => {
  beforeAll(async () => {
    await resetTestDatabase()
    await seedUniqueVisitors(supabase, TEST_LANDING_PAGE_ID)
    await refreshAll(supabase)
  })

  it('returns correct total unique visitors count', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // We seeded 3 unique visitors
    expect(data.totalUniqueVisitors).toBe(3)
  })

  it('returns unique visitors array with correct length', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // Should return all 3 unique visitor records
    expect(data.uniqueVisits).toHaveLength(3)
  })

  it('unique visitors have correct structure', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    expect(data.uniqueVisits.length).toBeGreaterThan(0)
    
    const firstVisitor = data.uniqueVisits[0]
    expect(firstVisitor).toHaveProperty('id')
    expect(firstVisitor).toHaveProperty('user_id', TEST_USER_ID)
    expect(firstVisitor).toHaveProperty('landing_page_id', TEST_LANDING_PAGE_ID)
    expect(firstVisitor).toHaveProperty('visitor_id')
    expect(firstVisitor).toHaveProperty('first_visit')
    expect(firstVisitor).toHaveProperty('last_visit')
    expect(firstVisitor).toHaveProperty('total_visits')
    expect(firstVisitor).toHaveProperty('total_page_views')
    expect(firstVisitor).toHaveProperty('user_agent')
    expect(firstVisitor).toHaveProperty('created_at')
    expect(firstVisitor).toHaveProperty('updated_at')
  })

  it('unique visitors are ordered by last visit descending', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    expect(data.uniqueVisits.length).toBeGreaterThan(1)
    
    // Check that last visit dates are in descending order
    for (let i = 0; i < data.uniqueVisits.length - 1; i++) {
      const currentDate = new Date(data.uniqueVisits[i].last_visit)
      const nextDate = new Date(data.uniqueVisits[i + 1].last_visit)
      expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
    }
  })

  it('filters unique visitors by landing page id', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // All unique visitors should belong to the test landing page
    data.uniqueVisits.forEach(visitor => {
      expect(visitor.landing_page_id).toBe(TEST_LANDING_PAGE_ID)
    })
  })

  it('unique visitors have correct visit counts', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    expect(data.uniqueVisits).toHaveLength(3)
    
    // We seeded visitors with visit counts 1, 2, 3
    const visitCounts = data.uniqueVisits.map(v => v.total_visits).sort()
    expect(visitCounts).toEqual([1, 2, 3])
  })

  it('first visit is before or equal to last visit', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    data.uniqueVisits.forEach(visitor => {
      const firstVisit = new Date(visitor.first_visit)
      const lastVisit = new Date(visitor.last_visit)
      expect(firstVisit.getTime()).toBeLessThanOrEqual(lastVisit.getTime())
    })
  })

  it('visitor user agents match seeded data', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // Check that we have the expected user agents (Test Agent 1, 2, 3)
    const userAgents = data.uniqueVisits.map(v => v.user_agent).sort()
    const expectedAgents = ['Test Agent 1', 'Test Agent 2', 'Test Agent 3']
    expect(userAgents).toEqual(expectedAgents)
  })

  it('visitor with referrer is correctly identified', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // The first visitor (index 0 in seed data) should have a referrer
    const visitorWithReferrer = data.uniqueVisits.find(v => v.referer === 'https://google.com')
    expect(visitorWithReferrer).toBeDefined()
    
    // Others should have null referrer
    const visitorsWithoutReferrer = data.uniqueVisits.filter(v => v.referer === null)
    expect(visitorsWithoutReferrer).toHaveLength(2)
  })

  it('total page views approximation matches visit count', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // The service approximates total_page_views as visit_count
    data.uniqueVisits.forEach(visitor => {
      expect(visitor.total_page_views).toBe(visitor.total_visits)
    })
  })
})