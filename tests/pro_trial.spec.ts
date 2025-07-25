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

describe('Pro Trial System', () => {
  const testUserId = '11111111-1111-4111-8111-111111111111';
  const testEmail = 'test@example.com';

  beforeEach(async () => {
    // Clean up any existing test data
    await db.from('pro_status').delete().eq('id', testUserId);
    await db.auth.admin.deleteUser(testUserId);
  });

  afterEach(async () => {
    // Clean up test data
    await db.from('pro_status').delete().eq('id', testUserId);
    await db.auth.admin.deleteUser(testUserId);
  });

  it('grants 7-day Pro trial on user signup', async () => {
    // Create user (this should trigger the grant_initial_pro function)
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
    expect(proStatus.pro_expires_at).toBeTruthy();

    // Verify expiration is approximately 7 days from now
    const expirationDate = new Date(proStatus.pro_expires_at);
    const now = new Date();
    const diffMs = expirationDate.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    expect(diffDays).toBeCloseTo(7, 0); // Within 1 day of 7 days
  });

  it('expires Pro trials after expiration date', async () => {
    // Create user with trial
    await db.auth.admin.createUser({
      user_id: testUserId,
      email: testEmail,
      email_confirm: true
    });

    // Verify trial was granted
    let { data: initialStatus } = await db
      .from('pro_status')
      .select('is_pro')
      .eq('id', testUserId)
      .single();

    expect(initialStatus?.is_pro).toBe(true);

    // Fast-forward by setting expiration to past
    await db
      .from('pro_status')
      .update({ pro_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', testUserId);

    // Run expiration procedure
    const { error: procError } = await db.rpc('expire_pro_trials');
    expect(procError).toBeNull();

    // Verify trial was expired
    const { data: expiredStatus } = await db
      .from('pro_status')
      .select('is_pro')
      .eq('id', testUserId)
      .single();

    expect(expiredStatus?.is_pro).toBe(false);
  });

  it('does not expire Pro status without expiration date', async () => {
    // Create user
    await db.auth.admin.createUser({
      user_id: testUserId,
      email: testEmail,
      email_confirm: true
    });

    // Update to permanent Pro (no expiration)
    await db
      .from('pro_status')
      .update({ 
        is_pro: true, 
        pro_expires_at: null 
      })
      .eq('id', testUserId);

    // Run expiration procedure
    await db.rpc('expire_pro_trials');

    // Verify Pro status is maintained
    const { data: proStatus } = await db
      .from('pro_status')
      .select('is_pro')
      .eq('id', testUserId)
      .single();

    expect(proStatus?.is_pro).toBe(true);
  });

  it('handles upsert on duplicate user signup', async () => {
    // Create user first time
    await db.auth.admin.createUser({
      user_id: testUserId,
      email: testEmail,
      email_confirm: true
    });

    // Manually expire the trial
    await db
      .from('pro_status')
      .update({ 
        is_pro: false,
        pro_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', testUserId);

    // Simulate trigger again (as if user signed up again somehow)
    await db.rpc('grant_initial_pro');

    // Should have refreshed the trial
    const { data: refreshedStatus } = await db
      .from('pro_status')
      .select('is_pro, pro_expires_at')
      .eq('id', testUserId)
      .single();

    expect(refreshedStatus?.is_pro).toBe(true);
    expect(refreshedStatus?.pro_expires_at).toBeTruthy();

    // Should be approximately 7 days from now
    const expirationDate = new Date(refreshedStatus!.pro_expires_at);
    const now = new Date();
    const diffDays = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
  });
});