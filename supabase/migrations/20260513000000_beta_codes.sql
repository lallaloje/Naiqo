-- =============================================
-- Beta access codes for closed beta program
-- =============================================

-- 1. Create beta_codes table
CREATE TABLE IF NOT EXISTS beta_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT UNIQUE NOT NULL,
  salon_name   TEXT,                         -- optional: pre-assign to a salon
  used         BOOLEAN NOT NULL DEFAULT FALSE,
  used_by      UUID,                         -- auth.users.id of who used it
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE beta_codes ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read codes to validate them during registration
DROP POLICY IF EXISTS "Public can read beta codes" ON beta_codes;
CREATE POLICY "Public can read beta codes" ON beta_codes
  FOR SELECT USING (true);

-- 2. Seed 10 initial codes (you can assign salon_name later)
INSERT INTO beta_codes (code) VALUES
  ('NAIQO-BETA-A1B2'),
  ('NAIQO-BETA-C3D4'),
  ('NAIQO-BETA-E5F6'),
  ('NAIQO-BETA-G7H8'),
  ('NAIQO-BETA-I9J0'),
  ('NAIQO-BETA-K1L2'),
  ('NAIQO-BETA-M3N4'),
  ('NAIQO-BETA-O5P6'),
  ('NAIQO-BETA-Q7R8'),
  ('NAIQO-BETA-S9T0')
ON CONFLICT (code) DO NOTHING;

-- 3. Secure function to consume a code atomically (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION consume_beta_code(p_code TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE beta_codes
  SET used = TRUE, used_by = p_user_id, used_at = NOW()
  WHERE code = p_code AND used = FALSE;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION consume_beta_code(TEXT, UUID) TO authenticated;

-- 4. Trigger: after salon is inserted, apply beta settings if user signed up with a code
CREATE OR REPLACE FUNCTION handle_beta_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_beta_code TEXT;
  v_consumed  BOOLEAN;
BEGIN
  -- Read beta_code from user metadata set during signUp
  SELECT raw_user_meta_data->>'beta_code'
  INTO v_beta_code
  FROM auth.users
  WHERE id = NEW.user_id;

  IF v_beta_code IS NOT NULL AND v_beta_code <> '' THEN
    SELECT consume_beta_code(v_beta_code, NEW.user_id) INTO v_consumed;

    IF v_consumed THEN
      UPDATE salons
      SET subscription_status = 'beta',
          trial_ends_at        = NOW() + INTERVAL '90 days'
      WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_salon_created_handle_beta ON salons;
CREATE TRIGGER on_salon_created_handle_beta
  AFTER INSERT ON salons
  FOR EACH ROW
  EXECUTE FUNCTION handle_beta_registration();
