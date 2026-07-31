// Dev: talk to the local backend. Prod (single-host deploy): same origin.
const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:4110');

// Access token for a deployed instance (backend APP_TOKEN). Entered once and kept
// in localStorage so it isn't baked into the public bundle.
export const getToken = () => localStorage.getItem('move_token') || '';
export const setToken = (t) => localStorage.setItem('move_token', t);

async function req(path, options = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    const err = new Error('unauthorized');
    err.code = 401;
    throw err;
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

const del = (path) => req(path, { method: 'DELETE' });
const post = (path, body) => req(path, { method: 'POST', body: JSON.stringify(body || {}) });
const patch = (path, body) => req(path, { method: 'PATCH', body: JSON.stringify(body || {}) });

export const api = {
  summary: () => req('/api/summary'),

  rooms: () => req('/api/rooms'),
  addRoom: (name) => post('/api/rooms', { name }),
  updateRoom: (id, p) => patch(`/api/rooms/${id}`, p),
  deleteRoom: (id) => del(`/api/rooms/${id}`),

  items: (roomId) => req(`/api/items?room_id=${roomId}`),
  allItems: () => req('/api/items'),
  addItem: (room_id, name, est_price) => post('/api/items', { room_id, name, est_price }),
  updateItem: (id, p) => patch(`/api/items/${id}`, p),
  deleteItem: (id) => del(`/api/items/${id}`),

  dates: () => req('/api/dates'),
  addDate: (label) => post('/api/dates', { label }),
  updateDate: (id, p) => patch(`/api/dates/${id}`, p),
  deleteDate: (id) => del(`/api/dates/${id}`),

  packing: () => req('/api/packing'),
  addPacking: (label, timing) => post('/api/packing', { label, timing }),
  updatePacking: (id, p) => patch(`/api/packing/${id}`, p),
  deletePacking: (id) => del(`/api/packing/${id}`),

  tasks: () => req('/api/tasks'),
  addTask: (label, tools) => post('/api/tasks', { label, tools }),
  updateTask: (id, p) => patch(`/api/tasks/${id}`, p),
  deleteTask: (id) => del(`/api/tasks/${id}`),

  settings: () => req('/api/settings'),
  setMoveDate: (move_date) => req('/api/settings', { method: 'PUT', body: JSON.stringify({ move_date }) }),
};

export const money = (n) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
