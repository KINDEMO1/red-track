-- Function to create the get_all_certificates function
CREATE OR REPLACE FUNCTION create_admin_certificates_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Drop the function if it exists
  DROP FUNCTION IF EXISTS get_all_certificates();
  
  -- Create the function
  CREATE OR REPLACE FUNCTION get_all_certificates()
  RETURNS TABLE (
    id uuid,
    user_id uuid,
    file_name text,
    file_type text,
    file_url text,
    upload_date timestamp with time zone,
    status text,
    notes text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    user jsonb
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $func$
  BEGIN
    RETURN QUERY
    SELECT 
      mc.id,
      mc.user_id,
      mc.file_name,
      mc.file_type,
      mc.file_url,
      mc.upload_date,
      mc.status,
      mc.notes,
      mc.created_at,
      mc.updated_at,
      jsonb_build_object(
        'id', u.id,
        'full_name', u.full_name,
        'email', u.email,
        'student_id', u.student_id
      ) as user
    FROM 
      medical_certificates mc
    LEFT JOIN 
      users u ON mc.user_id = u.id
    ORDER BY 
      mc.created_at DESC;
  END;
  $func$;
END;
$$;
