import { test, expect } from '@playwright/test'

test.describe('Dashboard Tab Navigation - Chunk Fix Verification', () => {
  test('should navigate between tabs without chunk errors', async ({ page }) => {
    // Monitor console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Navigate to dev dashboard
    await page.goto('http://localhost:3000/dev/dashboard')
    
    // Wait for dashboard to load
    await expect(page.locator('text=Profile Setup')).toBeVisible()
    
    // Test navigation to different sections
    const tabs = ['Analytics', 'About/Bio', 'Services', 'Highlights', 'Social Links']
    
    for (const tab of tabs) {
      console.log(`Testing navigation to: ${tab}`)
      
      // Click on the tab
      await page.locator('nav').getByRole('button', { name: tab }).click()
      
      // Wait for content to load
      await page.waitForTimeout(2000)
      
      // Verify the tab is active
      const activeButton = page.locator('nav').getByRole('button', { name: tab })
      await expect(activeButton).toHaveClass(/bg-primary/)
      
      // Check for any chunk loading errors in the console
      const chunkErrors = consoleErrors.filter(error => 
        error.includes('Failed to load chunk') || 
        error.includes('404') ||
        error.includes('net::ERR_ABORTED')
      )
      
      if (chunkErrors.length > 0) {
        console.log(`Chunk errors found for ${tab}:`, chunkErrors)
      }
    }
    
    // Final assertion: no chunk errors should have occurred
    const chunkErrors = consoleErrors.filter(error => 
      error.includes('Failed to load chunk') || 
      error.includes('404') ||
      error.includes('net::ERR_ABORTED')
    )
    
    console.log('All console errors:', consoleErrors)
    console.log('Chunk-related errors:', chunkErrors)
    
    expect(chunkErrors).toHaveLength(0)
  })
})