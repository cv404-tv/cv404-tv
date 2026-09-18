-- One current vote per account and stable model card, independent of share links.
CREATE TABLE tier_votes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score IN (-2, -1, 0, 1, 2)),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX tier_votes_card ON tier_votes(card_id);
