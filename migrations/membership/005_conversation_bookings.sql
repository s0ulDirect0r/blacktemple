-- Champion private conversations booked straight onto the calendar.
-- A row is written before the calendar event, so the slot and the paid month
-- are held while Google is called; a failed event marks the row 'failed'.
CREATE TABLE IF NOT EXISTS member_conversation_bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES member_user(id),
  membership_id UUID NOT NULL REFERENCES memberships(id),
  period_start TIMESTAMPTZ NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  focus TEXT NOT NULL CHECK (focus IN ('desire','creative')),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'booking' CHECK (status IN ('booking','confirmed','failed')),
  calendar_event_id TEXT,
  meet_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);
-- One conversation per paid membership month, and never two members in one slot.
CREATE UNIQUE INDEX IF NOT EXISTS member_conversation_booking_per_month
  ON member_conversation_bookings(membership_id, period_start) WHERE status <> 'failed';
CREATE UNIQUE INDEX IF NOT EXISTS member_conversation_booking_slot
  ON member_conversation_bookings(starts_at) WHERE status <> 'failed';
