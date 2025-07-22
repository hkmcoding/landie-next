-- Fix missing fields in get_dashboard_data_optimized RPC function
-- Add bio, cta_text, cta_url, and social media fields to landing page query

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
  
  -- Get landing page with all essential fields including bio, cta, and social fields
  SELECT to_json(t) INTO landing_page_data FROM (
    SELECT id, user_id, name, username, headline, subheadline, 
           contact_email, profile_image_url, bio, cta_text, cta_url,
           instagram_url, youtube_url, tiktok_url, created_at
    FROM landing_pages 
    WHERE user_id = p_user_id
  ) t;
  
  -- Get landing page ID for subsequent queries
  SELECT lp.id INTO lp_id FROM landing_pages lp WHERE lp.user_id = p_user_id;
  
  -- Get aggregated services with only needed fields
  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 
    'title', title, 
    'description', description,
    'price', price,
    'button_text', button_text,
    'button_url', button_url,
    'image_urls', image_urls,
    'youtube_url', youtube_url,
    'ai_uses', ai_uses,
    'landing_page_id', s.landing_page_id,
    'order_index', order_index
  ) ORDER BY COALESCE(order_index, 0)), '[]'::json) INTO services_data
  FROM services s
  WHERE s.landing_page_id = lp_id;
  
  -- Get aggregated highlights with only needed fields
  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 
    'header', header, 
    'content', content,
    'ai_uses', ai_uses,
    'landing_page_id', h.landing_page_id,
    'created_at', created_at,
    'updated_at', updated_at,
    'order_index', order_index
  ) ORDER BY COALESCE(order_index, 0)), '[]'::json) INTO highlights_data
  FROM highlights h
  WHERE h.landing_page_id = lp_id;
  
  -- Get aggregated testimonials with only needed fields
  SELECT COALESCE(json_agg(json_build_object(
    'id', id, 
    'quote', quote, 
    'author_name', author_name, 
    'description', description,
    'image_urls', image_urls,
    'youtube_url', youtube_url,
    'ai_uses', ai_uses,
    'landing_page_id', t.landing_page_id,
    'created_at', created_at,
    'updated_at', updated_at,
    'order_index', order_index
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