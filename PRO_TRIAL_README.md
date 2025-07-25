# Pro Trial System

## Overview
Automatic 7-day Pro trial system that grants Pro access to new users upon signup, then automatically downgrades them to Free after the trial expires.

## How It Works

### Part A: Grant 7-day Pro Trial on Sign-up
- **Trigger**: `trg_grant_initial_pro` on `auth.users` table
- **Function**: `grant_initial_pro()` automatically inserts/updates `pro_status` table
- **Duration**: 7 days from signup moment
- **Behavior**: Uses `ON CONFLICT` to handle duplicate signups

### Part B: Auto-expire Pro Trials  
- **Cron Job**: Runs daily at 04:00 UTC via `pg_cron`
- **Function**: `expire_pro_trials()` sets `is_pro = false` for expired trials
- **Logic**: Only affects trials where `pro_expires_at < now()`

### Part C: Frontend Integration
- **Hook**: `useProStatus()` provides real-time Pro status
- **CTAs**: All "Start Free Trial" buttons redirect to `/signup`
- **Security**: Frontend trusts backend expiration logic

## Database Schema

```sql
public.pro_status (
  id uuid PK = user_id,
  is_pro boolean,
  pro_expires_at timestamptz,  -- NULL for permanent Pro users
  created_at timestamptz,
  updated_at timestamptz
)
```

## Development Usage

### Reset User Trial (Development)
```sql
-- Reset a user's trial
UPDATE public.pro_status 
SET is_pro = true, 
    pro_expires_at = now() + interval '7 days',
    updated_at = now()
WHERE id = 'user-uuid-here';
```

### Test Trial Expiration
```sql
-- Fast-forward a user's trial to expire
UPDATE public.pro_status 
SET pro_expires_at = now() - interval '1 day'
WHERE id = 'user-uuid-here';

-- Run expiration manually
SELECT public.expire_pro_trials();
```

### Check Cron Jobs
```sql
-- View scheduled cron jobs
SELECT * FROM cron.job WHERE jobname = 'expire_pro_trials_daily';
```

## Files Changed

### Migration
- `supabase/migrations/20250725022811_pro_trial.sql` - Complete Pro trial system

### Frontend Updates
- `src/components/marketing/Hero.tsx` - CTA → `/signup`
- `src/components/marketing/Nav.tsx` - CTA → `/signup` (desktop + mobile)
- `src/components/marketing/FooterCTA.tsx` - CTA → `/signup`
- `src/hooks/useProStatus.ts` - Pro status hook (NEW)

### Tests
- `tests/pro_trial.spec.ts` - Vitest unit tests for Pro trial logic

## Security Notes

- **RLS Policies**: Users can only view their own Pro status
- **Service Role**: Only service role can modify Pro status (via triggers/functions)
- **Frontend Trust**: Frontend displays backend-determined status without client-side expiration checks
- **Permanent Pro**: Users with `pro_expires_at = NULL` are never expired (for actual subscribers)

## Deployment

1. **Apply Migration**: `supabase db push`
2. **Verify Cron**: Check that `pg_cron` is enabled and job is scheduled
3. **Test Signup**: Create test user and verify trial is granted
4. **Test Expiration**: Run manual expiration to verify expired trials are downgraded

## Monitoring

- **Trial Grants**: Monitor `pro_status` inserts matching user signups
- **Expirations**: Check daily cron job execution and expired trial counts
- **Errors**: Watch for trigger/function errors in Supabase logs