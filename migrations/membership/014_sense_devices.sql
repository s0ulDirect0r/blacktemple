-- Matthew's own devices (the desktop app now, iPad and phone later). A device token
-- is traded for a normal 8-hour admin session, so a device stays signed in without
-- the password. Only a SHA-256 hash is stored; revoking stops new sessions at once.
CREATE TABLE IF NOT EXISTS sense_devices (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);
