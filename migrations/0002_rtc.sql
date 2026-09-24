CREATE TABLE IF NOT EXISTS rtc_peers (
  room TEXT NOT NULL,
  peer_id TEXT NOT NULL,
  session_token_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  touched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room, peer_id)
);

CREATE TABLE IF NOT EXISTS rtc_signals (
  id BIGSERIAL PRIMARY KEY,
  room TEXT NOT NULL,
  from_peer TEXT NOT NULL,
  to_peer TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('offer', 'answer', 'ice')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rtc_peers_room_touched_idx ON rtc_peers (room, touched_at);
CREATE INDEX IF NOT EXISTS rtc_signals_room_target_id_idx ON rtc_signals (room, to_peer, id);
CREATE INDEX IF NOT EXISTS rtc_signals_created_idx ON rtc_signals (created_at);
