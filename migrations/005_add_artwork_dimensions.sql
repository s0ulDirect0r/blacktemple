-- Store pixel dimensions so the gallery can lay out artwork at its native aspect ratio.
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS height INTEGER;
-- Optional source metadata captured on import (Procreate layer count, stroke count, time spent, canvas DPI, source file).
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS source_meta JSONB;
