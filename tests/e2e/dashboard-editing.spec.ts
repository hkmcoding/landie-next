import { test, expect } from '@playwright/test'
import { 
  createTestUser, 
  signInTestUser,
  cleanupTestData,
  waitForSupabase 
} from '../utils/supabase-test'

test.describe('Dashboard Editing', () => {
  let testUserId: string

  test.beforeAll(async () => {
    // Wait for Supabase to be ready (optional)
    const isReady = await waitForSupabase()
    if (!isReady) {
      console.warn('Supabase local not available - tests will use dev dashboard')
    }
  })

  test.afterEach(async () => {
    if (testUserId) {
      await cleanupTestData(testUserId)
      testUserId = ''
    }
  })

  test.describe('Profile Section Editing', () => {
    test('should edit profile information (name, headline, bio)', async ({ page }) => {
      // Use dev dashboard route to bypass authentication
      await page.goto('/dev/dashboard')
      
      // Wait for dashboard to load
      await expect(page.locator('text=Dashboard')).toBeVisible()
      
      // Navigate to profile section
      const profileSection = page.locator('[data-section="profile"]')
      await expect(profileSection).toBeVisible()
      
      // Click edit button for profile
      await profileSection.getByRole('button', { name: /edit/i }).click()
      
      // Verify profile edit form opens
      await expect(page.locator('text=Edit Profile')).toBeVisible()
      
      // Edit profile fields
      await page.getByRole('textbox', { name: /name/i }).fill('John Updated Doe')
      await page.getByRole('textbox', { name: /headline/i }).fill('Updated Senior Developer')
      await page.getByRole('textbox', { name: /bio/i }).fill('Updated bio with new information about my experience.')
      
      // Save changes
      await page.getByRole('button', { name: /save/i }).click()
      
      // Verify changes are saved and displayed
      await expect(page.locator('text=John Updated Doe')).toBeVisible()
      await expect(page.locator('text=Updated Senior Developer')).toBeVisible()
      await expect(page.locator('text=Updated bio with new information')).toBeVisible()
    })

    test('should validate profile form fields', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const profileSection = page.locator('[data-section="profile"]')
      await profileSection.getByRole('button', { name: /edit/i }).click()
      
      // Clear required fields
      await page.getByRole('textbox', { name: /name/i }).clear()
      await page.getByRole('textbox', { name: /bio/i }).clear()
      
      // Try to save with empty required fields
      await page.getByRole('button', { name: /save/i }).click()
      
      // Should show validation errors
      await expect(page.locator('text=Name is required')).toBeVisible()
      await expect(page.locator('text=Bio is required')).toBeVisible()
    })
  })

  test.describe('Services Section CRUD', () => {
    test('should add a new service', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const servicesSection = page.locator('[data-section="services"]')
      await expect(servicesSection).toBeVisible()
      
      // Click add service button
      await servicesSection.getByRole('button', { name: /add service/i }).click()
      
      // Fill service form
      await page.getByRole('textbox', { name: /title/i }).fill('New Web Development Service')
      await page.getByRole('textbox', { name: /description/i }).fill('Complete website development from design to deployment')
      await page.getByRole('textbox', { name: /price/i }).fill('$2,999')
      await page.getByRole('textbox', { name: /button text/i }).fill('Get Started')
      await page.getByRole('textbox', { name: /button url/i }).fill('https://example.com/contact')
      
      // Save service
      await page.getByRole('button', { name: /create service/i }).click()
      
      // Verify service appears in the list
      await expect(page.locator('text=New Web Development Service')).toBeVisible()
      await expect(page.locator('text=Complete website development')).toBeVisible()
      await expect(page.locator('text=$2,999')).toBeVisible()
    })

    test('should edit an existing service', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const servicesSection = page.locator('[data-section="services"]')
      
      // Find first service and click edit
      const firstService = servicesSection.locator('.service-item').first()
      await firstService.getByRole('button', { name: /edit/i }).click()
      
      // Update service information
      await page.getByRole('textbox', { name: /title/i }).fill('Updated Service Title')
      await page.getByRole('textbox', { name: /price/i }).fill('$3,999')
      
      // Save changes
      await page.getByRole('button', { name: /save/i }).click()
      
      // Verify updates are reflected
      await expect(page.locator('text=Updated Service Title')).toBeVisible()
      await expect(page.locator('text=$3,999')).toBeVisible()
    })

    test('should delete a service', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const servicesSection = page.locator('[data-section="services"]')
      
      // Count initial services
      const initialServices = await servicesSection.locator('.service-item').count()
      
      // Delete first service
      const firstService = servicesSection.locator('.service-item').first()
      const serviceTitle = await firstService.locator('h3').textContent()
      
      await firstService.getByRole('button', { name: /delete/i }).click()
      
      // Confirm deletion
      await page.getByRole('button', { name: /confirm/i }).click()
      
      // Verify service is removed
      if (serviceTitle) {
        await expect(page.locator(`text=${serviceTitle}`)).not.toBeVisible()
      }
      
      // Verify service count decreased
      const finalServices = await servicesSection.locator('.service-item').count()
      expect(finalServices).toBe(initialServices - 1)
    })

    test('should reorder services via drag and drop', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const servicesSection = page.locator('[data-section="services"]')
      
      // Get initial order
      const services = servicesSection.locator('.service-item')
      const firstServiceTitle = await services.first().locator('h3').textContent()
      const secondServiceTitle = await services.nth(1).locator('h3').textContent()
      
      // Drag first service to second position
      await services.first().hover()
      await page.mouse.down()
      await services.nth(1).hover()
      await page.mouse.up()
      
      // Verify order changed
      const newFirstTitle = await services.first().locator('h3').textContent()
      expect(newFirstTitle).toBe(secondServiceTitle)
    })
  })

  test.describe('Highlights Section CRUD', () => {
    test('should add a new highlight', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const highlightsSection = page.locator('[data-section="highlights"]')
      await expect(highlightsSection).toBeVisible()
      
      await highlightsSection.getByRole('button', { name: /add highlight/i }).click()
      
      // Fill highlight form
      await page.getByRole('textbox', { name: /title/i }).fill('10+ Years Experience')
      await page.getByRole('textbox', { name: /description/i }).fill('Over a decade of software development expertise')
      
      await page.getByRole('button', { name: /create highlight/i }).click()
      
      // Verify highlight appears
      await expect(page.locator('text=10+ Years Experience')).toBeVisible()
      await expect(page.locator('text=Over a decade of software')).toBeVisible()
    })

    test('should edit an existing highlight', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const highlightsSection = page.locator('[data-section="highlights"]')
      const firstHighlight = highlightsSection.locator('.highlight-item').first()
      
      await firstHighlight.getByRole('button', { name: /edit/i }).click()
      
      await page.getByRole('textbox', { name: /title/i }).fill('Updated Highlight Title')
      await page.getByRole('button', { name: /save/i }).click()
      
      await expect(page.locator('text=Updated Highlight Title')).toBeVisible()
    })

    test('should delete a highlight', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const highlightsSection = page.locator('[data-section="highlights"]')
      const firstHighlight = highlightsSection.locator('.highlight-item').first()
      const highlightTitle = await firstHighlight.locator('h3').textContent()
      
      await firstHighlight.getByRole('button', { name: /delete/i }).click()
      await page.getByRole('button', { name: /confirm/i }).click()
      
      if (highlightTitle) {
        await expect(page.locator(`text=${highlightTitle}`)).not.toBeVisible()
      }
    })

    test('should reorder highlights', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const highlightsSection = page.locator('[data-section="highlights"]')
      const highlights = highlightsSection.locator('.highlight-item')
      
      // Verify we have at least 2 highlights for reordering
      const highlightCount = await highlights.count()
      if (highlightCount >= 2) {
        const firstTitle = await highlights.first().locator('h3').textContent()
        const secondTitle = await highlights.nth(1).locator('h3').textContent()
        
        // Drag and drop
        await highlights.first().hover()
        await page.mouse.down()
        await highlights.nth(1).hover()
        await page.mouse.up()
        
        // Verify order changed
        const newFirstTitle = await highlights.first().locator('h3').textContent()
        expect(newFirstTitle).toBe(secondTitle)
      }
    })
  })

  test.describe('Testimonials Section CRUD', () => {
    test('should add a new testimonial', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const testimonialsSection = page.locator('[data-section="testimonials"]')
      await expect(testimonialsSection).toBeVisible()
      
      await testimonialsSection.getByRole('button', { name: /add testimonial/i }).click()
      
      // Fill testimonial form
      await page.getByRole('textbox', { name: /client name/i }).fill('Jane Smith')
      await page.getByRole('textbox', { name: /company/i }).fill('Tech Solutions Inc')
      await page.getByRole('textbox', { name: /content/i }).fill('Outstanding work! Highly recommended for any development project.')
      await page.getByRole('textbox', { name: /rating/i }).fill('5')
      
      await page.getByRole('button', { name: /create testimonial/i }).click()
      
      // Verify testimonial appears
      await expect(page.locator('text=Jane Smith')).toBeVisible()
      await expect(page.locator('text=Tech Solutions Inc')).toBeVisible()
      await expect(page.locator('text=Outstanding work! Highly recommended')).toBeVisible()
    })

    test('should edit an existing testimonial', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const testimonialsSection = page.locator('[data-section="testimonials"]')
      const firstTestimonial = testimonialsSection.locator('.testimonial-item').first()
      
      await firstTestimonial.getByRole('button', { name: /edit/i }).click()
      
      await page.getByRole('textbox', { name: /client name/i }).fill('Updated Client Name')
      await page.getByRole('button', { name: /save/i }).click()
      
      await expect(page.locator('text=Updated Client Name')).toBeVisible()
    })

    test('should delete a testimonial', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const testimonialsSection = page.locator('[data-section="testimonials"]')
      const firstTestimonial = testimonialsSection.locator('.testimonial-item').first()
      const clientName = await firstTestimonial.locator('.client-name').textContent()
      
      await firstTestimonial.getByRole('button', { name: /delete/i }).click()
      await page.getByRole('button', { name: /confirm/i }).click()
      
      if (clientName) {
        await expect(page.locator(`text=${clientName}`)).not.toBeVisible()
      }
    })
  })

  test.describe('Social Links Management', () => {
    test('should add a new social link', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const socialSection = page.locator('[data-section="social"]')
      await expect(socialSection).toBeVisible()
      
      await socialSection.getByRole('button', { name: /add social link/i }).click()
      
      // Select platform and enter URL
      await page.getByRole('combobox', { name: /platform/i }).selectOption('linkedin')
      await page.getByRole('textbox', { name: /url/i }).fill('https://linkedin.com/in/johndoe')
      
      await page.getByRole('button', { name: /add link/i }).click()
      
      // Verify social link appears
      await expect(page.locator('text=linkedin.com/in/johndoe')).toBeVisible()
    })

    test('should edit an existing social link', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const socialSection = page.locator('[data-section="social"]')
      const firstLink = socialSection.locator('.social-link').first()
      
      await firstLink.getByRole('button', { name: /edit/i }).click()
      
      await page.getByRole('textbox', { name: /url/i }).fill('https://linkedin.com/in/johnupdated')
      await page.getByRole('button', { name: /save/i }).click()
      
      await expect(page.locator('text=linkedin.com/in/johnupdated')).toBeVisible()
    })

    test('should delete a social link', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const socialSection = page.locator('[data-section="social"]')
      const firstLink = socialSection.locator('.social-link').first()
      const linkUrl = await firstLink.locator('.url').textContent()
      
      await firstLink.getByRole('button', { name: /delete/i }).click()
      await page.getByRole('button', { name: /confirm/i }).click()
      
      if (linkUrl) {
        await expect(page.locator(`text=${linkUrl}`)).not.toBeVisible()
      }
    })

    test('should validate social URLs', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const socialSection = page.locator('[data-section="social"]')
      await socialSection.getByRole('button', { name: /add social link/i }).click()
      
      // Enter invalid URL
      await page.getByRole('textbox', { name: /url/i }).fill('invalid-url')
      await page.getByRole('button', { name: /add link/i }).click()
      
      // Should show validation error
      await expect(page.locator('text=Please enter a valid URL')).toBeVisible()
    })
  })

  test.describe('Cross-Section Interactions', () => {
    test('should update live preview when editing content', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      // Edit profile
      const profileSection = page.locator('[data-section="profile"]')
      await profileSection.getByRole('button', { name: /edit/i }).click()
      
      await page.getByRole('textbox', { name: /name/i }).fill('Preview Test User')
      await page.getByRole('button', { name: /save/i }).click()
      
      // Check if live preview updates (if available)
      const previewSection = page.locator('[data-section="preview"]')
      if (await previewSection.isVisible()) {
        await expect(previewSection.locator('text=Preview Test User')).toBeVisible()
      }
    })

    test('should maintain data consistency across sections', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      // Add a service
      const servicesSection = page.locator('[data-section="services"]')
      await servicesSection.getByRole('button', { name: /add service/i }).click()
      await page.getByRole('textbox', { name: /title/i }).fill('Consistency Test Service')
      await page.getByRole('button', { name: /create service/i }).click()
      
      // Navigate to analytics or another section
      const analyticsSection = page.locator('[data-section="analytics"]')
      if (await analyticsSection.isVisible()) {
        await analyticsSection.click()
        
        // Navigate back to services
        await servicesSection.click()
        
        // Verify service is still there
        await expect(page.locator('text=Consistency Test Service')).toBeVisible()
      }
    })
  })

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true)
      
      await page.goto('/dev/dashboard')
      
      const servicesSection = page.locator('[data-section="services"]')
      await servicesSection.getByRole('button', { name: /add service/i }).click()
      
      await page.getByRole('textbox', { name: /title/i }).fill('Offline Test Service')
      await page.getByRole('button', { name: /create service/i }).click()
      
      // Should show error message for network failure
      await expect(page.locator('text=Network error')).toBeVisible()
      
      // Re-enable network
      await page.context().setOffline(false)
    })

    test('should handle very long content gracefully', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const profileSection = page.locator('[data-section="profile"]')
      await profileSection.getByRole('button', { name: /edit/i }).click()
      
      // Enter very long bio
      const longBio = 'This is a very long bio '.repeat(100)
      await page.getByRole('textbox', { name: /bio/i }).fill(longBio)
      
      await page.getByRole('button', { name: /save/i }).click()
      
      // Should either accept it or show length validation
      const hasLengthError = await page.locator('text=Bio is too long').isVisible()
      const hasSuccess = await page.locator('text=Profile updated').isVisible()
      
      expect(hasLengthError || hasSuccess).toBe(true)
    })

    test('should prevent duplicate social platform entries', async ({ page }) => {
      await page.goto('/dev/dashboard')
      
      const socialSection = page.locator('[data-section="social"]')
      
      // Add first LinkedIn link
      await socialSection.getByRole('button', { name: /add social link/i }).click()
      await page.getByRole('combobox', { name: /platform/i }).selectOption('linkedin')
      await page.getByRole('textbox', { name: /url/i }).fill('https://linkedin.com/in/test1')
      await page.getByRole('button', { name: /add link/i }).click()
      
      // Try to add another LinkedIn link
      await socialSection.getByRole('button', { name: /add social link/i }).click()
      await page.getByRole('combobox', { name: /platform/i }).selectOption('linkedin')
      await page.getByRole('textbox', { name: /url/i }).fill('https://linkedin.com/in/test2')
      await page.getByRole('button', { name: /add link/i }).click()
      
      // Should show error about duplicate platform
      await expect(page.locator('text=LinkedIn link already exists')).toBeVisible()
    })
  })
})