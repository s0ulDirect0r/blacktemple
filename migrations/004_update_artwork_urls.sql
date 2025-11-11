-- First, copy public_id to url for any rows where they differ
UPDATE artworks SET public_id = secure_url WHERE public_id != secure_url;

-- Add the new url column
ALTER TABLE artworks ADD COLUMN url TEXT;

-- Copy data to the new column
UPDATE artworks SET url = public_id;

-- Make url NOT NULL
ALTER TABLE artworks ALTER COLUMN url SET NOT NULL;

-- Drop old columns
ALTER TABLE artworks DROP COLUMN secure_url;
ALTER TABLE artworks DROP COLUMN public_id;

-- Add index on url
CREATE INDEX IF NOT EXISTS idx_artworks_url ON artworks(url); 