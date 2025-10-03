-- === 1) Enable RLS on the base table ===
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Optional: prevent writes from clients unless you add explicit policies later
-- (By default, with RLS on and no INSERT/UPDATE/DELETE policies, writes are blocked.)

-- === 2) Make SELECT policy: users can read their own profile ===
DO $$
BEGIN
  -- If it exists from a prior run, drop to avoid duplicate_object errors
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_profiles'
      AND policyname = 'self_read_user_profiles'
  ) THEN
    EXECUTE 'DROP POLICY "self_read_user_profiles" ON public.user_profiles';
  END IF;

  EXECUTE '
    CREATE POLICY "self_read_user_profiles"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = auth_user_id)
  ';
END$$;

-- === 3) Recreate the helper view as SECURITY INVOKER ===
-- Postgres 15+: the security_invoker option ensures the view enforces the caller's RLS
CREATE OR REPLACE VIEW public.current_user_profile
WITH (security_invoker = true) AS
SELECT
  id,
  auth_user_id,
  org_id,
  role,
  created_at
FROM public.user_profiles
WHERE auth_user_id = auth.uid();

-- === 4) Grants (PostgREST needs schema usage + object privileges) ===
-- Allow only authenticated users to read their own profile via RLS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.current_user_profile TO authenticated;

-- Keep anon out (remove any prior grants)
REVOKE ALL ON public.current_user_profile FROM anon;
REVOKE ALL ON public.user_profiles FROM anon;

-- Optional: keep the view read-only for everyone
REVOKE INSERT, UPDATE, DELETE ON public.current_user_profile FROM PUBLIC;
