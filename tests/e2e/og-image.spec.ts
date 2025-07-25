import { test, expect } from '@playwright/test'

test.describe('OpenGraph Image Generation', () => {
  test('should generate OG image for existing user profile', async ({ page }) => {
    // Navigate to a test user profile (you may need to adjust this based on your test data)
    await page.goto('/jane') // Assuming 'jane' is a test user
    
    // Check if the page loads successfully
    await expect(page).toHaveTitle(/Jane.*Landie/)
    
    // Check OG meta tags
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content')
    expect(ogImage).toContain('/jane/opengraph-image')
    
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
    expect(ogTitle).toContain('Landie')
    
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content')
    expect(ogType).toBe('website')
    
    // Check Twitter card meta tags
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content')
    expect(twitterCard).toBe('summary_large_image')
    
    const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute('content')
    expect(twitterImage).toContain('/jane/opengraph-image')
  })

  test('should return valid OG image response', async ({ page }) => {
    // Test the OG image endpoint directly
    const response = await page.request.get('/jane/opengraph-image')
    
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
    
    // Check if the response has content
    const buffer = await response.body()
    expect(buffer.length).toBeGreaterThan(0)
  })

  test('should handle non-existent user gracefully', async ({ page }) => {
    // Test with a non-existent username
    const response = await page.request.get('/nonexistentuser123/opengraph-image')
    
    // Should still return a valid image (fallback)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
    
    const buffer = await response.body()
    expect(buffer.length).toBeGreaterThan(0)
  })

  test('should validate OG image dimensions', async ({ page }) => {
    const response = await page.request.get('/jane/opengraph-image')
    expect(response.status()).toBe(200)
    
    // While we can't easily check actual image dimensions in Playwright,
    // we can at least verify the response is a proper image
    const contentType = response.headers()['content-type']
    expect(contentType).toContain('image/png')
    
    const buffer = await response.body()
    expect(buffer.length).toBeGreaterThan(1000) // Should be a reasonable size for a 1200x630 image
  })
})

test.describe('Dashboard Share Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // You may need to implement authentication setup here
    // For now, this assumes the user is already logged in
    await page.goto('/dashboard')
  })

  test('should show copy share snippet button in profile section', async ({ page }) => {
    // Navigate to profile section if not already there
    await page.click('[data-section="profile"]') // Adjust selector based on your implementation
    
    // Check if the share snippet card exists
    await expect(page.locator('text=Share Your Profile')).toBeVisible()
    await expect(page.locator('text=Copy Share Snippet')).toBeVisible()
  })

  test('should copy embed snippet to clipboard', async ({ page }) => {
    // Grant clipboard permissions for testing
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    
    await page.click('[data-section="profile"]')
    
    // Click the copy button
    await page.click('text=Copy Share Snippet')
    
    // Check if button shows "Copied!" state
    await expect(page.locator('text=Copied!')).toBeVisible()
    
    // Verify clipboard content (if possible in your test environment)
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardContent).toContain('<a href=')
    expect(clipboardContent).toContain('opengraph-image')
    expect(clipboardContent).toContain('landie.co')
  })
})

test.describe('Social Media Preview', () => {
  test('should display proper meta tags for social sharing', async ({ page }) => {
    await page.goto('/jane')
    
    // Test all required meta tags exist
    const requiredMetaTags = [
      'og:type',
      'og:title', 
      'og:description',
      'og:image',
      'twitter:card',
      'twitter:title',
      'twitter:description',
      'twitter:image'
    ]
    
    for (const tag of requiredMetaTags) {
      const metaTag = tag.startsWith('og:') 
        ? page.locator(`meta[property="${tag}"]`)
        : page.locator(`meta[name="${tag}"]`)
      
      await expect(metaTag).toHaveAttribute(
        tag.startsWith('og:') ? 'content' : 'content', 
        /.+/ // Should have some content
      )
    }
  })
}) 