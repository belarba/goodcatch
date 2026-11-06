CREATE TABLE IF NOT EXISTS plays (
  date TEXT NOT NULL,
  player TEXT NOT NULL,
  casts TEXT NOT NULL,
  n INTEGER NOT NULL,
  won INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  q INTEGER,
  streak INTEGER,
  PRIMARY KEY (date, player)
);

CREATE TABLE IF NOT EXISTS descida (
  date TEXT NOT NULL,
  player TEXT NOT NULL,
  depth INTEGER NOT NULL,
  score INTEGER NOT NULL,
  perfect INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  streak INTEGER,
  PRIMARY KEY (date, player)
);
