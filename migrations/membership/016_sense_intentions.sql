-- Intentions in Sense: one per day, week, month, quarter and year, each reviewed when its period ends.
CREATE TABLE IF NOT EXISTS sense_intentions (
  id UUID PRIMARY KEY,
  period TEXT NOT NULL CHECK (period IN ('day', 'week', 'month', 'quarter', 'year')),
  period_start DATE NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  result TEXT CHECK (result IN ('yes', 'partly', 'no')),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (period, period_start)
);
