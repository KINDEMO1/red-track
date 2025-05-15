-- This SQL function can be executed in the Supabase SQL Editor
CREATE OR REPLACE FUNCTION get_column_info(table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'column_name', column_name,
      'data_type', data_type,
      'is_nullable', is_nullable,
      'column_default', column_default,
      'is_generated', generation_expression IS NOT NULL
    )
  )
  INTO result
  FROM information_schema.columns
  WHERE table_name = get_column_info.table_name
  AND table_schema = 'public';
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_column_info TO authenticated;
