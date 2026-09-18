CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL DEFAULT '',
  email_verified_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'disabled'))
);

CREATE TABLE login_challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
  ready INTEGER NOT NULL DEFAULT 0,
  consumed_token TEXT
);
CREATE INDEX challenges_expiry ON login_challenges(expires_at);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);

-- A constraint failure rolls back every quota reservation in the D1 batch.
CREATE TABLE auth_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  maximum INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  CONSTRAINT auth_quota CHECK(count <= maximum)
);
CREATE INDEX auth_limits_expiry ON auth_limits(expires_at);
