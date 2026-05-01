const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Default: subarr.db in the server folder (or youtubarr.db if left over from the rename).
// SUBARR_DB_PATH overrides for Docker (e.g. mount /config and set SUBARR_DB_PATH=/config/subarr.db).
function resolveDbPath() {
  if (process.env.SUBARR_DB_PATH) {
    const p = path.resolve(process.env.SUBARR_DB_PATH);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    return p;
  }
  const legacy = path.join(__dirname, 'youtubarr.db');
  return fs.existsSync(legacy) ? legacy : path.join(__dirname, 'subarr.db');
}

const dbPath = resolveDbPath();

const db = new Database(dbPath);

// Migration: migrate old db schemas
// const existingColumns = db.prepare(`PRAGMA table_info(playlists);`).all();
// const columnNames = new Set(existingColumns.map(col => col.name));

// if (!columnNames.has('banner')) {
//   db.prepare(`ALTER TABLE playlists ADD COLUMN banner TEXT;`).run();
// }

// Initialization: create tables if they don't exist
db.exec(`
CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id TEXT NOT NULL UNIQUE,
  author_name TEXT,
  author_uri TEXT,
  title TEXT,
  check_interval_minutes INTEGER DEFAULT 60,
  regex_filter TEXT,
  last_checked TEXT,
  thumbnail TEXT,
  banner TEXT,
  source TEXT DEFAULT 'manual'
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT,
  published_at TEXT,
  thumbnail TEXT,
  UNIQUE (playlist_id, video_id)  -- Unique by both playlist_id & video_id (since the same video could exist on multiple playlists)
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  datetime TEXT NOT NULL,
  playlist_id TEXT,
  title TEXT,
  url TEXT,
  message TEXT,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS post_processors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  target TEXT NOT NULL,
  data TEXT NOT NULL
);
`);

module.exports = db;
