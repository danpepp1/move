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
    width_ft    REAL,                            -- floor-plan dimensions (Design tab)
    length_ft   REAL,
    origin_x    REAL,                            -- room position in the whole-apartment layout (feet)
    origin_y    REAL,
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
    url           TEXT,                          -- where you're buying it from
    sort_order    INTEGER DEFAULT 0,
    -- floor-plan placement (Design tab): footprint + position in feet
    placed        INTEGER DEFAULT 0,             -- 1 = shown on the floor plan
    pos_x         REAL,                          -- top-left corner, feet from room origin
    pos_y         REAL,
    foot_w        REAL,                          -- footprint width (x) in feet
    foot_l        REAL,                          -- footprint length (y) in feet
    height_ft     REAL,                          -- for the 3D box
    rotation      INTEGER DEFAULT 0,             -- 0/90/180/270
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

// --- Floor-plan columns: idempotent migration so DBs created before the
// Design feature (e.g. the deployed one) gain the new columns on next boot. ---
const hasCol = (table, name) =>
  db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === name);
const addCol = (table, name, ddl) => { if (!hasCol(table, name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`); };
addCol('rooms', 'width_ft', 'width_ft REAL');
addCol('rooms', 'length_ft', 'length_ft REAL');
addCol('rooms', 'origin_x', 'origin_x REAL');
addCol('rooms', 'origin_y', 'origin_y REAL');
addCol('items', 'url', 'url TEXT');
addCol('items', 'placed', 'placed INTEGER DEFAULT 0');
addCol('items', 'pos_x', 'pos_x REAL');
addCol('items', 'pos_y', 'pos_y REAL');
addCol('items', 'foot_w', 'foot_w REAL');
addCol('items', 'foot_l', 'foot_l REAL');
addCol('items', 'height_ft', 'height_ft REAL');
addCol('items', 'rotation', 'rotation INTEGER DEFAULT 0');

// --- tiny settings helpers ------------------------------------------------
export const getSetting = (key) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? null;

export const setSetting = (key, value) =>
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
