import { test, expect } from '@playwright/test'

test.describe('Dashboard Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Use dev dashboard route to bypass authentication
    await page.goto('/dev/dashboard')
    
    // Wait for dashboard to load by checking for the profile section
    await expect(page.locator('text=Profile Setup')).toBeVisible()
  })

  test('should navigate between dashboard tabs successfully', async ({ page }) => {
    // Profile tab should be active by default
    const profileButton = page.locator('nav').getByRole('button', { name: 'Profile' })
    await expect(profileButton).toHaveClass(/bg-primary/)
    
    // Test switching to About/Bio tab (which has less dependencies)
    await page.locator('nav').getByRole('button', { name: 'About/Bio' }).click()
    await page.waitForTimeout(1500)
    
    // Verify About/Bio tab becomes active
    const aboutButton = page.locator('nav').getByRole('button', { name: 'About/Bio' })
    await expect(aboutButton).toHaveClass(/bg-primary/)
    
    // Verify Profile tab is no longer active
    await expect(profileButton).not.toHaveClass(/bg-primary/)
    
    // Test switching to Social Links tab
    await page.locator('nav').getByRole('button', { name: 'Social Links' }).click()
    await page.waitForTimeout(1500)
    
    // Verify Social Links tab becomes active
    const socialButton = page.locator('nav').getByRole('button', { name: 'Social Links' })
    await expect(socialButton).toHaveClass(/bg-primary/)
    
    // Verify About/Bio tab is no longer active
    await expect(aboutButton).not.toHaveClass(/bg-primary/)
  })
})