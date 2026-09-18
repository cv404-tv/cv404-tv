-- Keep internal user keys and existing sessions unchanged.
ALTER TABLE users ADD COLUMN public_id TEXT
  CHECK(public_id IS NULL OR (length(public_id) = 8 AND public_id NOT GLOB '*[^a-z0-9]*'));
CREATE UNIQUE INDEX users_public_id ON users(public_id);

-- Each existing account receives its own random ID. A collision aborts the
-- migration transaction safely; rerun the migration to sample new IDs.
UPDATE users SET public_id =
  substr('abcdefghijklmnopqrstuvwxyz0123456789', ((random() & 9223372036854775807) % 36) + 1, 1) ||
  substr('abcdefghijklmnopqrstuvwxyz0123456789', ((random() & 9223372036854775807) % 36) + 1, 1) ||
  substr('abcdefghijklmnopqrstuvwxyz0123456789', ((random() & 9223372036854775807) % 36) + 1, 1) ||
  substr('abcdefghijklmnopqrstuvwxyz0123456789', ((random() & 9223372036854775807) % 36) + 1, 1) ||
  substr('abcdefghijklmnopqrstuvwxyz0123456789', ((random() & 9223372036854775807) % 36) + 1, 1) ||
  substr('abcdefghijklmnopqrstuvwxyz0123456789', ((random() & 9223372036854775807) % 36) + 1, 1) ||
  substr('abcdefghijklmnopqrstuvwxyz0123456789', ((random() & 9223372036854775807) % 36) + 1, 1) ||
  substr('abcdefghijklmnopqrstuvwxyz0123456789', ((random() & 9223372036854775807) % 36) + 1, 1);

CREATE TRIGGER users_public_id_required
BEFORE INSERT ON users WHEN NEW.public_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'user ID is required');
END;

CREATE TRIGGER users_public_id_immutable
BEFORE UPDATE OF public_id ON users WHEN NEW.public_id IS NOT OLD.public_id
BEGIN
  SELECT RAISE(ABORT, 'user ID is immutable');
END;
