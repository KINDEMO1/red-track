-- This SQL function can be executed in the Supabase SQL Editor
CREATE OR REPLACE FUNCTION debug_get_table_info(table_name text)
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
      'character_maximum_length', character_maximum_length
    )
  )
  INTO result
  FROM information_schema.columns
  WHERE table_name = debug_get_table_info.table_name
  AND table_schema = 'public';
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_get_table_info TO authenticated;
