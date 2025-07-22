import { testSupabase } from './supabase-test'

export interface SeedDataOptions {
  userId: string
  businessName?: string
  bio?: string
  subscriptionTier?: 'free' | 'pro'
  includeServices?: boolean
  includeTestimonials?: boolean
  includeLandingPage?: boolean
}

/**
 * Seeds test data for a user
 */
export async function seedTestData(options: SeedDataOptions) {
  const {
    userId,
    businessName = 'Test Business',
    bio = 'Test bio description',
    subscriptionTier = 'free',
    includeServices = true,
    includeTestimonials = true,
    includeLandingPage = false
  } = options

  try {
    // Seed user profile
    const { error: profileError } = await testSupabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        business_name: businessName,
        bio,
        subscription_tier: subscriptionTier,
        subscription_status: subscriptionTier === 'pro' ? 'active' : 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.warn('Failed to seed user profile:', profileError)
    }

    // Seed services
    if (includeServices) {
      const services = [
        {
          user_id: userId,
          title: 'Test Service 1',
          description: 'Description for test service 1',
          order_index: 0,
          price: '$99',
          created_at: new Date().toISOString()
        },
        {
          user_id: userId,
          title: 'Test Service 2', 
          description: 'Description for test service 2',
          order_index: 1,
          price: '$199',
          created_at: new Date().toISOString()
        }
      ]

      const { error: servicesError } = await testSupabase
        .from('services')
        .insert(services)

      if (servicesError) {
        console.warn('Failed to seed services:', servicesError)
      }
    }

    // Seed testimonials
    if (includeTestimonials) {
      const testimonials = [
        {
          user_id: userId,
          name: 'John Doe',
          content: 'Great service! Highly recommended.',
          order_index: 0,
          created_at: new Date().toISOString()
        },
        {
          user_id: userId,
          name: 'Jane Smith',
          content: 'Excellent work and professional service.',
          order_index: 1,
          created_at: new Date().toISOString()
        }
      ]

      const { error: testimonialsError } = await testSupabase
        .from('testimonials')
        .insert(testimonials)

      if (testimonialsError) {
        console.warn('Failed to seed testimonials:', testimonialsError)
      }
    }

    // Seed landing page
    if (includeLandingPage) {
      const { error: landingPageError } = await testSupabase
        .from('landing_pages')
        .insert({
          user_id: userId,
          slug: `test-landing-${Date.now()}`,
          title: `${businessName} - Landing Page`,
          description: 'Test landing page description',
          is_published: true,
          created_at: new Date().toISOString()
        })

      if (landingPageError) {
        console.warn('Failed to seed landing page:', landingPageError)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error seeding test data:', error)
    return { success: false, error }
  }
}

/**
 * Seeds Pro user data with analytics
 */
export async function seedProUserData(userId: string) {
  await seedTestData({
    userId,
    businessName: 'Pro Business',
    bio: 'Professional business with premium features',
    subscriptionTier: 'pro',
    includeServices: true,
    includeTestimonials: true,
    includeLandingPage: true
  })

  // Add some analytics data for pro user
  try {
    const analyticsEvents = [
      {
        user_id: userId,
        event_type: 'page_view',
        page_path: '/test-landing',
        user_agent: 'Test Browser',
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString()
      },
      {
        user_id: userId,
        event_type: 'contact_form_submit',
        page_path: '/test-landing',
        user_agent: 'Test Browser', 
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString()
      }
    ]

    await testSupabase
      .from('analytics_events')
      .insert(analyticsEvents)

    // Add unique visitor data
    await testSupabase
      .from('unique_visitors')
      .insert({
        user_id: userId,
        visitor_id: 'test-visitor-1',
        first_visit: new Date().toISOString(),
        last_visit: new Date().toISOString(),
        visit_count: 2
      })

  } catch (error) {
    console.warn('Failed to seed analytics data:', error)
  }
}

/**
 * Clean up all test data for a user
 */
export async function cleanupTestData(userId: string) {
  const tables = [
    'analytics_events',
    'unique_visitors', 
    'landing_pages',
    'testimonials',
    'services',
    'user_profiles'
  ]

  for (const table of tables) {
    try {
      await testSupabase
        .from(table)
        .delete()
        .eq('user_id', userId)
    } catch (error) {
      console.warn(`Failed to cleanup ${table}:`, error)
    }
  }
}

/**
 * Seeds wizard completion data
 */
export async function seedWizardCompletionData(userId: string, wizardData: any) {
  try {
    // Create landing page
    const { data: landingPage, error: lpError } = await testSupabase
      .from('landing_pages')
      .insert({
        user_id: userId,
        username: wizardData.username,
        name: wizardData.name,
        headline: wizardData.headline,
        subheadline: wizardData.subheadline,
        bio: wizardData.bio,
        contact_email: wizardData.contactEmail,
        show_contact_form: wizardData.wantsContactForm,
        cta_text: wizardData.ctaText,
        cta_url: wizardData.ctaUrl,
        is_published: true,
        slug: `${wizardData.username}-${Date.now()}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (lpError) {
      console.warn('Failed to create landing page:', lpError)
      return { success: false, error: lpError }
    }

    // Create services
    if (wizardData.services && wizardData.services.length > 0) {
      const services = wizardData.services.map((service: any, index: number) => ({
        landing_page_id: landingPage.id,
        user_id: userId,
        title: service.title,
        description: service.description,
        order_index: index,
        price: '',
        button_text: 'Learn More',
        button_url: '',
        image_urls: [],
        youtube_url: '',
        created_at: new Date().toISOString()
      }))

      const { error: servicesError } = await testSupabase
        .from('services')
        .insert(services)

      if (servicesError) {
        console.warn('Failed to create services:', servicesError)
      }
    }

    // Create highlights
    if (wizardData.highlights && wizardData.highlights.length > 0) {
      const highlights = wizardData.highlights.map((highlight: any, index: number) => ({
        landing_page_id: landingPage.id,
        user_id: userId,
        title: highlight.title,
        description: highlight.description,
        order_index: index,
        image_urls: [],
        created_at: new Date().toISOString()
      }))

      const { error: highlightsError } = await testSupabase
        .from('highlights')
        .insert(highlights)

      if (highlightsError) {
        console.warn('Failed to create highlights:', highlightsError)
      }
    }

    return { success: true, landingPage }
  } catch (error) {
    console.error('Error seeding wizard completion data:', error)
    return { success: false, error }
  }
}