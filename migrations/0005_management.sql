CREATE TABLE admin_audit (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES users(id),
  target_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX admin_audit_created ON admin_audit(created_at DESC, id);
CREATE TRIGGER token_review_audit AFTER UPDATE OF status ON token_requests
WHEN OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')
BEGIN
  INSERT INTO admin_audit (id, actor_id, target_id, action, detail, created_at)
  VALUES (lower(hex(randomblob(16))), NEW.reviewed_by, NEW.user_id,
    'token_' || NEW.status, NEW.id, NEW.reviewed_at);
END;

-- Preserve previous approvals in the activity log when upgrading an existing database.
INSERT INTO admin_audit (id, actor_id, target_id, action, detail, created_at)
SELECT lower(hex(randomblob(16))), reviewed_by, user_id, 'token_' || status, id, reviewed_at
FROM token_requests WHERE status IN ('approved', 'rejected');
