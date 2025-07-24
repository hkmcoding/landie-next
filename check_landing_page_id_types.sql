SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name = 'landing_page_id'
  AND table_schema = 'analytics'; 