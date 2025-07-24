import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Deterministic UUIDs for testing
export const TEST_USER_ID = '00000000-0000-4000-8000-000000000001'
export const TEST_LANDING_PAGE_ID = '00000000-0000-4000-8000-000000000010'
export const TEST_SESSION_IDS = [
  '00000000-0000-4000-8000-000000000100',
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000104',
]
export const TEST_VISITOR_IDS = [
  '00000000-0000-4000-8000-000000000200',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
]

// Base timestamp for deterministic testing (2025-07-23 10:00:00 UTC)
export const BASE_TIMESTAMP = new Date('2025-07-23T10:00:00Z')

export function getTestSupabaseClient(): SupabaseClient {
  return createClient(
    'http://localhost:54322',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
  )
}

/**
 * Seeds page_views table with 24 rows across 12 hours (2 per hour)
 */
export async function seedPageViews(supabase: SupabaseClient, landingPageId: string) {
  const pageViews = []
  
  for (let hour = 0; hour < 12; hour++) {
    for (let view = 0; view < 2; view++) {
      const timestamp = new Date(BASE_TIMESTAMP)
      timestamp.setHours(timestamp.getHours() + hour)
      timestamp.setMinutes(view * 30) // 00:00 and 00:30 for each hour
      
      pageViews.push({
        id: `${hour.toString().padStart(2, '0')}${view}00000-0000-4000-8000-000000000000`,
        landing_page_id: landingPageId,
        viewer_id: TEST_VISITOR_IDS[view % TEST_VISITOR_IDS.length],
        session_id: TEST_SESSION_IDS[hour % TEST_SESSION_IDS.length],
        url: `https://example.com/page-${hour}-${view}`,
        referrer: hour % 3 === 0 ? 'https://google.com' : null,
        user_agent: 'Test Agent',
        created_at: timestamp.toISOString(),
        updated_at: timestamp.toISOString()
      })
    }
  }
  
  const { error } = await supabase
    .schema('analytics')
    .from('page_views')
    .insert(pageViews)
    
  if (error) throw new Error(`Failed to seed page_views: ${error.message}`)
}

/**
 * Seeds cta_clicks table with 10 rows
 */
export async function seedCtaClicks(supabase: SupabaseClient, landingPageId: string) {
  const ctaClicks = []
  
  for (let i = 0; i < 10; i++) {
    const timestamp = new Date(BASE_TIMESTAMP)
    timestamp.setHours(timestamp.getHours() + Math.floor(i / 2)) // Spread across 5 hours
    timestamp.setMinutes(i * 6) // Every 6 minutes
    
    ctaClicks.push({
      id: `${i.toString().padStart(2, '0')}000000-0000-4000-8000-000000000000`,
      landing_page_id: landingPageId,
      cta_text: `Button ${i + 1}`,
      url: `https://example.com/cta-${i}`,
      session_id: TEST_SESSION_IDS[i % TEST_SESSION_IDS.length],
      referrer: i % 2 === 0 ? 'https://google.com' : null,
      user_agent: 'Test Agent',
      created_at: timestamp.toISOString(),
      updated_at: timestamp.toISOString()
    })
  }
  
  const { error } = await supabase
    .schema('analytics')
    .from('cta_clicks')
    .insert(ctaClicks)
    
  if (error) throw new Error(`Failed to seed cta_clicks: ${error.message}`)
}

/**
 * Seeds page_sessions table with 5 sessions of varying durations
 */
export async function seedPageSessions(supabase: SupabaseClient, landingPageId: string) {
  const durations = [60, 120, 180, 240, 300] // 1, 2, 3, 4, 5 minutes
  const sessions = []
  
  for (let i = 0; i < 5; i++) {
    const startTime = new Date(BASE_TIMESTAMP)
    startTime.setHours(startTime.getHours() + i)
    
    const endTime = new Date(startTime)
    endTime.setSeconds(endTime.getSeconds() + durations[i])
    
    sessions.push({
      id: `${i}0000000-0000-4000-8000-000000000000`,
      landing_page_id: landingPageId,
      session_id: TEST_SESSION_IDS[i],
      visitor_id: TEST_VISITOR_IDS[i % TEST_VISITOR_IDS.length],
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_seconds: durations[i],
      page_count: i + 1,
      created_at: startTime.toISOString(),
      updated_at: endTime.toISOString()
    })
  }
  
  const { error } = await supabase
    .schema('analytics')
    .from('page_sessions')
    .insert(sessions)
    
  if (error) throw new Error(`Failed to seed page_sessions: ${error.message}`)
}

