CREATE OR REPLACE FUNCTION public.export_auth_password_hashes()
RETURNS TABLE(id uuid, encrypted_password text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;
  RETURN QUERY
    SELECT u.id, u.encrypted_password::text
    FROM auth.users u
    WHERE u.encrypted_password IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.export_auth_password_hashes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.export_auth_password_hashes() FROM anon;
REVOKE ALL ON FUNCTION public.export_auth_password_hashes() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.export_auth_password_hashes() TO service_role;