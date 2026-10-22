-- ESCALATION early-access payments, linked to a member when known.
CREATE TABLE IF NOT EXISTS escalation_supporters (
  stripe_session_id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES member_user(id) ON DELETE SET NULL,
  email TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL,
  livemode BOOLEAN NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS escalation_supporters_user ON escalation_supporters (user_id);
CREATE INDEX IF NOT EXISTS escalation_supporters_email ON escalation_supporters (lower(email));

-- One ESCALATION account document (all character slots) per member.
CREATE TABLE IF NOT EXISTS escalation_saves (
  user_id TEXT PRIMARY KEY REFERENCES member_user(id) ON DELETE CASCADE,
  document JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