/**
 * Seeds unique_visitors table with 3 unique visitors
 */
export async function seedUniqueVisitors(supabase: SupabaseClient, landingPageId: string) {
  const visitors = []
  
  for (let i = 0; i < 3; i++) {
    const firstVisit = new Date(BASE_TIMESTAMP)
    firstVisit.setHours(firstVisit.getHours() + i)
    
    const lastVisit = new Date(firstVisit)
    lastVisit.setHours(lastVisit.getHours() + i + 1) // Last visit is 1-3 hours later
    
    visitors.push({
      id: `${i}0000000-0000-4000-8000-000000000000`,
      landing_page_id: landingPageId,
      visitor_id: TEST_VISITOR_IDS[i],
      first_visit: firstVisit.toISOString(),
      last_visit: lastVisit.toISOString(),
      visit_count: i + 1, // 1, 2, 3 visits respectively
      user_agent: `Test Agent ${i + 1}`,
      referrer: i === 0 ? 'https://google.com' : null,
      created_at: firstVisit.toISOString(),
      updated_at: lastVisit.toISOString()
    })
  }
  
  const { error } = await supabase
    .schema('analytics')
    .from('unique_visitors')
    .insert(visitors)
    
  if (error) throw new Error(`Failed to seed unique_visitors: ${error.message}`)
}

/**
 * Seeds section_view_events for section dropoff and conversion tracking
 */
export async function seedSectionViewEvents(supabase: SupabaseClient, landingPageId: string) {
  const sections = ['hero', 'features', 'testimonials']
  const events = []
  
  // Create view events for 3 sessions across 3 sections
  for (let sessionIdx = 0; sessionIdx < 3; sessionIdx++) {
    for (let sectionIdx = 0; sectionIdx <= sessionIdx; sectionIdx++) { // Dropoff pattern
      const timestamp = new Date(BASE_TIMESTAMP)
      timestamp.setHours(timestamp.getHours() + sessionIdx)
      timestamp.setMinutes(sectionIdx * 10)
      
      events.push({
        id: `${sessionIdx}${sectionIdx}000000-0000-4000-8000-000000000000`,
        landing_page_id: landingPageId,
        session_id: TEST_SESSION_IDS[sessionIdx],
        section: sections[sectionIdx],
        index: sectionIdx,
        created_at: timestamp.toISOString(),
        updated_at: timestamp.toISOString()
      })
    }
  }
  
  const { error } = await supabase
    .schema('analytics')
    .from('section_view_events')
    .insert(events)
    
  if (error) throw new Error(`Failed to seed section_view_events: ${error.message}`)
}

/**
 * Refreshes all materialized views and functions
 */
export async function refreshAll(supabase: SupabaseClient) {
  const refreshOperations = [
    // Refresh section dropoff materialized view
    supabase.rpc('analytics.refresh_section_dropoff'),
  ]
  
  const results = await Promise.allSettled(refreshOperations)
  
  // Check for any failures
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`Refresh operation ${index} failed:`, result.reason)
    }
  })
}

/**
 * Resets the test database to a clean state
 */
export async function resetTestDatabase() {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)
  
  try {
    await execAsync('supabase db reset')
    console.log('Database reset complete')
  } catch (error) {
    console.error('Failed to reset database:', error)
    throw error
  }
}

/**
 * Seeds all analytics data for comprehensive testing
 */
export async function seedAllAnalyticsData(supabase: SupabaseClient, landingPageId: string) {
  await seedPageViews(supabase, landingPageId)
  await seedCtaClicks(supabase, landingPageId)
  await seedPageSessions(supabase, landingPageId)
  await seedUniqueVisitors(supabase, landingPageId)
  await seedSectionViewEvents(supabase, landingPageId)
  await refreshAll(supabase)
}