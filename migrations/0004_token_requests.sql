CREATE TABLE token_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL CHECK(length(project_name) BETWEEN 1 AND 80),
  purpose TEXT NOT NULL CHECK(length(purpose) BETWEEN 10 AND 2000),
  requested_tokens INTEGER NOT NULL CHECK(requested_tokens BETWEEN 1 AND 1000000000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT REFERENCES users(id),
  review_note TEXT NOT NULL DEFAULT '',
  granted_tokens INTEGER,
  credential TEXT,
  CHECK((status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL AND granted_tokens IS NULL AND credential IS NULL)
    OR (status = 'approved' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND granted_tokens BETWEEN 1 AND 1000000000)
    OR (status = 'rejected' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND granted_tokens IS NULL AND credential IS NULL))
);
-- One free grant per account. Rejected applicants can submit a revised application.
CREATE UNIQUE INDEX token_requests_open ON token_requests(user_id) WHERE status IN ('pending', 'approved');
CREATE INDEX token_requests_queue ON token_requests(status, created_at DESC, id);
CREATE INDEX token_requests_user ON token_requests(user_id, created_at DESC, id);
