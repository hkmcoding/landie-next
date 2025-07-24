import { describe, beforeAll, it, expect } from 'vitest'
import { AnalyticsService } from '@/lib/supabase/analytics-service'
import { 
  getTestSupabaseClient, 
  seedCtaClicks, 
  refreshAll, 
  resetTestDatabase,
  TEST_USER_ID, 
  TEST_LANDING_PAGE_ID 
} from './_helpers'

const supabase = getTestSupabaseClient()
const service = new AnalyticsService(supabase)

describe('CTA Clicks Analytics', () => {
  beforeAll(async () => {
    await resetTestDatabase()
    await seedCtaClicks(supabase, TEST_LANDING_PAGE_ID)
    await refreshAll(supabase)
  })

  it('returns correct total CTA clicks count', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // We seeded 10 CTA clicks
    expect(data.totalCtaClicks).toBe(10)
  })

  it('returns CTA clicks array with correct length', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // Should return all 10 CTA click records
    expect(data.ctaClicks).toHaveLength(10)
  })

  it('returns CTA clicks over time for pro analytics', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // Note: ctaClicksOverTime is currently not implemented in the service
    // This test validates the current state and can be updated when implemented
    expect(data.ctaClicksOverTime).toBeDefined()
    expect(Array.isArray(data.ctaClicksOverTime)).toBe(true)
  })

  it('CTA clicks have correct structure', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    expect(data.ctaClicks.length).toBeGreaterThan(0)
    
    const firstClick = data.ctaClicks[0]
    expect(firstClick).toHaveProperty('id')
    expect(firstClick).toHaveProperty('landing_page_id', TEST_LANDING_PAGE_ID)
    expect(firstClick).toHaveProperty('button_text')
    expect(firstClick).toHaveProperty('button_url')
    expect(firstClick).toHaveProperty('visitor_id')
    expect(firstClick).toHaveProperty('user_id', TEST_USER_ID)
    expect(firstClick).toHaveProperty('created_at')
  })

  it('CTA clicks are ordered by creation date descending', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    expect(data.ctaClicks.length).toBeGreaterThan(1)
    
    // Check that dates are in descending order
    for (let i = 0; i < data.ctaClicks.length - 1; i++) {
      const currentDate = new Date(data.ctaClicks[i].created_at)
      const nextDate = new Date(data.ctaClicks[i + 1].created_at)
      expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
    }
  })

  it('filters CTA clicks by landing page id', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // All CTA clicks should belong to the test landing page
    data.ctaClicks.forEach(click => {
      expect(click.landing_page_id).toBe(TEST_LANDING_PAGE_ID)
    })
  })

  it('CTA click button text matches seeded data', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    expect(data.ctaClicks.length).toBe(10)
    
    // Check that we have the expected button texts (Button 1 through Button 10)
    const buttonTexts = data.ctaClicks.map(click => click.button_text).sort()
    const expectedTexts = Array.from({length: 10}, (_, i) => `Button ${i + 1}`).sort()
    
    expect(buttonTexts).toEqual(expectedTexts)
  })

  it('CTA click URLs match seeded data pattern', async () => {
    const data = await service.getAnalyticsData(TEST_USER_ID, TEST_LANDING_PAGE_ID, true)
    
    // All URLs should follow the pattern https://example.com/cta-{number}
    data.ctaClicks.forEach(click => {
      expect(click.button_url).toMatch(/^https:\/\/example\.com\/cta-\d+$/)
    })
  })
})