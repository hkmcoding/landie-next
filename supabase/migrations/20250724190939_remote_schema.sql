drop policy "unique_visitors_full_access" on "analytics"."unique_visitors";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION analytics.get_heatmap(_landing_page_id uuid, _start_date date, _end_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(dow integer, hour integer, views integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'analytics', 'public'
AS $function$
with perms as (
  select
    exists (                                   -- 1) caller owns the page
      select 1
      from public.landing_pages lp
      where lp.id      = _landing_page_id
        and lp.user_id = auth.uid()
    ) as owns_lp,

    exists (                                   -- 2) caller is Pro
      select 1
      from public.user_pro_status ups
      where ups.user_id = auth.uid()
        and ups.is_pro  = true
    ) as is_pro
)
select
  h.dow,
  h.hour,
  coalesce(sum(h.views), 0)::int as views
from perms, analytics.page_views_hourly_mv h
where perms.owns_lp
  and perms.is_pro
  and h.landing_page_id = _landing_page_id
  and h.local_date between _start_date and _end_date
group by h.dow, h.hour;
$function$
;

CREATE OR REPLACE FUNCTION analytics.get_page_metrics(_landing_page_id uuid)
 RETURNS TABLE(avg_seconds numeric, unique_visitors bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'analytics', 'public', 'pg_catalog'
AS $function$
  SELECT
    AVG(duration_seconds)      AS avg_seconds,
    COUNT(DISTINCT visitor_id) AS unique_visitors
  FROM analytics.page_sessions
  WHERE landing_page_id = _landing_page_id
    AND duration_seconds IS NOT NULL;
$function$
;

CREATE OR REPLACE FUNCTION analytics.get_section_insights(_landing_page_id uuid)
 RETURNS TABLE(section text, views bigint, dropoff_rate numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'analytics', 'public', 'pg_catalog'
AS $function$
WITH section_counts AS (
  SELECT
    section,
    COUNT(*)       AS views,
    MIN(index)     AS idx
  FROM analytics.section_view_events
  WHERE landing_page_id = _landing_page_id
  GROUP BY section
),
section_order AS (
  SELECT
    section,
    views,
    idx,
    LAG(views) OVER (ORDER BY idx) AS prev_views
  FROM section_counts
)
SELECT
  section,
  views,
  COALESCE(
    ROUND((prev_views - views) * 100.0 / NULLIF(prev_views,0), 1),
    0
  ) AS dropoff_rate
FROM section_order
ORDER BY idx;
$function$
;

CREATE OR REPLACE FUNCTION analytics.refresh_section_dropoff()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.section_dropoff_mv;
END $function$
;

CREATE OR REPLACE FUNCTION analytics.refresh_section_dropoff_mv()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.section_dropoff_mv;
END;
$function$
;

CREATE OR REPLACE FUNCTION analytics.trigger_refresh_section_dropoff_mv()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Refresh the materialized view (in practice, you might want to batch this)
  PERFORM analytics.refresh_section_dropoff_mv();
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

grant insert on table "analytics"."section_view_events" to "posthog_exporter";

create policy "unique_visitors_full_access"
on "analytics"."unique_visitors"
as permissive
for all
to anon, authenticated
using (true)
with check (true);



set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_dashboard_data_optimized(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  landing_page_data json;
  services_data json;
  highlights_data json;
  testimonials_data json;
  user_pro_data json;
  result json;
  lp_id uuid;
BEGIN
  -- Check if user exists first
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    SELECT json_build_object(
      'landing_page', null,
      'services', '[]'::json,
      'highlights', '[]'::json,
      'testimonials', '[]'::json,
      'user_pro_status', json_build_object('user_id', p_user_id, 'is_pro', false)
    ) INTO result;
    RETURN result;
  END IF;
  
  -- Get landing page ID for subsequent queries
  SELECT lp.id INTO lp_id FROM landing_pages lp WHERE lp.user_id = p_user_id;
  
  -- Get landing page with all fields including newly added ones
  SELECT to_json(t) INTO landing_page_data FROM (
    SELECT id, user_id, name, username, headline, subheadline, 
           contact_email, profile_image_url, bio, cta_text, cta_url,
           instagram_url, youtube_url, tiktok_url, theme_side,
           show_contact_form, ai_uses, created_at
    FROM landing_pages 
    WHERE user_id = p_user_id
  ) t;
  
  -- Get services with all required fields
  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 
    'title', title, 
    'description', description,
    'price', price,
    'button_text', button_text,
    'button_url', button_url,
    'image_urls', COALESCE(image_urls, ARRAY[]::text[]),
    'youtube_url', youtube_url,
    'ai_uses', COALESCE(ai_uses, 0),
    'landing_page_id', landing_page_id,
    'created_at', created_at,
    'updated_at', updated_at,
    'order_index', COALESCE(order_index, 0)
  ) ORDER BY COALESCE(order_index, 0)), '[]'::json) INTO services_data
  FROM services s
  WHERE s.landing_page_id = lp_id;
  
  -- Get highlights with all required fields
  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 
    'header', header, 
    'content', content,
    'ai_uses', COALESCE(ai_uses, 0),
    'landing_page_id', landing_page_id,
    'created_at', created_at,
    'updated_at', updated_at,
    'order_index', COALESCE(order_index, 0)
  ) ORDER BY COALESCE(order_index, 0)), '[]'::json) INTO highlights_data
  FROM highlights h
  WHERE h.landing_page_id = lp_id;
  
  -- Get testimonials with all required fields
  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 
    'quote', quote, 
    'author_name', author_name, 
    'description', description,
    'image_urls', COALESCE(image_urls, ARRAY[]::text[]),
    'youtube_url', youtube_url,
    'ai_uses', COALESCE(ai_uses, 0),
    'landing_page_id', landing_page_id,
    'created_at', created_at,
    'updated_at', updated_at,
    'order_index', COALESCE(order_index, 0)
  ) ORDER BY COALESCE(order_index, 0)), '[]'::json) INTO testimonials_data
  FROM testimonials t
  WHERE t.landing_page_id = lp_id;
  
  -- Get user pro status with all fields
  SELECT to_json(ups) INTO user_pro_data FROM (
    SELECT user_id, is_pro, created_at, updated_at
    FROM user_pro_status 
    WHERE user_id = p_user_id
  ) ups;
  
  -- If no pro status exists, create default
  IF user_pro_data IS NULL THEN
    SELECT json_build_object(
      'user_id', p_user_id,
      'is_pro', false
    ) INTO user_pro_data;
  END IF;
  
  -- Combine all data into final result
  SELECT json_build_object(
    'landing_page', landing_page_data,
    'services', services_data,
    'highlights', highlights_data,
    'testimonials', testimonials_data,
    'user_pro_status', user_pro_data
  ) INTO result;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_section_insights(_landing_page_id uuid)
 RETURNS TABLE(section text, views bigint, dropoff_rate numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'analytics', 'pg_catalog'
AS $function$
  SELECT *
    FROM analytics.get_section_insights(_landing_page_id);
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_suggestion_performance_mv()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW analytics.suggestion_performance_mv;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reject_reserved_usernames()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.reserved_usernames
     WHERE username = LOWER(NEW.username)
  ) THEN
    RAISE EXCEPTION 'username_reserved';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;


