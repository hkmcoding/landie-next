import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test database connection
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

describe('Enhanced Pro Status System', () => {
  const testUserId = '11111111-1111-4111-8111-111111111111';
  const testUserId2 = '22222222-2222-4222-8222-222222222222';
  const testEmail = 'test@example.com';
  const testEmail2 = 'test2@example.com';
  const stripeCustomerId = 'cus_test123456789';

  beforeEach(async () => {
    // Clean up any existing test data
    await db.from('pro_status').delete().in('id', [testUserId, testUserId2]);
    await db.auth.admin.deleteUser(testUserId);
    await db.auth.admin.deleteUser(testUserId2);
  });

  afterEach(async () => {
    // Clean up test data
    await db.from('pro_status').delete().in('id', [testUserId, testUserId2]);
    await db.auth.admin.deleteUser(testUserId);
    await db.auth.admin.deleteUser(testUserId2);
  });

  describe('Trial Flow', () => {
    it('grants 7-day Pro trial on user signup (idempotent)', async () => {
      // Create user (should trigger grant_initial_pro)
      const { data: user, error: userError } = await db.auth.admin.createUser({
        user_id: testUserId,
        email: testEmail,
        email_confirm: true
      });

      expect(userError).toBeNull();
      expect(user.user?.id).toBe(testUserId);

      // Check that pro status was created with trial
      const { data: proStatus, error: statusError } = await db
        .from('pro_status')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(statusError).toBeNull();
      expect(proStatus.is_pro).toBe(true);
      expect(proStatus.override_pro).toBe(false);
      expect(proStatus.stripe_customer_id).toBeNull();
      expect(proStatus.pro_expires_at).toBeTruthy();

      // Verify expiration is approximately 7 days from now
      const expirationDate = new Date(proStatus.pro_expires_at);
      const now = new Date();
      const diffMs = expirationDate.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeCloseTo(7, 0); // Within 1 day of 7 days

      // Test idempotency - try to grant trial again
      const { error: triggerError } = await db.rpc('grant_initial_pro');
      expect(triggerError).toBeNull();

      // Should still have same record (not duplicated)
      const { data: statusAfter, count } = await db
        .from('pro_status')
        .select('*', { count: 'exact' })
        .eq('id', testUserId);

      expect(count).toBe(1);
      expect(statusAfter?.[0]?.pro_expires_at).toBe(proStatus.pro_expires_at);
    });

    it('expires orphaned Pro trials after expiration date', async () => {
      // Create user with trial
      await db.auth.admin.createUser({
        user_id: testUserId,
        email: testEmail,
        email_confirm: true
      });

      // Verify trial was granted
      let { data: initialStatus } = await db
        .from('pro_status')
        .select('is_pro, override_pro')
        .eq('id', testUserId)
        .single();

      expect(initialStatus?.is_pro).toBe(true);
      expect(initialStatus?.override_pro).toBe(false);

      // Fast-forward by setting expiration to past
      await db
        .from('pro_status')
        .update({ pro_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })
        .eq('id', testUserId);

      // Run expiration procedure
      const { error: procError } = await db.rpc('expire_orphan_pro');
      expect(procError).toBeNull();

      // Verify trial was expired
      const { data: expiredStatus } = await db
        .from('pro_status')
        .select('is_pro')
        .eq('id', testUserId)
        .single();

      expect(expiredStatus?.is_pro).toBe(false);
    });

    it('does not expire manual comps (override_pro = true)', async () => {
      // Create user
      await db.auth.admin.createUser({
        user_id: testUserId,
        email: testEmail,
        email_confirm: true
      });

      // Set manual comp with expired date
      await db
        .from('pro_status')
        .update({ 
          is_pro: true, 
          override_pro: true,
          pro_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Manual comp for testing'
        })
        .eq('id', testUserId);

      // Run expiration procedure
      await db.rpc('expire_orphan_pro');

      // Verify manual comp is NOT expired
      const { data: compStatus } = await db
        .from('pro_status')
        .select('is_pro, override_pro, notes')
        .eq('id', testUserId)
        .single();

      expect(compStatus?.is_pro).toBe(true);
      expect(compStatus?.override_pro).toBe(true);
      expect(compStatus?.notes).toBe('Manual comp for testing');
    });
  });

  describe('Stripe Integration', () => {
    beforeEach(async () => {
      // Create a user for Stripe tests
      await db.auth.admin.createUser({
        user_id: testUserId,
        email: testEmail,
        email_confirm: true
      });
    });

    it('activates Pro status on active Stripe subscription', async () => {
      const currentPeriodEnd = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now

      // Simulate Stripe webhook for active subscription
      const { error } = await db.rpc('update_stripe_subscription', {
        p_user_id: testUserId,
        p_stripe_customer_id: stripeCustomerId,
        p_is_active: true,
        p_current_period_end: currentPeriodEnd
      });

      expect(error).toBeNull();

      // Verify Pro status was activated
      const { data: proStatus } = await db
        .from('pro_status')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(proStatus?.is_pro).toBe(true);
      expect(proStatus?.stripe_customer_id).toBe(stripeCustomerId);
      expect(proStatus?.override_pro).toBe(false);
      
      const expectedExpiry = new Date(currentPeriodEnd * 1000);
      const actualExpiry = new Date(proStatus!.pro_expires_at);
      expect(actualExpiry.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3); // Within seconds
    });

    it('deactivates Pro status on canceled Stripe subscription', async () => {
      // First activate subscription
      await db.rpc('update_stripe_subscription', {
        p_user_id: testUserId,
        p_stripe_customer_id: stripeCustomerId,
        p_is_active: true,
        p_current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
      });

      // Then cancel it
      const { error } = await db.rpc('update_stripe_subscription', {
        p_user_id: testUserId,
        p_stripe_customer_id: stripeCustomerId,
        p_is_active: false,
        p_current_period_end: null
      });

      expect(error).toBeNull();

      // Verify Pro status was deactivated
      const { data: proStatus } = await db
        .from('pro_status')
        .select('is_pro, stripe_customer_id')
        .eq('id', testUserId)
        .single();

      expect(proStatus?.is_pro).toBe(false);
      expect(proStatus?.stripe_customer_id).toBe(stripeCustomerId);
    });

    it('does not update manual comps via Stripe webhook', async () => {
      // Set manual comp
      await db
        .from('pro_status')
        .update({ 
          is_pro: true, 
          override_pro: true,
          notes: 'Manual comp - do not touch'
        })
        .eq('id', testUserId);

      // Try to update via Stripe webhook
      const { error } = await db.rpc('update_stripe_subscription', {
        p_user_id: testUserId,
        p_stripe_customer_id: stripeCustomerId,
        p_is_active: false,
        p_current_period_end: null
      });

      expect(error).toBeNull();

      // Verify manual comp was NOT changed
      const { data: proStatus } = await db
        .from('pro_status')
        .select('is_pro, override_pro, notes, stripe_customer_id')
        .eq('id', testUserId)
        .single();

      expect(proStatus?.is_pro).toBe(true);
      expect(proStatus?.override_pro).toBe(true);
      expect(proStatus?.notes).toBe('Manual comp - do not touch');
      expect(proStatus?.stripe_customer_id).toBeNull(); // Should not update
    });

    it('handles trialing status as active', async () => {
      const currentPeriodEnd = Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60); // 14 days

      // Simulate Stripe webhook for trialing subscription
      const { error } = await db.rpc('update_stripe_subscription', {
        p_user_id: testUserId,
        p_stripe_customer_id: stripeCustomerId,
        p_is_active: true, // trialing maps to active
        p_current_period_end: currentPeriodEnd
      });

      expect(error).toBeNull();

      // Verify Pro status was activated
      const { data: proStatus } = await db
        .from('pro_status')
        .select('is_pro, stripe_customer_id')
        .eq('id', testUserId)
        .single();

      expect(proStatus?.is_pro).toBe(true);
      expect(proStatus?.stripe_customer_id).toBe(stripeCustomerId);
    });
  });

  describe('Effective Pro Status Logic', () => {
    beforeEach(async () => {
      await db.auth.admin.createUser({
        user_id: testUserId,
        email: testEmail,
        email_confirm: true
      });
    });

    it('returns true for manual comp even if expired', async () => {
      // Set manual comp with expired date
      await db
        .from('pro_status')
        .update({ 
          is_pro: true, 
          override_pro: true,
          pro_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', testUserId);

      const { data: effectiveStatus } = await db.rpc('get_effective_pro_status', {
        p_user_id: testUserId
      });

      expect(effectiveStatus).toBe(true);
    });

    it('returns true for permanent Pro (no expiry)', async () => {
      await db
        .from('pro_status')
        .update({ 
          is_pro: true, 
          pro_expires_at: null
        })
        .eq('id', testUserId);

      const { data: effectiveStatus } = await db.rpc('get_effective_pro_status', {
        p_user_id: testUserId
      });

      expect(effectiveStatus).toBe(true);
    });

    it('returns false for expired trial (not override)', async () => {
      await db
        .from('pro_status')
        .update({ 
          is_pro: true, 
          override_pro: false,
          pro_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', testUserId);

      const { data: effectiveStatus } = await db.rpc('get_effective_pro_status', {
        p_user_id: testUserId
      });

      expect(effectiveStatus).toBe(false);
    });

    it('returns false for is_pro=false regardless of other conditions', async () => {
      await db
        .from('pro_status')
        .update({ 
          is_pro: false, 
          override_pro: true, // Even with override
          pro_expires_at: null
        })
        .eq('id', testUserId);

      const { data: effectiveStatus } = await db.rpc('get_effective_pro_status', {
        p_user_id: testUserId
      });

      expect(effectiveStatus).toBe(false);
    });

    it('returns false for non-existent user', async () => {
      const nonExistentUserId = '99999999-9999-4999-8999-999999999999';
      
      const { data: effectiveStatus } = await db.rpc('get_effective_pro_status', {
        p_user_id: nonExistentUserId
      });

      expect(effectiveStatus).toBe(false);
    });
  });

  describe('Manual Comp Workflow', () => {
    beforeEach(async () => {
      await db.auth.admin.createUser({
        user_id: testUserId,
        email: testEmail,
        email_confirm: true
      });
    });

    it('allows setting manual comp that persists through Stripe and cron', async () => {
      // Set manual comp
      await db
        .from('pro_status')
        .update({
          is_pro: true,
          override_pro: true,
          pro_expires_at: null,
          notes: 'Comped by admin on 2025-07-25'
        })
        .eq('id', testUserId);

      // Try Stripe deactivation
      await db.rpc('update_stripe_subscription', {
        p_user_id: testUserId,
        p_stripe_customer_id: stripeCustomerId,
        p_is_active: false,
        p_current_period_end: null
      });

      // Try cron expiration
      await db.rpc('expire_orphan_pro');

      // Verify comp persists
      const { data: proStatus } = await db
        .from('pro_status')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(proStatus?.is_pro).toBe(true);
      expect(proStatus?.override_pro).toBe(true);
      expect(proStatus?.notes).toBe('Comped by admin on 2025-07-25');
      expect(proStatus?.stripe_customer_id).toBeNull(); // Stripe didn't update it
    });
  });
});