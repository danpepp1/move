import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { db, getSetting, setSetting } from './db.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // behind Fly's proxy — needed for correct client IPs

// CORS: same-origin / non-browser requests (no Origin) plus an explicit allowlist.
const ALLOWED_ORIGINS = [
  'http://localhost:5191',
  'http://localhost:5173',
  process.env.PUBLIC_ORIGIN,
].filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    cb(null, !origin || ALLOWED_ORIGINS.includes(origin));
  },
}));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false }));

// Constant-time bearer-token check so the compare can't be timed.
function tokenOk(got, required) {
  const a = Buffer.from(got);
  const b = Buffer.from(required);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Optional bearer-token gate (set APP_TOKEN once deployed). Only /api is gated;
// the static frontend + /health stay public so the unlock screen can load.
app.use((req, res, next) => {
  const required = process.env.APP_TOKEN;
  if (!required || !req.path.startsWith('/api')) return next();
  const got = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!tokenOk(got, required)) return res.status(401).json({ error: 'unauthorized' });
  next();
});

const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ error: err?.message || 'internal error' });
  });

// Build a partial UPDATE from an allowlist of columns; returns { sets, params }.
function buildPatch(body, allowed) {
  const sets = [];
  const params = [];
  for (const f of allowed) {
    if (f in body) { sets.push(`${f} = ?`); params.push(body[f]); }
  }
  return { sets, params };
}

app.get('/health', (_req, res) => res.json({ ok: true }));

// --- Rooms ---------------------------------------------------------------
app.get('/api/rooms', wrap((_req, res) => {
  res.json({ rooms: db.prepare('SELECT * FROM rooms ORDER BY sort_order, id').all() });
}));

app.post('/api/rooms', wrap((req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM rooms').get().m;
  const info = db.prepare('INSERT INTO rooms (name, sort_order) VALUES (?, ?)').run(name.trim(), max + 1);
  res.json({ id: info.lastInsertRowid });
}));

app.patch('/api/rooms/:id', wrap((req, res) => {
  const { sets, params } = buildPatch(req.body, ['name', 'sort_order', 'width_ft', 'length_ft', 'origin_x', 'origin_y']);
  if (sets.length) db.prepare(`UPDATE rooms SET ${sets.join(', ')} WHERE id = ?`).run(...params, req.params.id);
  res.json({ ok: true });
}));

