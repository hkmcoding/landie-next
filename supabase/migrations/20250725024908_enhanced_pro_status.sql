-- Enhanced Pro Status System with Stripe Integration and Manual Comps
-- Supports: 7-day trials, Stripe subscriptions, manual comps, automatic expiry

-- Add new columns to existing user_pro_status table
alter table public.user_pro_status 
  add column if not exists pro_expires_at timestamptz,
  add column if not exists stripe_customer_id text unique,
  add column if not exists override_pro boolean not null default false,
  add column if not exists notes text;

-- Rename user_id to id to match auth.users.id pattern (optional, for consistency)
-- alter table public.user_pro_status rename column user_id to id;

-- RLS is already enabled on user_pro_status, policies already exist

-- Function to grant initial 7-day Pro trial (idempotent for dev resets)
create or replace function public.grant_initial_pro()
returns trigger language plpgsql security definer as $$
begin
  -- Only grant trial if user doesn't already have a user_pro_status record
  insert into public.user_pro_status (user_id, is_pro, pro_expires_at)
  values (new.id, true, now() + interval '7 days')
  on conflict (user_id) do nothing;  -- Idempotent: ignore if already exists
  
  return new;
end; $$;

-- Create trigger for 7-day trial on signup
drop trigger if exists trg_grant_initial_pro on auth.users;
create trigger trg_grant_initial_pro
  after insert on auth.users
  for each row execute procedure public.grant_initial_pro();

-- Function to handle Stripe subscription updates
create or replace function public.update_stripe_subscription(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_is_active boolean,
  p_current_period_end bigint default null
)
returns void language plpgsql security definer as $$
begin
  -- Only update if override_pro is false (don't overwrite manual comps)
  update public.user_pro_status
  set is_pro = p_is_active,
      pro_expires_at = case 
        when p_is_active and p_current_period_end is not null 
        then to_timestamp(p_current_period_end)
        when p_is_active and p_current_period_end is null
        then null  -- Permanent Pro
        else now() -- Disabled
      end,
      stripe_customer_id = p_stripe_customer_id,
      updated_at = now()
  where user_id = p_user_id 
    and override_pro = false;
end; $$;

-- Function to expire orphaned Pro trials (safety net)
create or replace function public.expire_orphan_pro()
returns void language plpgsql security definer as $$
begin
  update public.user_pro_status
  set is_pro = false,
      updated_at = now()
  where is_pro = true
    and pro_expires_at < now()
    and override_pro = false;  -- Don't touch manual comps
end; $$;

-- Schedule daily cron job for safety net at 04:00 UTC
select cron.schedule(
  'expire_pro_trials_daily',
  '0 4 * * *',
  'select public.expire_orphan_pro();'
);

-- Helper function to check effective Pro status
create or replace function public.get_effective_pro_status(p_user_id uuid)
returns boolean language plpgsql security definer as $$
declare
  status_row public.user_pro_status%rowtype;
begin
  select * into status_row
  from public.user_pro_status
  where user_id = p_user_id;
  
  if not found then
    return false;
  end if;
  
  -- Pro if: is_pro AND (override_pro OR no expiry OR not expired)
  return status_row.is_pro and (
    status_row.override_pro or 
    status_row.pro_expires_at is null or 
    status_row.pro_expires_at > now()
  );
end; $$;

-- Grant permissions
grant usage on schema public to authenticated;
grant execute on function public.grant_initial_pro() to authenticated;
grant execute on function public.update_stripe_subscription(uuid, text, boolean, bigint) to service_role;
grant execute on function public.expire_orphan_pro() to service_role;
grant execute on function public.get_effective_pro_status(uuid) to authenticated;

-- Add helpful comments
comment on column public.user_pro_status.override_pro is 'Manual comp flag - prevents Stripe/cron from modifying status';
comment on column public.user_pro_status.stripe_customer_id is 'Links to Stripe customer for subscription management';
comment on column public.user_pro_status.pro_expires_at is 'Trial/subscription expiration date, null for permanent Pro';
comment on column public.user_pro_status.notes is 'Admin notes for manual comps or special cases';
comment on function public.grant_initial_pro() is 'Grants 7-day trial on signup (idempotent)';
comment on function public.update_stripe_subscription(uuid, text, boolean, bigint) is 'Updates Pro status from Stripe webhooks (respects override_pro)';
comment on function public.expire_orphan_pro() is 'Safety net to expire abandoned trials (ignores override_pro)';
comment on function public.get_effective_pro_status(uuid) is 'Returns true Pro status considering all conditions';