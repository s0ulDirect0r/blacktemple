CREATE TABLE IF NOT EXISTS artworks (
  id SERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  secure_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  project_id TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artworks_project_id ON artworks(project_id); 