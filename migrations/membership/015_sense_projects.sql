-- Projects in Sense: a name, a description and a list of tasks. Matthew's own, alongside the feed.
CREATE TABLE IF NOT EXISTS sense_projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sense_project_tasks (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES sense_projects(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sense_project_tasks_project ON sense_project_tasks (project_id, created_at);
