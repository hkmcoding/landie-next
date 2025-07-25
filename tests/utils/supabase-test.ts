import { createClient } from '@supabase/supabase-js'

// Local Supabase configuration for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// Create admin client for test operations
export const testSupabase = createClient(supabaseUrl, serviceKey)

// Create regular client for user operations
export const createTestClient = () => {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  return createClient(supabaseUrl, anonKey)
}

export interface TestUser {
  id: string
  email: string
  password: string
}

/**
 * Creates a test user using Supabase Admin API
 */
export async function createTestUser(
  email: string, 
  password: string,
  userData: Record<string, any> = {}
): Promise<TestUser> {
  const { data, error } = await testSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userData
  })
  
  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`)
  }
  
  if (!data.user) {
    throw new Error('No user returned from createUser')
  }
  
  return {
    id: data.user.id,
    email,
    password
  }
}

/**
 * Signs in a test user and returns the session
 */
export async function signInTestUser(email: string, password: string) {
  const client = createTestClient()
  
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    throw new Error(`Failed to sign in test user: ${error.message}`)
  }
  
  return data
}

/**
 * Deletes a test user by ID
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  const { error } = await testSupabase.auth.admin.deleteUser(userId)
  
  if (error) {
    console.warn(`Failed to cleanup test user ${userId}: ${error.message}`)
  }
}

/**
 * Cleanup all test data for a user
 */
export async function cleanupTestData(userId: string): Promise<void> {
  const tables = [
    'services', 
    'testimonials', 
    'user_profiles', 
    'landing_pages',
    'analytics_events',
    'unique_visitors'
  ]
  
  // Clean up related data first
  for (const table of tables) {
    try {
      await testSupabase
        .from(table)
        .delete()
        .eq('user_id', userId)
    } catch (error) {
      console.warn(`Failed to cleanup ${table} for user ${userId}:`, error)
    }
  }
  
  // Finally delete the user
  await cleanupTestUser(userId)
}

/**
 * Wait for Supabase local to be ready
 */
export async function waitForSupabase(maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { data, error } = await testSupabase.from('user_profiles').select('count').limit(1)
      if (!error) {
        return true
      }
    } catch (e) {
      // Continue trying
    }
    
    // Wait 1 second between attempts
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return false
}

/**
 * Generate unique test email
 */
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `${prefix}-${timestamp}-${random}@example.com`
}

/**
 * Generate secure test password
 */
export function generateTestPassword(): string {
  return `TestPass${Date.now()}!`
}

/**
 * Creates a test landing page for a user
 */
export async function createTestLandingPage(userId: string, username: string): Promise<any> {
  const { data, error } = await testSupabase
    .from('landing_pages')
    .insert({
      user_id: userId,
      username: username,
      name: 'Test User',
      headline: 'Test Headline',
      bio: 'Test bio for testing purposes',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create test landing page: ${error.message}`)
  }
  
  return data
}

/**
 * Enhanced createTestUser with optional landing page creation
 */
export async function createTestUserWithLandingPage(
  email: string,
  password: string,
  username: string,
  createLandingPage: boolean = false
): Promise<TestUser & { landingPageId?: string }> {
  // First create the user
  const user = await createTestUser(email, password, { username })
  
  let landingPageId: string | undefined
  
  // Optionally create a landing page
  if (createLandingPage) {
    try {
      const landingPage = await createTestLandingPage(user.id, username)
      landingPageId = landingPage.id
    } catch (error) {
      console.warn('Failed to create landing page for test user:', error)
      // Clean up the user if landing page creation fails
      await cleanupTestUser(user.id)
      throw error
    }
  }
  
  return {
    ...user,
    landingPageId
  }
}