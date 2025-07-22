import { test, expect } from '@playwright/test'

test.describe('Production Dashboard Chunk Fix', () => {
  test('should navigate between dashboard tabs without chunk errors', async ({ page }) => {
    // Monitor console errors, specifically chunk loading errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Navigate to the actual dashboard route (not dev)
    await page.goto('http://localhost:3000/dashboard')
    
    // Wait for dashboard to load - this should now work without chunk errors
    await expect(page.locator('text=Profile Setup')).toBeVisible({ timeout: 10000 })
    
    // Test navigation to different sections that were causing chunk errors
    const tabs = ['Analytics', 'About/Bio', 'Services', 'Highlights', 'Social Links', 'Testimonials']
    
    for (const tab of tabs) {
      console.log(`Testing navigation to: ${tab}`)
      
      // Click on the tab
      await page.locator('nav').getByRole('button', { name: tab }).click()
      
      // Wait for content to load
      await page.waitForTimeout(2000)
      
      // Verify the tab is active
      const activeButton = page.locator('nav').getByRole('button', { name: tab })
      await expect(activeButton).toHaveClass(/bg-primary/)
      
      // Verify section content loads
      await expect(page.getByRole('heading', { name: tab })).toBeVisible()
    }
    
    // Check for any chunk loading errors
    const chunkErrors = consoleErrors.filter(error => 
      error.includes('Failed to load chunk') || 
      error.includes('404') ||
      error.includes('net::ERR_ABORTED') ||
      error.includes('AboutSection') ||
      error.includes('ServicesSection') ||
      error.includes('AnalyticsSection')
    )
    
    console.log('All console errors:', consoleErrors)
    console.log('Chunk-related errors:', chunkErrors)
    
    // Assert no chunk errors occurred
    expect(chunkErrors).toHaveLength(0)
  })
})