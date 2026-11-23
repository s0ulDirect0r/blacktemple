-- How to reach each person: a phone number (for iMessage, WhatsApp and Signal) and a Telegram username.
ALTER TABLE sense_people ADD COLUMN IF NOT EXISTS phone TEXT CHECK (phone ~ '^\+[0-9]{7,15}$');
ALTER TABLE sense_people ADD COLUMN IF NOT EXISTS telegram TEXT CHECK (telegram ~ '^[A-Za-z0-9_]{4,32}$');
