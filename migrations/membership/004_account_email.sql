CREATE TABLE IF NOT EXISTS member_email_tokens (
  token_hash TEXT PRIMARY KEY,
  -- Better Auth queues this before its signup transaction commits. A signed token
  -- still requires a real account when consumed; orphaned jobs cannot grant access.
  user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS member_email_rate_limits (
  address_hash TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  last_requested_at TIMESTAMPTZ NOT NULL,
  requests INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS member_email_jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('verify','reset')),
  encrypted_payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','complete','failed','expired')),
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_until TIMESTAMPTZ,
  last_error TEXT,
  provider_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS member_email_jobs_ready ON member_email_jobs(status, available_at);
