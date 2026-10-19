-- Remembers the last queue alert so a scheduler running every few minutes
-- notifies the operator when problems change, not on every run.
CREATE TABLE IF NOT EXISTS membership_ops_alerts (
  id TEXT PRIMARY KEY,
  signature TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL
);
