

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "analytics";


ALTER SCHEMA "analytics" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "analytics"."get_heatmap"("_landing_page_id" "uuid", "_start_date" "date", "_end_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("dow" integer, "hour" integer, "views" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'analytics', 'public'
    AS $$
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
$$;


ALTER FUNCTION "analytics"."get_heatmap"("_landing_page_id" "uuid", "_start_date" "date", "_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "analytics"."get_page_metrics"("_landing_page_id" "uuid") RETURNS TABLE("avg_seconds" numeric, "unique_visitors" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'analytics', 'public', 'pg_catalog'
    AS $$
  SELECT
    AVG(duration_seconds)      AS avg_seconds,
    COUNT(DISTINCT visitor_id) AS unique_visitors
  FROM analytics.page_sessions
  WHERE landing_page_id = _landing_page_id
    AND duration_seconds IS NOT NULL;
$$;


ALTER FUNCTION "analytics"."get_page_metrics"("_landing_page_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "analytics"."get_section_insights"("_landing_page_id" "uuid") RETURNS TABLE("section" "text", "views" bigint, "dropoff_rate" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'analytics', 'public', 'pg_catalog'
    AS $$
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
$$;


ALTER FUNCTION "analytics"."get_section_insights"("_landing_page_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "analytics"."refresh_section_dropoff"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.section_dropoff_mv;
END $$;


ALTER FUNCTION "analytics"."refresh_section_dropoff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "analytics"."refresh_section_dropoff_mv"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.section_dropoff_mv;
END;
$$;


ALTER FUNCTION "analytics"."refresh_section_dropoff_mv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "analytics"."trigger_refresh_section_dropoff_mv"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Refresh the materialized view (in practice, you might want to batch this)
  PERFORM analytics.refresh_section_dropoff_mv();
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "analytics"."trigger_refresh_section_dropoff_mv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_data_optimized"("p_user_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_dashboard_data_optimized"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_data_optimized"("p_user_id" "uuid") IS 'Optimized single-query function to fetch all dashboard data. Replaces 6 separate queries with 1 call.';



CREATE OR REPLACE FUNCTION "public"."get_section_insights"("_landing_page_id" "uuid") RETURNS TABLE("section" "text", "views" bigint, "dropoff_rate" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'analytics', 'pg_catalog'
    AS $$
  SELECT *
    FROM analytics.get_section_insights(_landing_page_id);
$$;


ALTER FUNCTION "public"."get_section_insights"("_landing_page_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_analytics_summary"("p_user_id" "uuid", "p_landing_page_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result JSONB;
BEGIN
    WITH analytics_data AS (
        SELECT 
            COALESCE(COUNT(pv.id), 0) as total_page_views,
            COALESCE(COUNT(DISTINCT pv.viewer_id), 0) as unique_visitors,
            COALESCE((SELECT COUNT(*) FROM analytics.cta_clicks WHERE landing_page_id = p_landing_page_id), 0) as total_cta_clicks,
            COALESCE(AVG(COALESCE(ps.duration_seconds, 0)), 0) as avg_session_duration,
            COALESCE(COUNT(CASE WHEN pv.created_at >= NOW() - INTERVAL '7 days' THEN 1 END), 0) as recent_page_views,
            COALESCE((SELECT COUNT(*) FROM analytics.cta_clicks WHERE landing_page_id = p_landing_page_id AND created_at >= NOW() - INTERVAL '7 days'), 0) as recent_cta_clicks
        FROM analytics.page_views pv
        LEFT JOIN analytics.page_sessions ps ON ps.landing_page_id = pv.landing_page_id 
            AND ps.visitor_id = pv.viewer_id
        WHERE pv.landing_page_id = p_landing_page_id
    ),
    content_data AS (
        SELECT 
            COALESCE(lp.name, 'Unnamed Page') as name,
            COALESCE(lp.bio, '') as bio,
            lp.onboarding_data,
            COALESCE(array_length(string_to_array(COALESCE(lp.bio, ''), ' '), 1), 0) as bio_word_count,
            COALESCE((SELECT COUNT(*) FROM services WHERE landing_page_id = p_landing_page_id), 0) as services_count,
            COALESCE((SELECT COUNT(*) FROM highlights WHERE landing_page_id = p_landing_page_id), 0) as highlights_count,
            COALESCE((SELECT COUNT(*) FROM testimonials WHERE landing_page_id = p_landing_page_id), 0) as testimonials_count
        FROM landing_pages lp
        WHERE lp.id = p_landing_page_id AND lp.user_id = p_user_id
    ),
    recent_changes AS (
        SELECT 
            0 as content_changes_last_7_days,
            NULL::timestamptz as last_content_change
    )
    
    SELECT jsonb_build_object(
        'analytics', jsonb_build_object(
            'total_page_views', COALESCE(ad.total_page_views, 0),
            'unique_visitors', COALESCE(ad.unique_visitors, 0),
            'total_cta_clicks', COALESCE(ad.total_cta_clicks, 0),
            'avg_session_duration', ROUND(COALESCE(ad.avg_session_duration, 0), 2),
            'recent_page_views', COALESCE(ad.recent_page_views, 0),
            'recent_cta_clicks', COALESCE(ad.recent_cta_clicks, 0),
            'conversion_rate', CASE 
                WHEN COALESCE(ad.total_page_views, 0) > 0 
                THEN ROUND((COALESCE(ad.total_cta_clicks, 0)::decimal / COALESCE(ad.total_page_views, 1)::decimal) * 100, 2)
                ELSE 0 
            END
        ),
        'content', jsonb_build_object(
            'name', COALESCE(cd.name, 'Unnamed Page'),
            'bio', COALESCE(cd.bio, ''),
            'bio_word_count', COALESCE(cd.bio_word_count, 0),
            'services_count', COALESCE(cd.services_count, 0),
            'highlights_count', COALESCE(cd.highlights_count, 0),
            'testimonials_count', COALESCE(cd.testimonials_count, 0),
            'onboarding_data', cd.onboarding_data
        ),
        'recent_activity', jsonb_build_object(
            'content_changes_last_7_days', COALESCE(rc.content_changes_last_7_days, 0),
            'last_content_change', rc.last_content_change
        ),
        'generated_at', NOW()
    ) INTO result
    FROM analytics_data ad, content_data cd, recent_changes rc;
    
    IF result IS NULL THEN
        result := jsonb_build_object(
            'analytics', jsonb_build_object(
                'total_page_views', 0,
                'unique_visitors', 0,
                'total_cta_clicks', 0,
                'avg_session_duration', 0,
                'recent_page_views', 0,
                'recent_cta_clicks', 0,
                'conversion_rate', 0
            ),
            'content', jsonb_build_object(
                'name', 'Unnamed Page',
                'bio', '',
                'bio_word_count', 0,
                'services_count', 0,
                'highlights_count', 0,
                'testimonials_count', 0,
                'onboarding_data', null
            ),
            'recent_activity', jsonb_build_object(
                'content_changes_last_7_days', 0,
                'last_content_change', null
            ),
            'generated_at', NOW()
        );
    END IF;
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_user_analytics_summary"("p_user_id" "uuid", "p_landing_page_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_suggestion_performance_mv"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW analytics.suggestion_performance_mv;
END;
$$;


ALTER FUNCTION "public"."refresh_suggestion_performance_mv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_reserved_usernames"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
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
$$;


ALTER FUNCTION "public"."reject_reserved_usernames"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "analytics"."content_changes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "landing_page_id" "uuid" NOT NULL,
    "field" character varying(50) NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "changed_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "analytics"."content_changes" FORCE ROW LEVEL SECURITY;


ALTER TABLE "analytics"."content_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."cta_clicks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "landing_page_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "cta_text" "text",
    "cta_position" "text",
    "referrer" "text",
    "user_agent" "text",
    "url" "text",
    "session_id" "uuid"
);


ALTER TABLE "analytics"."cta_clicks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."page_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "landing_page_id" "uuid" NOT NULL,
    "visitor_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "session_start" timestamp with time zone DEFAULT "now"(),
    "session_end" timestamp with time zone,
    "duration_seconds" integer,
    "referrer" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "analytics"."page_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."page_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "landing_page_id" "uuid" NOT NULL,
    "viewer_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "referrer" "text",
    "user_agent" "text",
    "url" "text",
    "session_id" "uuid"
);


ALTER TABLE "analytics"."page_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."section_view_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "landing_page_id" "uuid" NOT NULL,
    "section" "text" NOT NULL,
    "index" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "session_id" "uuid"
);


ALTER TABLE "analytics"."section_view_events" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "analytics"."section_dropoff_mv" AS
 WITH "session_views" AS (
         SELECT "section_view_events"."landing_page_id",
            "section_view_events"."index" AS "section_order",
            "section_view_events"."section" AS "section_slug",
            "section_view_events"."session_id"
           FROM "analytics"."section_view_events"
        ), "cta_sessions" AS (
         SELECT DISTINCT "cta_clicks"."landing_page_id",
            "cta_clicks"."session_id"
           FROM "analytics"."cta_clicks"
        )
 SELECT "sv"."landing_page_id",
    "sv"."section_order",
    "sv"."section_slug",
    "count"(*) AS "views",
    "count"(*) FILTER (WHERE ("cs"."session_id" IS NULL)) AS "dropoffs",
    "round"((("count"(*) FILTER (WHERE ("cs"."session_id" IS NULL)))::numeric / (GREATEST("count"(*), (1)::bigint))::numeric), 3) AS "dropoff_rate"
   FROM ("session_views" "sv"
     LEFT JOIN "cta_sessions" "cs" ON ((("cs"."landing_page_id" = "sv"."landing_page_id") AND ("cs"."session_id" = "sv"."session_id"))))
  GROUP BY "sv"."landing_page_id", "sv"."section_order", "sv"."section_slug"
  WITH NO DATA;


ALTER TABLE "analytics"."section_dropoff_mv" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."unique_visitors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "landing_page_id" "uuid" NOT NULL,
    "visitor_id" "uuid" NOT NULL,
    "first_visit" timestamp with time zone DEFAULT "now"(),
    "last_visit" timestamp with time zone DEFAULT "now"(),
    "visit_count" integer DEFAULT 1,
    "referrer" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "analytics"."unique_visitors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_analysis_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "landing_page_id" "uuid" NOT NULL,
    "analysis_type" "text" NOT NULL,
    "trigger_event" "text",
    "analytics_snapshot" "jsonb" NOT NULL,
    "suggestions_generated" integer DEFAULT 0,
    "ai_model" "text" DEFAULT 'gpt-4'::"text",
    "processing_time_ms" integer,
    "tokens_used" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_analysis_sessions_analysis_type_check" CHECK (("analysis_type" = ANY (ARRAY['full'::"text", 'incremental'::"text", 'performance'::"text", 'content'::"text"])))
);


ALTER TABLE "public"."ai_analysis_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "landing_page_id" "uuid" NOT NULL,
    "suggestion_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "reasoning" "text" NOT NULL,
    "priority" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "implemented_at" timestamp with time zone,
    "dismissed_at" timestamp with time zone,
    "analytics_context" "jsonb",
    "target_section" "text",
    "original_content" "text",
    "suggested_content" "text",
    "ai_model" "text" DEFAULT 'gpt-4'::"text",
    "ai_prompt_version" "text" DEFAULT 'v1.0'::"text",
    "confidence_score" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_suggestions_confidence_score_check" CHECK ((("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric))),
    CONSTRAINT "ai_suggestions_priority_check" CHECK (("priority" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "ai_suggestions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'implemented'::"text", 'dismissed'::"text", 'testing'::"text"]))),
    CONSTRAINT "ai_suggestions_suggestion_type_check" CHECK (("suggestion_type" = ANY (ARRAY['performance'::"text", 'content'::"text", 'conversion'::"text", 'engagement'::"text", 'seo'::"text"])))
);


ALTER TABLE "public"."ai_suggestions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."highlights" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "landing_page_id" "uuid" NOT NULL,
    "header" "text" NOT NULL,
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ai_uses" integer DEFAULT 0 NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."highlights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."landing_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"(),
    "username" "text",
    "headline" "text",
    "subheadline" "text",
    "cta_text" "text",
    "cta_url" "text",
    "bio" "text",
    "profile_image_url" "text",
    "theme_side" "text",
    "created_at" timestamp with time zone,
    "name" "text",
    "instagram_url" "text",
    "youtube_url" "text",
    "tiktok_url" "text",
    "contact_email" "text",
    "show_contact_form" boolean DEFAULT true,
    "onboarding_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ai_uses" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."landing_pages" OWNER TO "postgres";


COMMENT ON TABLE "public"."landing_pages" IS 'Table for user landing pages';



CREATE TABLE IF NOT EXISTS "public"."reserved_usernames" (
    "username" "text" NOT NULL
);


ALTER TABLE "public"."reserved_usernames" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "landing_page_id" "uuid" DEFAULT "gen_random_uuid"(),
    "title" "text",
    "description" "text",
    "price" "text",
    "button_text" "text",
    "button_url" "text",
    "image_urls" "text"[] DEFAULT '{}'::"text"[],
    "ai_uses" integer DEFAULT 0 NOT NULL,
    "youtube_url" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suggestion_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "suggestion_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer,
    "feedback_text" "text",
    "is_helpful" boolean,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "suggestion_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."suggestion_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suggestion_implementations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "suggestion_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "implemented_content" "text" NOT NULL,
    "implementation_notes" "text",
    "partial_implementation" boolean DEFAULT false,
    "before_analytics" "jsonb",
    "after_analytics" "jsonb",
    "impact_measured_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."suggestion_implementations" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."suggestion_performance_mv" AS
 SELECT "s"."id" AS "suggestion_id",
    "s"."user_id",
    "s"."landing_page_id",
    "s"."suggestion_type",
    "s"."priority",
    "s"."status",
    "s"."created_at",
    "s"."implemented_at",
        CASE
            WHEN ("si"."id" IS NOT NULL) THEN true
            ELSE false
        END AS "was_implemented",
    COALESCE("si"."partial_implementation", false) AS "partial_implementation",
        CASE
            WHEN ("s"."implemented_at" IS NOT NULL) THEN (EXTRACT(epoch FROM ("s"."implemented_at" - "s"."created_at")) / (86400)::numeric)
            ELSE NULL::numeric
        END AS "days_to_implement",
    "sf"."rating" AS "user_rating",
    "sf"."is_helpful",
    ("si"."before_analytics" ->> 'page_views'::"text") AS "before_page_views",
    ("si"."after_analytics" ->> 'page_views'::"text") AS "after_page_views",
    ("si"."before_analytics" ->> 'cta_clicks'::"text") AS "before_cta_clicks",
    ("si"."after_analytics" ->> 'cta_clicks'::"text") AS "after_cta_clicks"
   FROM (("public"."ai_suggestions" "s"
     LEFT JOIN "public"."suggestion_implementations" "si" ON (("s"."id" = "si"."suggestion_id")))
     LEFT JOIN "public"."suggestion_feedback" "sf" ON (("s"."id" = "sf"."suggestion_id")))
  WITH NO DATA;


ALTER TABLE "public"."suggestion_performance_mv" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."testimonials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "landing_page_id" "uuid" DEFAULT "gen_random_uuid"(),
    "quote" "text",
    "author_name" "text",
    "image_urls" "text"[] DEFAULT '{}'::"text"[],
    "description" "text",
    "youtube_url" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "ai_uses" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."testimonials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_pro_status" (
    "user_id" "uuid" NOT NULL,
    "is_pro" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_pro_status" OWNER TO "postgres";


ALTER TABLE ONLY "analytics"."content_changes"
    ADD CONSTRAINT "content_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."cta_clicks"
    ADD CONSTRAINT "cta_clicks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."page_sessions"
    ADD CONSTRAINT "page_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."page_views"
    ADD CONSTRAINT "page_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."section_view_events"
    ADD CONSTRAINT "section_view_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."unique_visitors"
    ADD CONSTRAINT "unique_visitors_landing_page_id_visitor_id_key" UNIQUE ("landing_page_id", "visitor_id");



ALTER TABLE ONLY "analytics"."unique_visitors"
    ADD CONSTRAINT "unique_visitors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_analysis_sessions"
    ADD CONSTRAINT "ai_analysis_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."highlights"
    ADD CONSTRAINT "highlights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."landing_pages"
    ADD CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."landing_pages"
    ADD CONSTRAINT "landing_pages_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."reserved_usernames"
    ADD CONSTRAINT "reserved_usernames_pkey" PRIMARY KEY ("username");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suggestion_feedback"
    ADD CONSTRAINT "suggestion_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suggestion_implementations"
    ADD CONSTRAINT "suggestion_implementations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."testimonials"
    ADD CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."landing_pages"
    ADD CONSTRAINT "unique_user_id" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_pro_status"
    ADD CONSTRAINT "user_pro_status_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_content_changes_landing_page_id" ON "analytics"."content_changes" USING "btree" ("landing_page_id");



CREATE INDEX "idx_cta_clicks_created_at" ON "analytics"."cta_clicks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_cta_clicks_landing_page_id" ON "analytics"."cta_clicks" USING "btree" ("landing_page_id");



CREATE INDEX "idx_page_sessions_landing_page_id" ON "analytics"."page_sessions" USING "btree" ("landing_page_id");



CREATE INDEX "idx_page_sessions_session_id" ON "analytics"."page_sessions" USING "btree" ("session_id");



CREATE INDEX "idx_page_sessions_visitor_id" ON "analytics"."page_sessions" USING "btree" ("visitor_id");



CREATE INDEX "idx_page_views_created_at" ON "analytics"."page_views" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_page_views_landing_page_id" ON "analytics"."page_views" USING "btree" ("landing_page_id");



CREATE INDEX "idx_page_views_viewer_id" ON "analytics"."page_views" USING "btree" ("viewer_id");



CREATE INDEX "idx_section_dropoff_mv_landing_page" ON "analytics"."section_dropoff_mv" USING "btree" ("landing_page_id");



CREATE INDEX "idx_section_view_events_landing_session" ON "analytics"."section_view_events" USING "btree" ("landing_page_id", "session_id", "index");



CREATE INDEX "idx_unique_visitors_landing_page_id" ON "analytics"."unique_visitors" USING "btree" ("landing_page_id");



CREATE INDEX "idx_unique_visitors_last_visit" ON "analytics"."unique_visitors" USING "btree" ("last_visit" DESC);



CREATE INDEX "idx_unique_visitors_visitor_id" ON "analytics"."unique_visitors" USING "btree" ("visitor_id");



CREATE INDEX "section_dropoff_lp_idx" ON "analytics"."section_dropoff_mv" USING "btree" ("landing_page_id");



CREATE INDEX "highlights_landing_page_id_idx" ON "public"."highlights" USING "btree" ("landing_page_id");



CREATE INDEX "idx_ai_analysis_sessions_created_at" ON "public"."ai_analysis_sessions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_analysis_sessions_landing_page_id" ON "public"."ai_analysis_sessions" USING "btree" ("landing_page_id");



CREATE INDEX "idx_ai_analysis_sessions_user_id" ON "public"."ai_analysis_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_ai_suggestions_created_at" ON "public"."ai_suggestions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_suggestions_landing_page_id" ON "public"."ai_suggestions" USING "btree" ("landing_page_id");



CREATE INDEX "idx_ai_suggestions_priority" ON "public"."ai_suggestions" USING "btree" ("priority");



CREATE INDEX "idx_ai_suggestions_status" ON "public"."ai_suggestions" USING "btree" ("status");



CREATE INDEX "idx_ai_suggestions_type" ON "public"."ai_suggestions" USING "btree" ("suggestion_type");



CREATE INDEX "idx_ai_suggestions_user_id" ON "public"."ai_suggestions" USING "btree" ("user_id");



CREATE INDEX "idx_highlights_landing_page_order" ON "public"."highlights" USING "btree" ("landing_page_id", "order_index");



CREATE INDEX "idx_services_landing_page_id" ON "public"."services" USING "btree" ("landing_page_id");



CREATE INDEX "idx_services_landing_page_order" ON "public"."services" USING "btree" ("landing_page_id", "order_index");



CREATE INDEX "idx_suggestion_implementations_suggestion_id" ON "public"."suggestion_implementations" USING "btree" ("suggestion_id");



CREATE INDEX "idx_suggestion_implementations_user_id" ON "public"."suggestion_implementations" USING "btree" ("user_id");



CREATE INDEX "idx_testimonials_landing_page_id" ON "public"."testimonials" USING "btree" ("landing_page_id");



CREATE INDEX "idx_testimonials_landing_page_order" ON "public"."testimonials" USING "btree" ("landing_page_id", "order_index");



CREATE UNIQUE INDEX "unique_landing_pages_username_lower" ON "public"."landing_pages" USING "btree" ("lower"("username"));



CREATE OR REPLACE TRIGGER "trg_reject_reserved" BEFORE INSERT OR UPDATE OF "username" ON "public"."landing_pages" FOR EACH ROW EXECUTE FUNCTION "public"."reject_reserved_usernames"();



CREATE OR REPLACE TRIGGER "update_ai_suggestions_updated_at" BEFORE UPDATE ON "public"."ai_suggestions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "analytics"."content_changes"
    ADD CONSTRAINT "content_changes_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_analysis_sessions"
    ADD CONSTRAINT "ai_analysis_sessions_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_analysis_sessions"
    ADD CONSTRAINT "ai_analysis_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."highlights"
    ADD CONSTRAINT "highlights_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."landing_pages"
    ADD CONSTRAINT "landing_pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id");



ALTER TABLE ONLY "public"."suggestion_feedback"
    ADD CONSTRAINT "suggestion_feedback_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "public"."ai_suggestions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suggestion_feedback"
    ADD CONSTRAINT "suggestion_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suggestion_implementations"
    ADD CONSTRAINT "suggestion_implementations_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "public"."ai_suggestions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suggestion_implementations"
    ADD CONSTRAINT "suggestion_implementations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."testimonials"
    ADD CONSTRAINT "testimonials_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id");



ALTER TABLE ONLY "public"."user_pro_status"
    ADD CONSTRAINT "user_pro_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Allow all access" ON "analytics"."section_view_events" USING (true);



CREATE POLICY "Allow all read access" ON "analytics"."cta_clicks" FOR SELECT USING (true);



CREATE POLICY "Allow all read access" ON "analytics"."page_views" FOR SELECT USING (true);



CREATE POLICY "Allow authenticated read access" ON "analytics"."content_changes" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Allow authenticated read access" ON "analytics"."cta_clicks" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "analytics"."content_changes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "analytics"."cta_clicks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cta_clicks_anon_insert" ON "analytics"."cta_clicks" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "cta_clicks_auth_all" ON "analytics"."cta_clicks" TO "authenticated" USING (true);



ALTER TABLE "analytics"."page_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "page_sessions_anon_insert" ON "analytics"."page_sessions" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "page_sessions_auth_all" ON "analytics"."page_sessions" TO "authenticated" USING (true);



ALTER TABLE "analytics"."page_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "page_views_anon_insert" ON "analytics"."page_views" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "page_views_auth_all" ON "analytics"."page_views" TO "authenticated" USING (true);



ALTER TABLE "analytics"."section_view_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "analytics"."unique_visitors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "unique_visitors_full_access" ON "analytics"."unique_visitors" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete their own suggestions" ON "public"."ai_suggestions" FOR DELETE USING ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can insert their own analysis sessions" ON "public"."ai_analysis_sessions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can insert their own feedback" ON "public"."suggestion_feedback" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can insert their own implementations" ON "public"."suggestion_implementations" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can insert their own suggestions" ON "public"."ai_suggestions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can update their own feedback" ON "public"."suggestion_feedback" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can update their own implementations" ON "public"."suggestion_implementations" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can update their own suggestions" ON "public"."ai_suggestions" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can view their own analysis sessions" ON "public"."ai_analysis_sessions" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can view their own feedback" ON "public"."suggestion_feedback" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can view their own implementations" ON "public"."suggestion_implementations" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "Users can view their own suggestions" ON "public"."ai_suggestions" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("current_setting"('role'::"text") = 'service_role'::"text")));



ALTER TABLE "public"."ai_analysis_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_suggestions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow_delete_landing_pages" ON "public"."landing_pages" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "allow_insert_landing_pages" ON "public"."landing_pages" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "allow_select_landing_pages" ON "public"."landing_pages" FOR SELECT USING (true);



CREATE POLICY "allow_update_landing_pages" ON "public"."landing_pages" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."highlights" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "highlights_delete" ON "public"."highlights" FOR DELETE TO "authenticated" USING (("landing_page_id" IN ( SELECT "landing_pages"."id"
   FROM "public"."landing_pages"
  WHERE ("landing_pages"."user_id" = "auth"."uid"()))));



CREATE POLICY "highlights_insert" ON "public"."highlights" FOR INSERT TO "authenticated" WITH CHECK (("landing_page_id" IN ( SELECT "landing_pages"."id"
   FROM "public"."landing_pages"
  WHERE ("landing_pages"."user_id" = "auth"."uid"()))));



CREATE POLICY "highlights_select" ON "public"."highlights" FOR SELECT USING (true);



CREATE POLICY "highlights_update" ON "public"."highlights" FOR UPDATE TO "authenticated" USING (("landing_page_id" IN ( SELECT "landing_pages"."id"
   FROM "public"."landing_pages"
  WHERE ("landing_pages"."user_id" = "auth"."uid"())))) WITH CHECK (("landing_page_id" IN ( SELECT "landing_pages"."id"
   FROM "public"."landing_pages"
  WHERE ("landing_pages"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."landing_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reserved_usernames" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reserved_usernames_select" ON "public"."reserved_usernames" FOR SELECT USING (true);



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "services_delete" ON "public"."services" FOR DELETE TO "authenticated" USING (("landing_page_id" IN ( SELECT "landing_pages"."id"
   FROM "public"."landing_pages"
  WHERE ("landing_pages"."user_id" = "auth"."uid"()))));



CREATE POLICY "services_insert" ON "public"."services" FOR INSERT TO "authenticated" WITH CHECK (("landing_page_id" IN ( SELECT "landing_pages"."id"
   FROM "public"."landing_pages"
  WHERE ("landing_pages"."user_id" = "auth"."uid"()))));



CREATE POLICY "services_select" ON "public"."services" FOR SELECT USING (true);



CREATE POLICY "services_update" ON "public"."services" FOR UPDATE TO "authenticated" USING (("landing_page_id" IN ( SELECT "landing_pages"."id"
   FROM "public"."landing_pages"
  WHERE ("landing_pages"."user_id" = "auth"."uid"())))) WITH CHECK (("landing_page_id" IN ( SELECT "landing_pages"."id"
   FROM "public"."landing_pages"
  WHERE ("landing_pages"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."suggestion_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suggestion_implementations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."testimonials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "testimonials_delete" ON "public"."testimonials" FOR DELETE TO "authenticated" USING (("landing_page_id" IN ( SELECT "landing_pages"."id"
   FROM "public"."landing_pages"
  WHERE ("landing_pages"."user_id" = "auth"."uid"()))));



CREATE POLICY "testimonials_insert" ON "public"."testimonials" FOR INSERT TO "authenticated" WITH CHECK (("landing_page_id" IN ( SELECT "landing_pages"."id"
   FROM "public"."landing_pages"
  WHERE ("landing_pages"."user_id" = "auth"."uid"()))));



CREATE POLICY "testimonials_select" ON "public"."testimonials" FOR SELECT USING (true);



CREATE POLICY "testimonials_update" ON "public"."testimonials" FOR UPDATE TO "authenticated" USING (("landing_page_id" IN ( SELECT "landing_pages"."id"
   FROM "public"."landing_pages"
  WHERE ("landing_pages"."user_id" = "auth"."uid"())))) WITH CHECK (("landing_page_id" IN ( SELECT "landing_pages"."id"
   FROM "public"."landing_pages"
  WHERE ("landing_pages"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."user_pro_status" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_pro_status_delete" ON "public"."user_pro_status" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_pro_status_insert" ON "public"."user_pro_status" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_pro_status_select" ON "public"."user_pro_status" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_pro_status_update" ON "public"."user_pro_status" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT ALL ON SCHEMA "analytics" TO "authenticated";
GRANT ALL ON SCHEMA "analytics" TO "anon";
GRANT USAGE ON SCHEMA "analytics" TO "service_role";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "analytics"."get_heatmap"("_landing_page_id" "uuid", "_start_date" "date", "_end_date" "date") TO "authenticated";



GRANT ALL ON FUNCTION "analytics"."get_section_insights"("_landing_page_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "analytics"."get_section_insights"("_landing_page_id" "uuid") TO "authenticated";
































































































































































































GRANT ALL ON FUNCTION "public"."get_dashboard_data_optimized"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_data_optimized"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_data_optimized"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_section_insights"("_landing_page_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_section_insights"("_landing_page_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_section_insights"("_landing_page_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_analytics_summary"("p_user_id" "uuid", "p_landing_page_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_analytics_summary"("p_user_id" "uuid", "p_landing_page_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_analytics_summary"("p_user_id" "uuid", "p_landing_page_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_suggestion_performance_mv"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_suggestion_performance_mv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_suggestion_performance_mv"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_reserved_usernames"() TO "anon";
GRANT ALL ON FUNCTION "public"."reject_reserved_usernames"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_reserved_usernames"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";












GRANT SELECT,INSERT,UPDATE ON TABLE "analytics"."content_changes" TO "authenticated";
GRANT INSERT,UPDATE ON TABLE "analytics"."content_changes" TO "anon";
GRANT SELECT ON TABLE "analytics"."content_changes" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "analytics"."cta_clicks" TO "authenticated";
GRANT SELECT,INSERT,UPDATE ON TABLE "analytics"."cta_clicks" TO "anon";
GRANT SELECT ON TABLE "analytics"."cta_clicks" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "analytics"."page_sessions" TO "authenticated";
GRANT INSERT,UPDATE ON TABLE "analytics"."page_sessions" TO "anon";



GRANT SELECT,INSERT,UPDATE ON TABLE "analytics"."page_views" TO "authenticated";
GRANT SELECT,INSERT,UPDATE ON TABLE "analytics"."page_views" TO "anon";
GRANT SELECT ON TABLE "analytics"."page_views" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "analytics"."section_view_events" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "analytics"."section_view_events" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "analytics"."section_view_events" TO "service_role";



GRANT SELECT ON TABLE "analytics"."section_dropoff_mv" TO "anon";
GRANT SELECT ON TABLE "analytics"."section_dropoff_mv" TO "authenticated";



GRANT ALL ON TABLE "analytics"."unique_visitors" TO "anon";
GRANT ALL ON TABLE "analytics"."unique_visitors" TO "authenticated";















GRANT ALL ON TABLE "public"."ai_analysis_sessions" TO "anon";
GRANT ALL ON TABLE "public"."ai_analysis_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_analysis_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."ai_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."ai_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."highlights" TO "anon";
GRANT ALL ON TABLE "public"."highlights" TO "authenticated";
GRANT ALL ON TABLE "public"."highlights" TO "service_role";



GRANT ALL ON TABLE "public"."landing_pages" TO "anon";
GRANT ALL ON TABLE "public"."landing_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."landing_pages" TO "service_role";



GRANT ALL ON TABLE "public"."reserved_usernames" TO "anon";
GRANT ALL ON TABLE "public"."reserved_usernames" TO "authenticated";
GRANT ALL ON TABLE "public"."reserved_usernames" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."suggestion_feedback" TO "anon";
GRANT ALL ON TABLE "public"."suggestion_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."suggestion_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."suggestion_implementations" TO "anon";
GRANT ALL ON TABLE "public"."suggestion_implementations" TO "authenticated";
GRANT ALL ON TABLE "public"."suggestion_implementations" TO "service_role";



GRANT ALL ON TABLE "public"."suggestion_performance_mv" TO "anon";
GRANT ALL ON TABLE "public"."suggestion_performance_mv" TO "authenticated";
GRANT ALL ON TABLE "public"."suggestion_performance_mv" TO "service_role";



GRANT ALL ON TABLE "public"."testimonials" TO "anon";
GRANT ALL ON TABLE "public"."testimonials" TO "authenticated";
GRANT ALL ON TABLE "public"."testimonials" TO "service_role";



GRANT ALL ON TABLE "public"."user_pro_status" TO "anon";
GRANT ALL ON TABLE "public"."user_pro_status" TO "authenticated";
GRANT ALL ON TABLE "public"."user_pro_status" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
