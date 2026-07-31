import Database from 'better-sqlite3';
import { seedIfEmpty } from './seed.js';

const DB_PATH = process.env.DB_PATH || './move.db';

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- A room in the new place. Holds the things you need to buy for it.
  CREATE TABLE IF NOT EXISTS rooms (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  -- Something to buy for a room. status: 'need' | 'bought'.
  CREATE TABLE IF NOT EXISTS items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id       INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'need',   -- need | bought
    est_price     REAL,                            -- ballpark, for the budget total
    actual_price  REAL,                            -- what it actually cost once bought
    notes         TEXT,
    sort_order    INTEGER DEFAULT 0,
    created_at    TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_items_room ON items(room_id);

  -- Move-logistics dates: lease start, U-Haul pickup, move day, etc.
  CREATE TABLE IF NOT EXISTS key_dates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    label       TEXT NOT NULL,
    date        TEXT,                              -- YYYY-MM-DD (nullable until known)
    notes       TEXT,
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  -- Packing timeline — what gets boxed when, relative to move day.
  CREATE TABLE IF NOT EXISTS packing (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    label       TEXT NOT NULL,
    timing      TEXT,                              -- free text, e.g. "2 weeks out"
    done        INTEGER DEFAULT 0,
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  -- Setup / handyman tasks — mount TV, assemble furniture, plus the tools needed.
  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    label       TEXT NOT NULL,
    tools       TEXT,                              -- comma-separated tools needed
    room_id     INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    done        INTEGER DEFAULT 0,
    notes       TEXT,
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  -- Simple key/value settings (e.g. the canonical move date for the countdown).
  CREATE TABLE IF NOT EXISTS settings (
    key    TEXT PRIMARY KEY,
    value  TEXT
  );
`);

seedIfEmpty(db);

// --- tiny settings helpers ------------------------------------------------
export const getSetting = (key) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? null;

export const setSetting = (key, value) =>
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
