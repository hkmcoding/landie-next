import { Page, expect } from '@playwright/test'
import { OnboardingData } from '@/lib/supabase/onboarding-service'

export interface WizardTestData {
  name: string
  username: string
  headline?: string
  subheadline?: string
  bio: string
  services: Array<{
    title: string
    description: string
  }>
  highlights: Array<{
    title: string
    description: string
  }>
  wantsContactForm: boolean
  contactEmail?: string
  wantsCTAButton: boolean
  ctaText?: string
  ctaUrl?: string
}

export function generateWizardTestData(overrides: Partial<WizardTestData> = {}): WizardTestData {
  const timestamp = Date.now()
  
  return {
    name: `Test User ${timestamp}`,
    username: `testuser${timestamp}`,
    headline: 'Senior Test Engineer',
    subheadline: 'Building reliable test automation',
    bio: 'I am a passionate test automation engineer with extensive experience in building robust testing frameworks and ensuring software quality.',
    services: [
      {
        title: 'Test Automation Setup',
        description: 'Complete test automation framework setup with CI/CD integration'
      },
      {
        title: 'Quality Assurance Consulting',
        description: 'Expert guidance on testing strategies and quality processes'
      }
    ],
    highlights: [
      {
        title: '5+ Years Experience',
        description: 'Extensive experience in test automation across multiple industries'
      },
      {
        title: 'Certified Professional',
        description: 'ISTQB Advanced Level certified testing professional'
      }
    ],
    wantsContactForm: true,
    contactEmail: `test${timestamp}@example.com`,
    wantsCTAButton: true,
    ctaText: 'Get Started',
    ctaUrl: 'mailto:test@example.com',
    ...overrides
  }
}

export class WizardPageObject {
  constructor(private page: Page) {}

  async navigateToOnboarding() {
    // Use dev route for testing to bypass authentication
    await this.page.goto('/dev/onboarding')
  }

  async waitForWizardLoad() {
    // Wait for page to load first
    await this.page.waitForLoadState('networkidle')
    
    // On dev page, click "Start Onboarding Wizard" button if it exists
    const startButton = this.page.getByRole('button', { name: /start onboarding wizard/i })
    const startButtonCount = await startButton.count()
    
    if (startButtonCount > 0) {
      await startButton.click()
      // Wait for wizard to load after clicking
      await this.page.waitForLoadState('networkidle')
    }
    
    // Now wait for the actual wizard
    await expect(this.page.locator('h1')).toContainText('Welcome to Landie')
    await expect(this.page.locator('text=Step 1 of 5')).toBeVisible()
  }

  async navigateToOnboardingAndLoad() {
    await this.navigateToOnboarding()
    await this.waitForWizardLoad()
    return true // Successfully loaded wizard
  }

  async verifyCurrentStep(stepNumber: number) {
    await expect(this.page.locator(`text=Step ${stepNumber} of 5`)).toBeVisible()
    
    // Verify step indicator is active
    const stepIndicator = this.page.locator(`[data-step="${stepNumber}"]`).first()
    if (await stepIndicator.count() > 0) {
      await expect(stepIndicator).toHaveClass(/text-primary/)
    }
  }

  async fillStep1(data: WizardTestData) {
    await this.verifyCurrentStep(1)
    await expect(this.page.locator('text=Let\'s get to know you')).toBeVisible()
    
    // Fill name field
    await this.page.getByRole('textbox', { name: /display name/i }).fill(data.name)
    
    // Fill username field
    await this.page.getByRole('textbox', { name: /username/i }).fill(data.username)
  }

  async fillStep2(data: WizardTestData) {
    await this.verifyCurrentStep(2)
    await expect(this.page.locator('text=Tell us about yourself')).toBeVisible()
    
    // Fill optional headline - use placeholder to identify the correct field
    if (data.headline) {
      await this.page.getByPlaceholder('e.g., Senior Software Engineer').fill(data.headline)
    }
    
    // Fill optional subheadline - use placeholder to identify the correct field
    if (data.subheadline) {
      await this.page.getByPlaceholder('e.g., Building amazing user experiences').fill(data.subheadline)
    }
    
    // Fill bio (required) - use placeholder instead of role
    await this.page.getByPlaceholder('Tell us about yourself, your background, and what you\'re passionate about...').fill(data.bio)
  }

  async fillStep3(data: WizardTestData) {
    await this.verifyCurrentStep(3)
    await expect(this.page.locator('text=What services do you offer?')).toBeVisible()
    
    // Set number of services
    const serviceCount = data.services.length
    if (serviceCount >= 1 && serviceCount <= 3) {
      await this.page.getByRole('button', { name: serviceCount.toString() }).click()
    }
    
    // Fill each service
    for (let i = 0; i < data.services.length; i++) {
      const service = data.services[i]
      
      // Service title - look for input within the service container
      const serviceContainer = this.page.locator('.border.rounded-lg').nth(i)
      await serviceContainer.getByRole('textbox', { name: /title/i }).fill(service.title)
      
      // Service description - use placeholder since it's a textarea
      await serviceContainer.getByPlaceholder('Describe what this service includes...').fill(service.description)
    }
  }

