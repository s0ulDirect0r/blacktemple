CREATE TABLE IF NOT EXISTS membership_customers (
  user_id TEXT PRIMARY KEY REFERENCES member_user(id) ON DELETE RESTRICT,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS membership_attempts (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES member_user(id) ON DELETE RESTRICT,
  tier TEXT NOT NULL CHECK (tier IN ('witness', 'companion', 'champion')),
  price_id TEXT NOT NULL,
  monthly_cents INTEGER NOT NULL CHECK (monthly_cents > 0),
  terms_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('creating','open','activating','completed','expired','abandoned','blocked')),
  stripe_customer_id TEXT,
  checkout_session_id TEXT UNIQUE,
  checkout_url TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS membership_attempts_user ON membership_attempts(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY,
  attempt_id UUID NOT NULL UNIQUE REFERENCES membership_attempts(id),
  user_id TEXT NOT NULL REFERENCES member_user(id) ON DELETE RESTRICT,
  tier TEXT NOT NULL CHECK (tier IN ('witness','companion','champion')),
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_schedule_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  term_start TIMESTAMPTZ NOT NULL,
  term_end TIMESTAMPTZ NOT NULL,
  paid_through TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (term_end > term_start)
);
CREATE INDEX IF NOT EXISTS memberships_user ON memberships(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS membership_invoices (
  stripe_invoice_id TEXT PRIMARY KEY,
  membership_id UUID NOT NULL REFERENCES memberships(id),
  status TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  hosted_url TEXT,
  charge_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS membership_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS member_studio_entries (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('work','dispatch')),
  body TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS member_gatherings (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  meeting_url TEXT,
  CHECK (ends_at > starts_at)
);
CREATE TABLE IF NOT EXISTS member_service_requests (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES member_user(id),
  membership_id UUID REFERENCES memberships(id),
  kind TEXT NOT NULL CHECK (kind IN ('support','conversation')),
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  period_start TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS member_conversation_per_month
  ON member_service_requests(membership_id, period_start) WHERE kind = 'conversation';
