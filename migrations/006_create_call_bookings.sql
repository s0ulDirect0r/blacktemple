-- Paid 1:1 calls booked from /calls. A row starts as a 'held' slot while the
-- buyer is in Stripe Checkout, becomes 'confirmed' once paid, or 'released'
-- if checkout is abandoned or expires.
CREATE TABLE IF NOT EXISTS call_bookings (
  id TEXT PRIMARY KEY,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  note TEXT,
  time_zone TEXT,
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'confirmed', 'released')),
  hold_expires_at TIMESTAMPTZ,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER,
  calendar_event_id TEXT,
  meet_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  CHECK (ends_at > starts_at)
);

-- No two live bookings (held or confirmed) may overlap in time.
ALTER TABLE call_bookings ADD CONSTRAINT call_bookings_no_overlap
  EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&)
  WHERE (status IN ('held', 'confirmed'));

CREATE INDEX IF NOT EXISTS call_bookings_starts_at_idx ON call_bookings (starts_at);
