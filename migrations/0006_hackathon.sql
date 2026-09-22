CREATE TABLE hackathon_applications (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL CHECK(event_id = 'jev-002'),
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 60),
  contact TEXT NOT NULL CHECK(length(contact) <= 100),
  role TEXT NOT NULL CHECK(role IN ('developer','designer','product','curious')),
  track TEXT NOT NULL CHECK(track IN ('router','agent','workflow','explore')),
  idea TEXT NOT NULL CHECK(length(idea) BETWEEN 10 AND 1000),
  consent_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT REFERENCES users(id),
  review_note TEXT NOT NULL DEFAULT '',
  UNIQUE(event_id, user_id)
);
CREATE INDEX hackathon_queue ON hackathon_applications(event_id, status, created_at DESC);
CREATE TRIGGER hackathon_review_audit AFTER UPDATE OF status ON hackathon_applications
WHEN OLD.status = 'pending' AND NEW.status IN ('approved','rejected')
BEGIN
  INSERT INTO admin_audit(id, actor_id, target_id, action, detail, created_at)
  VALUES(lower(hex(randomblob(16))), NEW.reviewed_by, NEW.user_id, 'hackathon_' || NEW.status, NEW.id, NEW.reviewed_at);
END;