app.delete('/api/rooms/:id', wrap((req, res) => {
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

// --- Items ---------------------------------------------------------------
app.get('/api/items', wrap((req, res) => {
  const { room_id } = req.query;
  const rows = room_id
    ? db.prepare('SELECT * FROM items WHERE room_id = ? ORDER BY sort_order, id').all(room_id)
    : db.prepare('SELECT * FROM items ORDER BY room_id, sort_order, id').all();
  res.json({ items: rows });
}));

app.post('/api/items', wrap((req, res) => {
  const { room_id, name, est_price = null, status = 'need' } = req.body;
  if (!room_id) return res.status(400).json({ error: 'room_id required' });
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM items WHERE room_id = ?').get(room_id).m;
  const info = db.prepare(
    'INSERT INTO items (room_id, name, est_price, status, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(room_id, name.trim(), est_price, status, max + 1);
  res.json({ id: info.lastInsertRowid });
}));

app.patch('/api/items/:id', wrap((req, res) => {
  const { sets, params } = buildPatch(req.body, [
    'name', 'status', 'est_price', 'actual_price', 'notes', 'url', 'sort_order',
    'placed', 'pos_x', 'pos_y', 'foot_w', 'foot_l', 'height_ft', 'rotation',
  ]);
  if (sets.length) db.prepare(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`).run(...params, req.params.id);
  res.json({ ok: true });
}));

app.delete('/api/items/:id', wrap((req, res) => {
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

// --- Key dates -----------------------------------------------------------
app.get('/api/dates', wrap((_req, res) => {
  res.json({ dates: db.prepare('SELECT * FROM key_dates ORDER BY sort_order, id').all() });
}));

app.post('/api/dates', wrap((req, res) => {
  const { label, date = null, notes = null } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'label required' });
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM key_dates').get().m;
  const info = db.prepare(
    'INSERT INTO key_dates (label, date, notes, sort_order) VALUES (?, ?, ?, ?)'
  ).run(label.trim(), date, notes, max + 1);
  res.json({ id: info.lastInsertRowid });
}));

app.patch('/api/dates/:id', wrap((req, res) => {
  const { sets, params } = buildPatch(req.body, ['label', 'date', 'notes', 'sort_order']);
  if (sets.length) db.prepare(`UPDATE key_dates SET ${sets.join(', ')} WHERE id = ?`).run(...params, req.params.id);
  res.json({ ok: true });
}));

app.delete('/api/dates/:id', wrap((req, res) => {
  db.prepare('DELETE FROM key_dates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

// --- Packing timeline ----------------------------------------------------
app.get('/api/packing', wrap((_req, res) => {
  res.json({ packing: db.prepare('SELECT * FROM packing ORDER BY sort_order, id').all() });
}));

app.post('/api/packing', wrap((req, res) => {
  const { label, timing = null } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'label required' });
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM packing').get().m;
  const info = db.prepare('INSERT INTO packing (label, timing, sort_order) VALUES (?, ?, ?)').run(label.trim(), timing, max + 1);
  res.json({ id: info.lastInsertRowid });
}));

app.patch('/api/packing/:id', wrap((req, res) => {
  const { sets, params } = buildPatch(req.body, ['label', 'timing', 'done', 'sort_order']);
  if (sets.length) db.prepare(`UPDATE packing SET ${sets.join(', ')} WHERE id = ?`).run(...params, req.params.id);
  res.json({ ok: true });
}));

app.delete('/api/packing/:id', wrap((req, res) => {
  db.prepare('DELETE FROM packing WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

// --- Setup tasks ---------------------------------------------------------
app.get('/api/tasks', wrap((_req, res) => {
  res.json({ tasks: db.prepare('SELECT * FROM tasks ORDER BY sort_order, id').all() });
}));

app.post('/api/tasks', wrap((req, res) => {
  const { label, tools = null, room_id = null } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'label required' });
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM tasks').get().m;
  const info = db.prepare(
    'INSERT INTO tasks (label, tools, room_id, sort_order) VALUES (?, ?, ?, ?)'
  ).run(label.trim(), tools, room_id, max + 1);
  res.json({ id: info.lastInsertRowid });
}));

app.patch('/api/tasks/:id', wrap((req, res) => {
  const { sets, params } = buildPatch(req.body, ['label', 'tools', 'room_id', 'done', 'notes', 'sort_order']);
  if (sets.length) db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params, req.params.id);
  res.json({ ok: true });
}));

app.delete('/api/tasks/:id', wrap((req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

// --- Settings (move date drives the countdown) ---------------------------
app.get('/api/settings', wrap((_req, res) => {
  res.json({ move_date: getSetting('move_date') });
}));

app.put('/api/settings', wrap((req, res) => {
  if ('move_date' in req.body) setSetting('move_date', req.body.move_date || '');
  res.json({ move_date: getSetting('move_date') });
}));

// --- Summary (header numbers: budget + progress + countdown) -------------
app.get('/api/summary', wrap((_req, res) => {
  const perRoom = db.prepare(`
    SELECT r.id AS room_id, r.name AS room_name,
           COUNT(i.id) AS item_count,
           SUM(CASE WHEN i.status = 'bought' THEN 1 ELSE 0 END) AS bought_count,
           COALESCE(SUM(i.est_price), 0) AS est_total,
           COALESCE(SUM(CASE WHEN i.status = 'bought' THEN COALESCE(i.actual_price, i.est_price) ELSE 0 END), 0) AS spent_total,
           COALESCE(SUM(CASE WHEN i.status != 'bought' THEN COALESCE(i.est_price, 0) ELSE 0 END), 0) AS remaining_est
    FROM rooms r LEFT JOIN items i ON i.room_id = r.id
    GROUP BY r.id ORDER BY r.sort_order, r.id
  `).all();

  const totals = perRoom.reduce((a, r) => ({
    est_total: a.est_total + r.est_total,
    spent_total: a.spent_total + r.spent_total,
    remaining_est: a.remaining_est + r.remaining_est,
    item_count: a.item_count + r.item_count,
    bought_count: a.bought_count + r.bought_count,
  }), { est_total: 0, spent_total: 0, remaining_est: 0, item_count: 0, bought_count: 0 });

  const tasks = db.prepare("SELECT COUNT(*) AS n, SUM(done) AS done FROM tasks").get();
  const packing = db.prepare("SELECT COUNT(*) AS n, SUM(done) AS done FROM packing").get();

  const moveDate = getSetting('move_date') || null;
  let daysToMove = null;
  if (moveDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(moveDate + 'T00:00:00');
    daysToMove = Math.round((target - today) / 86400000);
  }

  res.json({
    move_date: moveDate,
    days_to_move: daysToMove,
    budget: totals,
    per_room: perRoom,
    tasks: { total: tasks.n, done: tasks.done || 0 },
    packing: { total: packing.n, done: packing.done || 0 },
  });
}));

// Single-host deploy: serve the built frontend + SPA fallback. In local dev this
// dist/ doesn't exist and the Vite dev server handles the UI instead.
const FRONTEND_DIST = join(__dirname, '../../frontend/dist');
if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(join(FRONTEND_DIST, 'index.html'));
  });
  console.log('serving frontend from', FRONTEND_DIST);
}

const PORT = process.env.PORT || 4110;
app.listen(PORT, () => console.log(`move backend on http://localhost:${PORT}`));
