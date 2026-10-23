-- Tokens that let agents (Claude sessions, MCP clients) act in Sense as themselves.
-- Only a SHA-256 hash is stored; the token is shown once when created.
CREATE TABLE IF NOT EXISTS sense_agent_tokens (
  id UUID PRIMARY KEY,
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 60),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);