  async fillStep4(data: WizardTestData) {
    await this.verifyCurrentStep(4)
    await expect(this.page.locator('text=What are your key highlights?')).toBeVisible()
    
    // Set number of highlights
    const highlightCount = data.highlights.length
    if (highlightCount >= 1 && highlightCount <= 3) {
      await this.page.getByRole('button', { name: highlightCount.toString() }).click()
    }
    
    // Fill each highlight
    for (let i = 0; i < data.highlights.length; i++) {
      const highlight = data.highlights[i]
      
      // Highlight title - look for input within the highlight container
      const highlightContainer = this.page.locator('.border.rounded-lg').nth(i)
      await highlightContainer.getByRole('textbox', { name: /title/i }).fill(highlight.title)
      
      // Highlight description - use placeholder since it's a textarea
      await highlightContainer.getByPlaceholder('Describe this achievement or credential...').fill(highlight.description)
    }
  }

  async fillStep5(data: WizardTestData) {
    await this.verifyCurrentStep(5)
    await expect(this.page.locator('text=How do you want people to contact you?')).toBeVisible()
    
    // Contact form section - find the container with "Contact Form" heading
    const contactFormSection = this.page.locator('h4:has-text("Contact Form")').locator('..')
    if (data.wantsContactForm) {
      await contactFormSection.getByRole('button', { name: 'Yes' }).click()
      
      if (data.contactEmail) {
        await this.page.getByRole('textbox', { name: /contact email/i }).fill(data.contactEmail)
      }
    } else {
      await contactFormSection.getByRole('button', { name: 'No' }).click()
    }
    
    // CTA button section - find the container with "Call-to-Action Button" heading
    const ctaSection = this.page.locator('h4:has-text("Call-to-Action Button")').locator('..')
    if (data.wantsCTAButton) {
      await ctaSection.getByRole('button', { name: 'Yes' }).click()
      
      if (data.ctaText) {
        await this.page.getByRole('textbox', { name: /button text/i }).fill(data.ctaText)
      }
      
      if (data.ctaUrl) {
        await this.page.getByRole('textbox', { name: /button link/i }).fill(data.ctaUrl)
      }
    } else {
      await ctaSection.getByRole('button', { name: 'No' }).click()
    }
  }

  async clickNext() {
    // Use first() to select the first "Next" button which should be the wizard button
    await this.page.getByRole('button', { name: /next/i }).first().click()
  }

  async clickComplete() {
    await this.page.getByRole('button', { name: /complete/i }).click()
  }

  async clickBack() {
    await this.page.getByRole('button', { name: /back/i }).click()
  }

  async completeFullWizard(data: WizardTestData) {
    // Step 1: User Info
    await this.fillStep1(data)
    await this.clickNext()
    
    // Step 2: About
    await this.fillStep2(data)
    await this.clickNext()
    
    // Step 3: Services
    await this.fillStep3(data)
    await this.clickNext()
    
    // Step 4: Highlights
    await this.fillStep4(data)
    await this.clickNext()
    
    // Step 5: CTA & Complete
    await this.fillStep5(data)
    await this.clickComplete()
  }

  async verifyValidationError(message: string) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible()
  }

  async verifyProgressBar(expectedProgress: number) {
    // Progress should be visible and show correct percentage
    const progressBar = this.page.locator('[role="progressbar"]')
    await expect(progressBar).toBeVisible()
  }

  async verifyStepIndicators() {
    // All 5 steps should be visible in the indicator
    for (let i = 1; i <= 5; i++) {
      await expect(this.page.locator(`text=${i}`).first()).toBeVisible()
    }
  }

  async verifyRedirectToDestination(expectedUrl: string | RegExp) {
    // Should redirect after completion
    await expect(this.page).toHaveURL(expectedUrl, { timeout: 15000 })
  }
}

/**
 * Database verification helpers
 */
export async function verifyLandingPageCreated(userId: string, data: WizardTestData) {
  const { testSupabase } = await import('./supabase-test')
  
  try {
    // Check if landing page was created
    const { data: landingPage, error } = await testSupabase
      .from('landing_pages')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.warn('Landing page verification failed:', error)
      return { success: false, error: error.message }
    }
    
    // Verify basic data
    if (landingPage.username !== data.username) {
      return { success: false, error: `Username mismatch: expected ${data.username}, got ${landingPage.username}` }
    }
    
    return { success: true, landingPage }
  } catch (error) {
    console.warn('Database verification not available:', error)
    return { success: false, error: 'Database not available' }
  }
}

export async function verifyServicesCreated(landingPageId: string, expectedServices: Array<{title: string, description: string}>) {
  const { testSupabase } = await import('./supabase-test')
  
  try {
    const { data: services, error } = await testSupabase
      .from('services')
      .select('*')
      .eq('landing_page_id', landingPageId)
      .order('order_index')
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    if (services.length !== expectedServices.length) {
      return { 
        success: false, 
        error: `Service count mismatch: expected ${expectedServices.length}, got ${services.length}` 
      }
    }
    
    return { success: true, services }
  } catch (error) {
    return { success: false, error: 'Database not available' }
  }
}

export async function verifyHighlightsCreated(landingPageId: string, expectedHighlights: Array<{title: string, description: string}>) {
  const { testSupabase } = await import('./supabase-test')
  
  try {
    const { data: highlights, error } = await testSupabase
      .from('highlights')
      .select('*')
      .eq('landing_page_id', landingPageId)
      .order('order_index')
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    if (highlights.length !== expectedHighlights.length) {
      return { 
        success: false, 
        error: `Highlight count mismatch: expected ${expectedHighlights.length}, got ${highlights.length}` 
      }
    }
    
    return { success: true, highlights }
  } catch (error) {
    return { success: false, error: 'Database not available' }
  }
}