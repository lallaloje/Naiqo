-- Migration: auth_quick_access
-- Adds PIN login (desktop) and WebAuthn biometric (mobile) support

-- 1. PIN hash columns in profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS login_pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS login_pin_salt TEXT;

-- 2. WebAuthn credentials (one per device, stored permanently)
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT        NOT NULL UNIQUE,
  public_key    TEXT        NOT NULL,
  counter       BIGINT      NOT NULL DEFAULT 0,
  device_name   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ
);

ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own WebAuthn credentials"
  ON webauthn_credentials FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin can read all
CREATE POLICY "Admin reads all webauthn_credentials"
  ON webauthn_credentials FOR SELECT
  USING (is_admin());

-- 3. Ephemeral challenges (auto-cleaned)
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL,
  challenge  TEXT        NOT NULL,
  type       TEXT        NOT NULL CHECK (type IN ('registration', 'authentication')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes'
);

ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- Only service_role accesses challenges (no client-side access)
CREATE POLICY "No direct client access to challenges"
  ON webauthn_challenges FOR ALL
  USING (false);
