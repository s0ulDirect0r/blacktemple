-- Sense: Matthew's sensemaking space. Channels of posts (Discord-like) and
-- titled notes linked with [[wiki links]] (Obsidian-like). Every post and note
-- records its author so agents and members can join later through the same API.

CREATE TABLE IF NOT EXISTS sense_channels (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sense_posts (
  id UUID PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES sense_channels(id),
  parent_id UUID REFERENCES sense_posts(id),
  -- owner = Matthew (admin), agent = a Claude session, member = a Temple account, system = #signals.
  author_kind TEXT NOT NULL CHECK (author_kind IN ('owner', 'agent', 'member', 'system')),
  author_id TEXT,
  author_label TEXT NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 20000),
  signal_kind TEXT,
  search TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', body)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sense_posts_channel ON sense_posts (channel_id, created_at DESC) WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS sense_posts_thread ON sense_posts (parent_id, created_at);
CREATE INDEX IF NOT EXISTS sense_posts_search ON sense_posts USING GIN (search);

CREATE TABLE IF NOT EXISTS sense_notes (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body TEXT NOT NULL DEFAULT '' CHECK (length(body) <= 200000),
  author_kind TEXT NOT NULL CHECK (author_kind IN ('owner', 'agent', 'member', 'system')),
  author_id TEXT,
  author_label TEXT NOT NULL,
  search TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Notes are found by title, case-insensitively, the way [[links]] name them.
CREATE UNIQUE INDEX IF NOT EXISTS sense_notes_title ON sense_notes (lower(title));
CREATE INDEX IF NOT EXISTS sense_notes_search ON sense_notes USING GIN (search);

-- Derived from post and note bodies on every save: [[links]] and #tags.
CREATE TABLE IF NOT EXISTS sense_links (
  source_kind TEXT NOT NULL CHECK (source_kind IN ('post', 'note')),
  source_id UUID NOT NULL,
  target TEXT NOT NULL,
  PRIMARY KEY (source_kind, source_id, target)
);
CREATE INDEX IF NOT EXISTS sense_links_target ON sense_links (target);

CREATE TABLE IF NOT EXISTS sense_tags (
  source_kind TEXT NOT NULL CHECK (source_kind IN ('post', 'note')),
  source_id UUID NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (source_kind, source_id, tag)
);
CREATE INDEX IF NOT EXISTS sense_tags_tag ON sense_tags (tag);

-- Pasted images. Bytes live in a private Blob store; bodies reference /api/sense/images/<id>.
CREATE TABLE IF NOT EXISTS sense_images (
  id UUID PRIMARY KEY,
  storage_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sense_channels (id, slug) VALUES
  (gen_random_uuid(), 'inbox'), (gen_random_uuid(), 'escalation'), (gen_random_uuid(), 'temple'),
  (gen_random_uuid(), 'art'), (gen_random_uuid(), 'signals')
ON CONFLICT (slug) DO NOTHING;
