-- Private community identities never expose member_user or billing identifiers.
CREATE TABLE temple_profiles (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES member_user(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  alias TEXT NOT NULL CHECK (alias ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  persona TEXT NOT NULL DEFAULT '' CHECK (length(persona)<=1200),
  avatar_id UUID,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(alias)
);
CREATE TABLE temple_posts (
  id UUID PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES temple_profiles(id),
  body TEXT NOT NULL CHECK (length(body)<=12000),
  link TEXT,
  offering BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  moderation_reason TEXT,
  hidden_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX temple_feed_order ON temple_posts(created_at DESC,id DESC) WHERE deleted_at IS NULL;
CREATE TABLE temple_media (
  id UUID PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES temple_profiles(id),
  post_id UUID REFERENCES temple_posts(id),
  filename TEXT NOT NULL,
  mime TEXT NOT NULL CHECK (mime IN ('image/png','image/jpeg','image/webp')),
  alt TEXT NOT NULL CHECK (length(alt) BETWEEN 1 AND 500),
  bytes BYTEA NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 8388608),
  sha256 TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE temple_profiles ADD CONSTRAINT temple_avatar FOREIGN KEY(avatar_id) REFERENCES temple_media(id) ON DELETE SET NULL;
CREATE INDEX temple_media_author ON temple_media(author_id);
CREATE TABLE temple_comments (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES temple_posts(id),
  author_id UUID NOT NULL REFERENCES temple_profiles(id),
  body TEXT NOT NULL CHECK (length(body)<=4000),
  version INTEGER NOT NULL DEFAULT 1,
  moderation_reason TEXT,
  hidden_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX temple_comments_post ON temple_comments(post_id,created_at,id);
CREATE TABLE temple_reactions (
  post_id UUID NOT NULL REFERENCES temple_posts(id),
  author_id UUID NOT NULL REFERENCES temple_profiles(id),
  kind TEXT NOT NULL CHECK(kind IN ('spark','resonance','wonder')),
  PRIMARY KEY(post_id,author_id)
);
CREATE TABLE temple_moderators (user_id TEXT PRIMARY KEY REFERENCES member_user(id));
CREATE TABLE temple_reports (
  id UUID PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES temple_profiles(id),
  target_kind TEXT NOT NULL CHECK(target_kind IN ('post','comment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK(length(reason) BETWEEN 5 AND 1000),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reporter_id,target_kind,target_id)
);
CREATE TABLE temple_moderation_events (
  id UUID PRIMARY KEY,
  moderator_user_id TEXT NOT NULL REFERENCES member_user(id),
  target_kind TEXT NOT NULL,
  target_id UUID NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('hide','restore')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE temple_action_limits (
  user_id TEXT NOT NULL REFERENCES member_user(id),
  bucket TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(user_id,bucket)
);
