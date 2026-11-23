-- An email address for each person, for the Email button.
ALTER TABLE sense_people ADD COLUMN IF NOT EXISTS email TEXT CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' AND length(email) <= 254);
