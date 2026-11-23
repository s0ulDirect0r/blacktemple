-- People in Sense: a name, a running note, how often to be in touch, and the days we talked.
CREATE TABLE IF NOT EXISTS sense_people (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 50000),
  cadence_days INTEGER CHECK (cadence_days BETWEEN 1 AND 365),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sense_people_contacts (
  person_id UUID NOT NULL REFERENCES sense_people(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (person_id, day)
);
