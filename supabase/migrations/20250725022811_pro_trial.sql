-- Migration: Pro Trial System
-- Creates 7-day automatic Pro trial for new users
-- Sets up automatic expiration via cron job

-- Create pro_status table if it doesn't exist
create table if not exists public.pro_status (
  id uuid primary key references auth.users(id) on delete cascade,
  is_pro boolean not null default false,
  pro_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on pro_status table
alter table public.pro_status enable row level security;

-- RLS policies: authenticated users can select their own status
create policy "Users can view own pro status" on public.pro_status
  for select using (auth.uid() = id);

-- Only service role can insert/update pro_status (via triggers/functions)
create policy "Service role can manage pro status" on public.pro_status
  for all using (auth.role() = 'service_role');

-- Function to grant initial 7-day Pro trial on user signup
create or replace function public.grant_initial_pro()
returns trigger language plpgsql security definer as $$
begin
  insert into public.pro_status (id, is_pro, pro_expires_at)
  values (new.id, true, now() + interval '7 days')
  on conflict (id) do update
  set is_pro = true,
      pro_expires_at = now() + interval '7 days',
      updated_at = now();
  return new;
end; $$;

-- Create trigger to grant Pro trial on user signup
drop trigger if exists trg_grant_initial_pro on auth.users;
create trigger trg_grant_initial_pro
  after insert on auth.users
  for each row execute procedure public.grant_initial_pro();

-- Procedure to expire Pro trials (called by cron)
create or replace function public.expire_pro_trials()
returns void language plpgsql security definer as $$
begin
  update public.pro_status
  set    is_pro = false,
         updated_at = now()
  where  is_pro = true
    and  pro_expires_at < now();
end $$;

-- Schedule daily cron job to expire Pro trials at 04:00 UTC
select cron.schedule(
  'expire_pro_trials_daily',
  '0 4 * * *',
  'select public.expire_pro_trials();'
);

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant select on table public.pro_status to authenticated;
grant execute on function public.grant_initial_pro() to authenticated;
grant execute on function public.expire_pro_trials() to service_role;

-- Add helpful comment
comment on table public.pro_status is 'Tracks Pro subscription status with automatic 7-day trial for new users';
comment on function public.grant_initial_pro() is 'Automatically grants 7-day Pro trial to new users on signup';
comment on function public.expire_pro_trials() is 'Expires Pro trials that have passed their expiration date (called by cron)';