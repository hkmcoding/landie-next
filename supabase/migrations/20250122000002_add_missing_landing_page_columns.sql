-- Add missing columns to landing_pages table that are expected by the application
-- These fields are referenced in TypeScript interfaces and the RPC function but may not exist in the actual table

-- Add bio field for the about section
ALTER TABLE landing_pages 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add CTA fields for call-to-action section
ALTER TABLE landing_pages 
ADD COLUMN IF NOT EXISTS cta_text TEXT;

ALTER TABLE landing_pages 
ADD COLUMN IF NOT EXISTS cta_url TEXT;

-- Add social media URL fields
ALTER TABLE landing_pages 
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

ALTER TABLE landing_pages 
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

ALTER TABLE landing_pages 
ADD COLUMN IF NOT EXISTS tiktok_url TEXT;

-- Now update the RPC function to include these fields (using minimal approach)
CREATE OR REPLACE FUNCTION get_dashboard_data_optimized(p_user_id uuid)
RETURNS json AS $$
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
  
  -- Get landing page with essential fields INCLUDING newly added bio, cta, and social fields
  SELECT to_json(t) INTO landing_page_data FROM (
    SELECT id, user_id, name, username, headline, subheadline, 
           contact_email, profile_image_url, bio, cta_text, cta_url,
           instagram_url, youtube_url, tiktok_url, created_at
    FROM landing_pages 
    WHERE user_id = p_user_id
  ) t;
  
  -- Get aggregated services with basic fields only (avoiding columns that may not exist)
  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 
    'title', title, 
    'description', description,
    'price', price,
    'button_text', button_text,
    'button_url', button_url,
    'image_urls', image_urls,
    'landing_page_id', s.landing_page_id,
    'order_index', COALESCE(order_index, 0)
  ) ORDER BY COALESCE(order_index, 0)), '[]'::json) INTO services_data
  FROM services s
  WHERE s.landing_page_id = lp_id;
  
  -- Get aggregated highlights with basic fields only
  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 
    'header', header, 
    'content', content,
    'landing_page_id', h.landing_page_id,
    'created_at', created_at,
    'order_index', COALESCE(order_index, 0)
  ) ORDER BY COALESCE(order_index, 0)), '[]'::json) INTO highlights_data
  FROM highlights h
  WHERE h.landing_page_id = lp_id;
  
  -- Get aggregated testimonials with basic fields only
  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 
    'quote', quote, 
    'author_name', author_name, 
    'description', description,
    'landing_page_id', t.landing_page_id,
    'created_at', created_at,
    'order_index', COALESCE(order_index, 0)
  ) ORDER BY COALESCE(order_index, 0)), '[]'::json) INTO testimonials_data
  FROM testimonials t
  WHERE t.landing_page_id = lp_id;
  
  -- Get user pro status
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
$$ LANGUAGE plpgsql SECURITY DEFINER;