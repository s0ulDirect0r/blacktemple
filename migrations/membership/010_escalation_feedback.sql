-- One-click ESCALATION player feedback from the death and victory screens.
CREATE TABLE IF NOT EXISTS escalation_feedback (
  id UUID PRIMARY KEY,
  user_id TEXT REFERENCES member_user(id) ON DELETE SET NULL,
  -- HMAC of the client IP: enough to rate-limit, never the address itself.
  ip_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('fun', 'hard', 'broken', 'note')),
  text TEXT CHECK (length(text) <= 500),
  arena TEXT,
  wave INTEGER,
  seconds REAL,
  killer TEXT,
  fps REAL,
  build TEXT,
  screen TEXT CHECK (screen IN ('dead', 'won')),
  errors JSONB,
  -- PNG bytes; only the newest screenshots are kept (see SCREENSHOT_KEEP).
  shot BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS escalation_feedback_created ON escalation_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS escalation_feedback_ip ON escalation_feedback (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS escalation_feedback_user ON escalation_feedback (user_id, created_at DESC);
