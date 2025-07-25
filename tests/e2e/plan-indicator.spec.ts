import { test, expect } from '@playwright/test';

test.describe('Plan Indicator Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - adjust based on your auth implementation
    await page.goto('/dashboard');
  });

  test('shows Pro badge for Pro users without CTA', async ({ page }) => {
    // Mock Pro user data
    await page.route('**/rest/v1/pro_status*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test-user',
          is_pro: true,
          pro_expires_at: null,
          override_pro: false,
          stripe_customer_id: 'cus_123',
          notes: null
        }])
      });
    });

    await page.reload();

    // Check desktop sidebar
    const desktopIndicator = page.locator('.lg\\:flex .bg-primary').filter({ hasText: 'Pro' });
    await expect(desktopIndicator).toBeVisible();
    await expect(desktopIndicator).toHaveClass(/bg-primary.*text-primary-foreground/);
    
    // Ensure no upgrade button is present
    await expect(page.locator('button:has-text("Upgrade")')).not.toBeVisible();

    // Check mobile header (if viewport is mobile)
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileMenuButton = page.locator('button:has(svg)').first();
    await mobileMenuButton.click();
    
    const mobileIndicator = page.locator('.lg\\:hidden .bg-primary').filter({ hasText: 'Pro' });
    await expect(mobileIndicator).toBeVisible();
  });

  test('shows trial countdown with upgrade button for trial users', async ({ page }) => {
    // Mock trial user - 3 days remaining
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    
    await page.route('**/rest/v1/pro_status*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test-user',
          is_pro: true,
          pro_expires_at: threeDaysFromNow,
          override_pro: false,
          stripe_customer_id: null,
          notes: null
        }])
      });
    });

    await page.reload();

    // Check trial badge styling and content
    const trialBadge = page.locator('[role="status"]').filter({ hasText: /Trial – \d+ d \d+ h left/ });
    await expect(trialBadge).toBeVisible();
    await expect(trialBadge).toHaveClass(/border-yellow-400.*text-yellow-700/);
    await expect(trialBadge).toContainText('3 d');

    // Check upgrade button
    const upgradeButton = page.locator('button:has-text("Upgrade now")');
    await expect(upgradeButton).toBeVisible();
    
    // Test button functionality
    await upgradeButton.click();
    await expect(page).toHaveURL(/.*pricing.*/);
  });

  test('shows free plan badge with upgrade button for free users', async ({ page }) => {
    // Mock free user
    await page.route('**/rest/v1/pro_status*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test-user',
          is_pro: false,
          pro_expires_at: null,
          override_pro: false,
          stripe_customer_id: null,
          notes: null
        }])
      });
    });

    await page.reload();

    // Check free plan badge
    const freeBadge = page.locator('[role="status"]').filter({ hasText: 'Free plan' });
    await expect(freeBadge).toBeVisible();
    await expect(freeBadge).toHaveClass(/border-muted-foreground.*text-muted-foreground/);

    // Check upgrade button
    const upgradeButton = page.locator('button:has-text("Upgrade to Pro")');
    await expect(upgradeButton).toBeVisible();
    
    // Test button functionality
    await upgradeButton.click();
    await expect(page).toHaveURL(/.*pricing.*/);
  });

  test('shows manual comp as Pro even with expired date', async ({ page }) => {
    // Mock manual comp user with expired date
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    await page.route('**/rest/v1/pro_status*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test-user',
          is_pro: true,
          pro_expires_at: pastDate,
          override_pro: true,
          stripe_customer_id: null,
          notes: 'Manual comp for testing'
        }])
      });
    });

    await page.reload();

    // Should show Pro badge, not trial or free
    const proBadge = page.locator('[role="status"]').filter({ hasText: 'Pro' });
    await expect(proBadge).toBeVisible();
    await expect(proBadge).toHaveClass(/bg-primary.*text-primary-foreground/);
    
    // No upgrade button should be present
    await expect(page.locator('button:has-text("Upgrade")')).not.toBeVisible();
  });

  test('displays correctly in mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mock trial user
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    
    await page.route('**/rest/v1/pro_status*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test-user',
          is_pro: true,
          pro_expires_at: twoDaysFromNow,
          override_pro: false,
          stripe_customer_id: null,
          notes: null
        }])
      });
    });

    await page.reload();

    // Mobile header should show plan indicator
    const mobileHeader = page.locator('.lg\\:hidden .flex.items-center.gap-2').first();
    await expect(mobileHeader).toBeVisible();
    
    const mobilePlanIndicator = mobileHeader.locator('[role="status"]');
    await expect(mobilePlanIndicator).toBeVisible();
    await expect(mobilePlanIndicator).toContainText('2 d');
  });

  test('accessibility attributes are correct', async ({ page }) => {
    // Mock trial user
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    await page.route('**/rest/v1/pro_status*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test-user',
          is_pro: true,
          pro_expires_at: oneDayFromNow,
          override_pro: false,
          stripe_customer_id: null,
          notes: null
        }])
      });
    });

    await page.reload();

    // Check aria-label on trial badge
    const trialBadge = page.locator('[role="status"]').first();
    const ariaLabel = await trialBadge.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/Pro trial with \d+ days and \d+ hours remaining/);

    // Check upgrade button accessibility
    const upgradeButton = page.locator('button:has-text("Upgrade now")');
    const buttonAriaLabel = await upgradeButton.getAttribute('aria-label');
    expect(buttonAriaLabel).toBe('Upgrade now - Go to pricing page');
  });

  test('handles loading state gracefully', async ({ page }) => {
    // Delay the API response to test loading state
    await page.route('**/rest/v1/pro_status*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test-user',
          is_pro: false,
          pro_expires_at: null,
          override_pro: false,
          stripe_customer_id: null,
          notes: null
        }])
      });
    });

    await page.goto('/dashboard');

    // Initially should show free plan as default
    const initialBadge = page.locator('[role="status"]').first();
    await expect(initialBadge).toBeVisible();
  });
});