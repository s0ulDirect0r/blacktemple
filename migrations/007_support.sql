CREATE TABLE IF NOT EXISTS support_payments (
  checkout_session_id TEXT PRIMARY KEY,
  payment_intent_id TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents BETWEEN 100 AND 100000),
  currency TEXT NOT NULL CHECK (currency = 'usd'),
  livemode BOOLEAN NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
