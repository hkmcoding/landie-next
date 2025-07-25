import { test, expect, Page } from '@playwright/test';

test.describe('Mobile Scroll - iOS Safari Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Set iPhone 14 Pro viewport to simulate the problematic device
    await page.setViewportSize({ width: 393, height: 852 });
    
    // Set user agent to iOS Safari
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    });
  });

  test('page scrolls to sentinel on iPhone 14', async ({ page, browserName }) => {
    // Skip non-webkit browsers since we're specifically testing iOS Safari behavior
    test.skip(browserName !== 'webkit', 'This test is specifically for iOS Safari (webkit)');
    
    // Test with a public landing page (adjust URL based on your actual routes)
    await page.goto('/jane-coach', { waitUntil: 'networkidle' });
    
    // Wait for the scroll sentinel to be attached to DOM
    await page.waitForSelector('#scroll-sentinel', { state: 'attached', timeout: 10000 });
    
    // Get the initial viewport and document heights for debugging
    const heights = await page.evaluate(() => ({
      windowHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
      visualViewportHeight: window.visualViewport?.height || window.innerHeight
    }));
    
    console.log('Viewport info:', heights);
    
    // Scroll to the bottom of the page
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Wait a moment for the scroll to complete
    await page.waitForTimeout(500);
    
    // Check if the scroll sentinel is visible in the viewport
    const isVisible = await page.isVisible('#scroll-sentinel');
    
    // Get current scroll position for debugging
    const scrollInfo = await page.evaluate(() => ({
      scrollTop: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      maxScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight
    }));
    
    console.log('Scroll info:', scrollInfo);
    
    // The sentinel should be visible after scrolling to bottom
    expect(isVisible).toBe(true);
    
    // Additional check: ensure we can scroll to the very bottom
    const sentinelRect = await page.locator('#scroll-sentinel').boundingBox();
    expect(sentinelRect).not.toBeNull();
    
    if (sentinelRect) {
      // The sentinel should be within the viewport or very close to it
      expect(sentinelRect.y).toBeLessThan(heights.windowHeight + 100); // Allow some tolerance
    }
  });

  test('dashboard scrolls properly on mobile', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is specifically for iOS Safari (webkit)');
    
    // Navigate to dashboard (you may need to authenticate first)
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard-content"]', { 
      state: 'attached', 
      timeout: 10000 
    }).catch(() => {
      // Fallback if no test id exists
      return page.waitForSelector('.h-safe', { state: 'attached', timeout: 10000 });
    });
    
    // Check that the page uses safe viewport heights
    const hasSafeHeight = await page.locator('.h-safe, .min-h-safe').count();
    expect(hasSafeHeight).toBeGreaterThan(0);
    
    // Ensure scroll sentinel is reachable
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    const isScrollSentinelVisible = await page.isVisible('#scroll-sentinel');
    expect(isScrollSentinelVisible).toBe(true);
  });

  test('onboarding wizard scrolls properly on mobile', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is specifically for iOS Safari (webkit)');
    
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    
    // Wait for onboarding content
    await page.waitForSelector('.min-h-safe', { state: 'attached', timeout: 10000 });
    
    // Test scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    const isScrollSentinelVisible = await page.isVisible('#scroll-sentinel');
    expect(isScrollSentinelVisible).toBe(true);
  });

  test('fixed elements do not interfere with scrolling', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is specifically for iOS Safari (webkit)');
    
    // Test with a page that has sticky CTA
    await page.goto('/jane-coach', { waitUntil: 'networkidle' });
    
    // Check if sticky CTA exists
    const stickyCTA = page.locator('.fixed.bottom-0');
    if (await stickyCTA.count() > 0) {
      expect(await stickyCTA.isVisible()).toBe(true);
      
      // Ensure the CTA doesn't prevent scrolling to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      
      const isScrollSentinelVisible = await page.isVisible('#scroll-sentinel');
      expect(isScrollSentinelVisible).toBe(true);
      
      // Ensure CTA is still visible and functional
      expect(await stickyCTA.isVisible()).toBe(true);
    }
  });

  test('viewport height calculations are correct', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is specifically for iOS Safari (webkit)');
    
    await page.goto('/jane-coach', { waitUntil: 'networkidle' });
    
    // Test that CSS custom properties are set correctly
    const cssProperties = await page.evaluate(() => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      return {
        safeVh: computedStyle.getPropertyValue('--safe-vh'),
        safeDvh: computedStyle.getPropertyValue('--safe-dvh'),
        safeSvh: computedStyle.getPropertyValue('--safe-svh'),
        safeLvh: computedStyle.getPropertyValue('--safe-lvh')
      };
    });
    
    console.log('CSS Properties:', cssProperties);
    
    // At least --safe-vh should be set
    expect(cssProperties.safeVh).toBeTruthy();
    expect(cssProperties.safeVh).toMatch(/\d+(vh|dvh|svh)/);
  });
});