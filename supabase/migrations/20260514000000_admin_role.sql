-- =============================================
-- Admin role: is_admin flag + policies
-- =============================================

-- 1. Add is_admin to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Mark the owner as admin
UPDATE profiles
SET is_admin = TRUE
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ollotechs@gmail.com');

-- 3. Helper function (SECURITY DEFINER = can't be spoofed by RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE user_id = auth.uid()),
    FALSE
  );
$$;

-- 4. Allow admin to read ALL salons
DROP POLICY IF EXISTS "Admin can read all salons" ON salons;
CREATE POLICY "Admin can read all salons" ON salons
  FOR SELECT USING (is_admin());

-- 5. Allow admin to update ANY salon (e.g. change subscription status)
DROP POLICY IF EXISTS "Admin can update any salon" ON salons;
CREATE POLICY "Admin can update any salon" ON salons
  FOR UPDATE USING (is_admin());

-- 6. Allow admin to read all beta_codes
DROP POLICY IF EXISTS "Admin full access beta_codes" ON beta_codes;
CREATE POLICY "Admin full access beta_codes" ON beta_codes
  FOR ALL USING (is_admin());

-- 7. Allow admin to read ALL appointments across all salons
DROP POLICY IF EXISTS "Admin can read all appointments" ON appointments;
CREATE POLICY "Admin can read all appointments" ON appointments
  FOR SELECT USING (is_admin());
