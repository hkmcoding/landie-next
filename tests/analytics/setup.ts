import { beforeAll, afterAll } from 'vitest'
import { resetTestDatabase } from './_helpers'

// Global setup for analytics tests
beforeAll(async () => {
  console.log('Starting Supabase for analytics tests...')
  
  // Note: Assumes supabase is already running via npm script
  // In CI/CD, this would be handled by the test runner
  
  // Reset database to ensure clean state
  await resetTestDatabase()
}, 60000) // 60 second timeout for database reset

afterAll(async () => {
  console.log('Analytics test suite completed')
  // Cleanup if needed
})