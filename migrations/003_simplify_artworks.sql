-- First, drop the secure_url column since it's redundant
ALTER TABLE artworks DROP COLUMN secure_url;

-- Rename public_id to url for clarity
ALTER TABLE artworks RENAME COLUMN public_id TO url;

-- Add an index on the url column
CREATE INDEX IF NOT EXISTS idx_artworks_url ON artworks(url); 