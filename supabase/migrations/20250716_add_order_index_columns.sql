-- Add order_index columns for drag-and-drop functionality
-- Migration: Add order_index columns to services, highlights, and testimonials tables

-- Add order_index column to services table
ALTER TABLE services ADD COLUMN order_index INTEGER DEFAULT 0;

-- Add order_index column to highlights table  
ALTER TABLE highlights ADD COLUMN order_index INTEGER DEFAULT 0;

-- Add order_index column to testimonials table
ALTER TABLE testimonials ADD COLUMN order_index INTEGER DEFAULT 0;

-- Set initial order based on id (or any consistent ordering) for services
UPDATE services SET order_index = subquery.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY landing_page_id ORDER BY id) AS row_num
  FROM services
) AS subquery
WHERE services.id = subquery.id;

-- Set initial order based on id (or any consistent ordering) for highlights
UPDATE highlights SET order_index = subquery.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY landing_page_id ORDER BY id) AS row_num
  FROM highlights
) AS subquery
WHERE highlights.id = subquery.id;

-- Set initial order based on id (or any consistent ordering) for testimonials
UPDATE testimonials SET order_index = subquery.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY landing_page_id ORDER BY id) AS row_num
  FROM testimonials
) AS subquery
WHERE testimonials.id = subquery.id;

-- Add indexes for better performance on order_index columns
CREATE INDEX IF NOT EXISTS idx_services_landing_page_order ON services(landing_page_id, order_index);
CREATE INDEX IF NOT EXISTS idx_highlights_landing_page_order ON highlights(landing_page_id, order_index);
CREATE INDEX IF NOT EXISTS idx_testimonials_landing_page_order ON testimonials(landing_page_id, order_index);

-- Add NOT NULL constraints after setting initial values
ALTER TABLE services ALTER COLUMN order_index SET NOT NULL;
ALTER TABLE highlights ALTER COLUMN order_index SET NOT NULL;
ALTER TABLE testimonials ALTER COLUMN order_index SET NOT NULL;